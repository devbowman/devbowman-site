import {LexoRank} from 'lexorank'

export const norm = (u = '') =>
  u.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()

const slugOf = (link) => (String(link).match(/\/p\/([^/?#]+)/) || [])[1] || ''
const safeId = (slug) => 'ohp-' + slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)

/**
 * Work out the changes that keep "ONE HOUR PHOTO features" in step with the feed:
 * - every post in the latest 20 gets an entry (newest at the top)
 * - entries refresh their post title and thumbnail
 * - entries that left the feed are removed, unless pinned
 * Pure function so it can be tested without a Studio.
 */
export function planSync(feed, docs) {
  const byPub = new Map()
  for (const d of docs) {
    const id = d._id.replace(/^drafts\./, '')
    const e = byPub.get(id) || {id, published: null, draft: null}
    if (d._id.startsWith('drafts.')) e.draft = d
    else e.published = d
    byPub.set(id, e)
  }
  const entries = [...byPub.values()].map((e) => ({...e, doc: e.draft || e.published}))
  const byLink = new Map(entries.filter((e) => e.doc?.feature).map((e) => [norm(e.doc.feature), e]))
  const feedLinks = new Set(feed.map((f) => norm(f.link)))

  const creates = []
  const patches = []
  const deletes = []

  // New posts go above everything already in the list, newest first.
  const ranks = entries.map((e) => e.published?.orderRank).filter(Boolean).sort()
  let rank = ranks.length ? LexoRank.parse(ranks[0]) : LexoRank.middle()
  const missing = feed.filter((f) => !byLink.has(norm(f.link)) && slugOf(f.link))
  for (const f of [...missing].reverse()) {
    rank = rank.genPrev()
    creates.push({
      _id: safeId(slugOf(f.link)),
      _type: 'ohpCover',
      feature: f.link,
      postTitle: f.title,
      postDate: f.date || undefined,
      postInfo: f.info || undefined,
      thumb: f.frames?.[0] || undefined,
      frames: f.frames || [],
      pinned: false,
      hidden: false,
      photo: 1,
      orderRank: rank.toString(),
    })
  }

  for (const f of feed) {
    const e = byLink.get(norm(f.link))
    if (!e?.published) continue
    const p = e.published
    const want = {postTitle: f.title, thumb: f.frames?.[0] || null, postDate: f.date || null, postInfo: f.info || null, frames: f.frames?.length ? f.frames : null}
    const set = {}
    for (const [k, v] of Object.entries(want)) if (v && JSON.stringify(p[k]) !== JSON.stringify(v)) set[k] = v
    if (Object.keys(set).length) patches.push({id: e.id, set, draft: !!e.draft})
  }

  for (const e of entries) {
    const link = e.doc?.feature
    const pinned = !!(e.draft?.pinned || e.published?.pinned)
    if (pinned) continue
    if (!link || !feedLinks.has(norm(link))) deletes.push({id: e.id, draft: !!e.draft, published: !!e.published})
  }
  return {creates, patches, deletes}
}

export async function syncOhpFeatures(client) {
  const res = await fetch('/ohp-feed.json', {cache: 'no-store'})
  if (!res.ok) return null
  const feed = await res.json()
  // If the feed comes back short or empty, do nothing rather than delete entries by mistake.
  if (!Array.isArray(feed) || feed.length < 5) return null
  const docs = await client.fetch(`*[_type == "ohpCover"]{_id, feature, pinned, postTitle, postInfo, thumb, frames, postDate, orderRank}`)
  const {creates, patches, deletes} = planSync(feed, docs)
  const tx = client.transaction()
  creates.forEach((d) => tx.createIfNotExists(d))
  patches.forEach((p) => {
    tx.patch(p.id, (x) => x.set(p.set))
    if (p.draft) tx.patch(`drafts.${p.id}`, (x) => x.set(p.set))
  })
  deletes.forEach((d) => {
    if (d.published) tx.delete(d.id)
    if (d.draft) tx.delete(`drafts.${d.id}`)
  })
  // Pinned older posts need their photos saved so the site never has to look them up.
  const feedLinks = new Set(feed.map((f) => norm(f.link)))
  const missingPhotos = docs.filter((d) => !d._id.startsWith('drafts.') && d.pinned && d.feature && !feedLinks.has(norm(d.feature)) && !d.frames?.length)
  for (const d of missingPhotos) {
    const r = await fetch('/api/ohp-post?link=' + encodeURIComponent(d.feature))
    if (!r.ok) continue
    const post = await r.json()
    tx.patch(d._id, (x) => x.set({postTitle: post.title, postInfo: post.info || '', thumb: post.frames?.[0], frames: post.frames || [], ...(post.date ? {postDate: post.date} : {})}))
  }
  if (!creates.length && !patches.length && !deletes.length && !missingPhotos.length) return {creates: 0, patches: 0, deletes: 0}
  await tx.commit()
  return {creates: creates.length, patches: patches.length, deletes: deletes.length, backfilled: missingPhotos.length}
}
