import {createClient, groq} from 'next-sanity'
import {projectId, dataset, apiVersion} from '../sanity/env'

export const client = createClient({projectId, dataset, apiVersion, useCdn: false}) // fresh data at build time

const imageFields = `"url": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height, crop, hotspot, alt, "tags": tags[]->_id`

export const siteQuery = groq`{
  "settings": *[_id == "siteSettings"][0]{
    bio, email, links, ohpIntro,
    "portrait": portrait{"url": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height, crop, alt}
  },
  "covers": *[_type == "ohpCover" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "") asc){feature, photo, name, hidden, pinned, coverUrl, postTitle, postInfo, postDate, frames, "image": image{${imageFields}}},
  "all": *[_type == "project" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "") asc, _createdAt desc){
    _id, title, info, year, link, "images": images[]{${imageFields}}
  },
  "categories": *[_type == "category" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "~") asc, title asc){_id, title}
}`

// The crop drawn in the Studio, as pixel sizes. Sanity stores it as fractions trimmed off each side.
function cropped(img) {
  const c = img?.crop
  if (!c || !img.w || !img.h) return {w: img?.w, h: img?.h, rect: null}
  const x = Math.round(img.w * (c.left || 0))
  const y = Math.round(img.h * (c.top || 0))
  const w = Math.round(img.w * (1 - (c.left || 0) - (c.right || 0)))
  const h = Math.round(img.h * (1 - (c.top || 0) - (c.bottom || 0)))
  if (w <= 0 || h <= 0 || (w === img.w && h === img.h)) return {w: img.w, h: img.h, rect: null}
  return {w, h, rect: `${x},${y},${w},${h}`}
}

// A Sanity CDN link for an image, with its Studio crop applied first.
export function imgUrl(img, params) {
  const p = new URLSearchParams()
  const {rect} = cropped(img)
  if (rect) p.set('rect', rect)
  for (const [k, v] of Object.entries(params)) p.set(k, String(v))
  return `${img.url}?${p}`
}

// Build a Sanity CDN URL cropped to 4:5 around the hotspot.
function sanityImg(img, w, crop = true) {
  if (!img?.url) return null
  const p = new URLSearchParams({w: String(w), auto: 'format', q: '80'})
  const {rect} = cropped(img)
  if (rect) p.set('rect', rect)
  if (crop) {
    p.set('h', String(Math.round(w * 1.25)))
    p.set('fit', 'crop')
    if (img.hotspot) {
      p.set('crop', 'focalpoint')
      p.set('fp-x', String(img.hotspot.x))
      p.set('fp-y', String(img.hotspot.y))
    }
  }
  return `${img.url}?${p}`
}

// "Bridal" -> "bridal", "Events & Parties" -> "events-parties". Used for addresses like dev.pictures/bridal.
export const RESERVED = ['studio', 'api', 'all', 'ohp-feed.json', 'index', '404']
export function tagSlug(title = '') {
  const s = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return RESERVED.includes(s) ? `${s}-photos` : s
}

export async function getSite() {
  const data = await client.fetch(siteQuery)
  const s = data.settings || {}
  const projects = (data.all || [])
    .filter((p) => p.images?.length)
    .map((p) => ({
      key: p._id,
      title: p.title,
      short: p.title,
      info: [p.info, p.year].filter(Boolean).join(' · '),
      link: p.link || null,
      frames: p.images
        .filter((i) => i?.url)
        .map((i) => ({
          // Grid thumbnails keep the photo's own shape, sized for the row height.
          thumb: imgUrl(i, {h: 560, auto: 'format', q: 80}),
          full: sanityImg(i, 1800, false),
          ratio: cropped(i).w && cropped(i).h ? +(cropped(i).w / cropped(i).h).toFixed(4) : 0.8,
          alt: i.alt || p.title,
          tags: (i.tags || []).filter(Boolean),
        })),
    }))
  const covers = (data.covers || [])
    .filter((c) => c.feature)
    .map((c) => ({
      feature: c.feature,
      photo: c.photo || 1,
      name: c.name || null,
      hidden: !!c.hidden,
      pinned: !!c.pinned,
      postDate: c.postDate || null,
      coverUrl: c.coverUrl || null,
      saved: c.postTitle && c.frames?.length ? {title: c.postTitle, info: c.postInfo || '', frames: c.frames} : null,
      image: c.image?.url ? {thumb: sanityImg(c.image, 900), full: sanityImg(c.image, 1800, false), alt: c.name || ''} : null,
    }))
  // Only offer tags that at least one published photo uses.
  const used = new Set(projects.flatMap((p) => p.frames.flatMap((f) => f.tags)))
  const categories = (data.categories || [])
    .filter((c) => used.has(c._id))
    .map((c) => ({id: c._id, title: c.title, slug: tagSlug(c.title)}))
  return {
    covers,
    categories,
    bio: s.bio || null,
    ohpIntro: s.ohpIntro || null,
    portrait: s.portrait?.url
      ? {src: imgUrl(s.portrait, {w: 900, auto: 'format', q: 82}), w: cropped(s.portrait).w, h: cropped(s.portrait).h, alt: s.portrait.alt || 'Dev Bowman'}
      : null,
    email: s.email || null,
    links: s.links || [],
    projects,
  }
}
