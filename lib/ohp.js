import {XMLParser} from 'fast-xml-parser'

const FEED = 'https://www.onehour.photo/feed'
const S3 = 'https://substack-post-media.s3.amazonaws.com/public/images/'

// Substack's image CDN resizes on the fly from the original S3 file.
function cdn(src, w) {
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

export async function getOHP() {
  try {
    const res = await fetch(FEED, {next: {revalidate: 3600}, headers: {'user-agent': 'dev.pictures'}})
    if (!res.ok) throw new Error(`Feed ${res.status}`)
    const xml = await res.text()
    const doc = new XMLParser({ignoreAttributes: false, cdataPropName: false}).parse(xml)
    const items = [].concat(doc?.rss?.channel?.item || [])
    return items
      .map((it, i) => {
        const title = decode(String(it.title || ''))
        const frames = portraits(String(it['content:encoded'] || '')).map((f) => ({
          thumb: cdn(f.src, 900),
          full: cdn(f.src, 1800),
          alt: f.alt || title,
        }))
        return {
          key: `ohp-${i}-${it.link}`,
          title,
          short: shortName(title),
          info: [decode(String(it.description || '')), it.pubDate ? new Date(it.pubDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '']
            .filter(Boolean)
            .join(' · '),
          link: String(it.link || ''),
          frames,
        }
      })
      .filter((p) => p.frames.length)
  } catch (e) {
    console.error('ONE HOUR PHOTO feed failed', e)
    return []
  }
}
