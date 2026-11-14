import {XMLParser} from 'fast-xml-parser'

const FEED = 'https://www.onehour.photo/feed'
const S3 = 'https://substack-post-media.s3.amazonaws.com/public/images/'

// Substack's image CDN resizes on the fly from the original S3 file.
export function cdn(src, w) {
  return `https://substackcdn.com/image/fetch/w_${w},c_limit,f_auto,q_auto:good,fl_progressive:steep/${encodeURIComponent(src)}`
}

function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

// Pull every image Substack recorded in the post body, keep portrait (4:5-ish) frames.
function portraits(html = '') {
  const out = []
  const re = /data-attrs="([^"]+)"/g
  let m
  while ((m = re.exec(html))) {
    try {
      const a = JSON.parse(decode(m[1]))
      if (!a?.src || !a.src.startsWith(S3) || /\.gif$/i.test(a.src)) continue
      const dims = a.src.match(/_(\d+)x(\d+)\.\w+$/)
      const w = dims ? +dims[1] : a.width
      const h = dims ? +dims[2] : a.height
      if (!w || !h || h / w < 1.15) continue // skip landscape headers and squares
      if (!out.some((o) => o.src === a.src)) out.push({src: a.src, alt: a.alt || ''})
    } catch {}
  }
  return out
}

// "Wils Pelton... Another Day" -> "Wils Pelton"; falls back to the full title.
function shortName(title) {
  const t = title.replace(/[\u{1F300}-\u{1FAFF}☀-➿️]/gu, '').replace(/\s+/g, ' ').trim()
  const cut = t.split(/\.\.\.|\s(?:is|Is|Gets|Says|Has|Wrote|Pretends|Wants|for|Is Ready|Your)\s|:/)[0].trim()
  return cut.length >= 2 && cut.length < t.length ? cut : t
}

const norm = (u = '') =>
  u.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()

// A pasted image link: Substack images go through their resizing CDN, anything else is used as is.
function linkFrame(url, alt) {
  const m = decodeURIComponent(url).match(/https:\/\/substack-post-media\.s3\.amazonaws\.com\/public\/images\/[^\s?"&]+/)
  return m ? {thumb: cdn(m[0], 900), full: cdn(m[0], 1800), alt} : {thumb: url, full: url, alt}
}

// Apply the Studio's "ONE HOUR PHOTO covers": hide, rename, pick or upload the cover.
export function applyCovers(features, covers = []) {
  const byLink = new Map(covers.map((c) => [norm(c.feature), c]))
  return features
    .map((f) => {
      const c = byLink.get(norm(f.link))
      if (!c) return f
      if (c.hidden) return null
      let frames = f.frames
      if (c.image) frames = [{...c.image, alt: c.image.alt || f.title}, ...frames]
      else if (c.coverUrl) frames = [linkFrame(c.coverUrl, f.title), ...frames]
      else if (c.photo > 1 && c.photo <= frames.length)
        frames = [frames[c.photo - 1], ...frames.filter((_, i) => i !== c.photo - 1)]
      return {...f, short: c.name || f.short, frames}
    })
    .filter(Boolean)
}

function toFeature({title, subtitle, link, date, html}, key) {
  const t = decode(String(title || ''))
  return {
    key,
    title: t,
    short: shortName(t),
    info: [decode(String(subtitle || '')), date ? new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '']
      .filter(Boolean)
      .join(' · '),
    link: String(link || ''),
    date: date ? new Date(date).toISOString() : null,
    frames: portraits(String(html || '')).map((f) => ({thumb: cdn(f.src, 900), full: cdn(f.src, 1800), alt: f.alt || t})),
  }
}

// The small shape the Studio needs: titles, dates and thumbnail links.
export const slim = (f) => ({link: f.link, title: f.title, short: f.short, date: f.date, info: f.info, frames: f.frames.map((x) => x.thumb)})

// One post by its link, for pinned features that are older than the feed's latest 20.
export async function getPost(link) {
  const slug = (String(link).match(/\/p\/([^/?#]+)/) || [])[1]
  if (!slug) return null
  try {
    const res = await fetch(`https://www.onehour.photo/api/v1/posts/${encodeURIComponent(slug)}`, {
      headers: {'user-agent': 'dev.pictures'},
    })
    if (!res.ok) throw new Error(`Post ${res.status}`)
    const p = await res.json()
    const f = toFeature(
      {title: p.title, subtitle: p.subtitle, link: p.canonical_url || link, date: p.post_date, html: p.body_html},
      `ohp-post-${slug}`,
    )
    return f.frames.length ? f : null
  } catch (e) {
    console.error('ONE HOUR PHOTO post failed', slug, e)
    return null
  }
}

// A pinned older post, from the title and photos saved in the Studio.
function fromSaved(c) {
  const s = c.saved
  if (!s) return null
  const full = (u) => u.replace(/\/w_\d+,/, '/w_1800,')
  return {
    key: `ohp-saved-${norm(c.feature)}`,
    title: s.title,
    short: shortName(s.title),
    info: s.info,
    link: c.feature,
    date: c.postDate || null,
    frames: s.frames.map((u) => ({thumb: u, full: full(u), alt: s.title})),
  }
}

// Pinned features first (up to 5, in the Studio's order), then the rest of the feed.
export async function buildOHP(feed, covers = []) {
  // Substack unreachable during a build: use the post titles and photos the Studio keeps in step with the feed.
  if (!feed.length) {
    feed = covers
      .map(fromSaved)
      .filter(Boolean)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }
  const pins = covers.filter((c) => c.pinned && !c.hidden).slice(0, 5)
  const pinned = (
    await Promise.all(
      pins.map(async (c) => feed.find((f) => norm(f.link) === norm(c.feature)) || fromSaved(c) || getPost(c.feature)),
    )
  )
    .filter(Boolean)
    .map((f) => ({...f, pinned: true}))
  const pinnedLinks = new Set(pinned.map((f) => norm(f.link)))
  const rest = feed.filter((f) => !pinnedLinks.has(norm(f.link)))
  return applyCovers([...pinned, ...rest], covers)
}

export async function getOHP() {
  try {
    const res = await fetch(FEED, {headers: {'user-agent': 'dev.pictures'}})
    if (!res.ok) throw new Error(`Feed ${res.status}`)
    const xml = await res.text()
    const doc = new XMLParser({ignoreAttributes: false, cdataPropName: false}).parse(xml)
    const items = [].concat(doc?.rss?.channel?.item || [])
    return items
      .map((it, i) =>
        toFeature(
          {title: it.title, subtitle: it.description, link: it.link, date: it.pubDate, html: it['content:encoded']},
          `ohp-${i}-${it.link}`,
        ),
      )
      .filter((p) => p.frames.length)
  } catch (e) {
    console.error('ONE HOUR PHOTO feed failed', e)
    return []
  }
}
