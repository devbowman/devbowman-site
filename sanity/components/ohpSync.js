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
      thumb: f.frames?.[0] || undefined,
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
    const want = {postTitle: f.title, thumb: f.frames?.[0] || null, postDate: f.date || null}
    const set = {}
    for (const [k, v] of Object.entries(want)) if (v && p[k] !== v) set[k] = v
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
  const res = await fetch('/api/ohp')
  if (!res.ok) return null
  const feed = await res.json()
  // If the feed comes back short or empty, do nothing rather than delete entries by mistake.
  if (!Array.isArray(feed) || feed.length < 5) return null
  const docs = await client.fetch(`*[_type == "ohpCover"]{_id, feature, pinned, postTitle, thumb, postDate, orderRank}`)
  const {creates, patches, deletes} = planSync(feed, docs)
  if (!creates.length && !patches.length && !deletes.length) return {creates: 0, patches: 0, deletes: 0}
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
  await tx.commit()
  return {creates: creates.length, patches: patches.length, deletes: deletes.length}
}
