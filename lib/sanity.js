import {createClient, groq} from 'next-sanity'
import {projectId, dataset, apiVersion} from '../sanity/env'

export const client = createClient({projectId, dataset, apiVersion, useCdn: true})

const imageFields = `"url": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height, hotspot, alt, "tags": tags[]->_id`

export const siteQuery = groq`{
  "settings": *[_id == "siteSettings"][0]{
    bio, email, links,
    "portrait": portrait{"url": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height, alt}
  },
  "covers": *[_type == "ohpCover" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "") asc){feature, photo, name, hidden, pinned, coverUrl, postTitle, postInfo, postDate, frames, "image": image{${imageFields}}},
  "all": *[_type == "project" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "") asc, _createdAt desc){
    _id, title, info, year, link, "images": images[]{${imageFields}}
  },
  "categories": *[_type == "category" && !(_id in path("drafts.**"))] | order(coalesce(orderRank, "~") asc, title asc){_id, title}
}`

// Build a Sanity CDN URL cropped to 4:5 around the hotspot.
function sanityImg(img, w, crop = true) {
  if (!img?.url) return null
  const p = new URLSearchParams({w: String(w), auto: 'format', q: '80'})
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

export async function getSite() {
  let data = {settings: null, all: []}
  try {
    data = await client.fetch(siteQuery, {}, {next: {revalidate: 60}})
  } catch (e) {
    console.error('Sanity fetch failed', e)
  }
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
          thumb: `${i.url}?h=560&auto=format&q=80`,
          full: sanityImg(i, 1800, false),
          ratio: i.w && i.h ? +(i.w / i.h).toFixed(4) : 0.8,
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
      coverUrl: c.coverUrl || null,
      saved: c.postTitle && c.frames?.length ? {title: c.postTitle, info: c.postInfo || '', frames: c.frames} : null,
      image: c.image?.url ? {thumb: sanityImg(c.image, 900), full: sanityImg(c.image, 1800, false), alt: c.name || ''} : null,
    }))
  // Only offer tags that at least one published photo uses.
  const used = new Set(projects.flatMap((p) => p.frames.flatMap((f) => f.tags)))
  const categories = (data.categories || []).filter((c) => used.has(c._id)).map((c) => ({id: c._id, title: c.title}))
  return {
    covers,
    categories,
    bio: s.bio || null,
    portrait: s.portrait?.url
      ? {src: `${s.portrait.url}?w=900&auto=format&q=82`, w: s.portrait.w, h: s.portrait.h, alt: s.portrait.alt || 'Dev Bowman'}
      : null,
    email: s.email || null,
    links: s.links || [],
    projects,
  }
}
