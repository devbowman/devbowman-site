import {getOHP, getPost} from '../../../lib/ohp'

// Feed data for the Studio's cover picker (same origin, so no CORS trouble).
// ?post=<link> returns one older post instead.
export const revalidate = 3600

const slim = (f) => ({link: f.link, title: f.title, short: f.short, date: f.date, info: f.info, frames: f.frames.map((x) => x.thumb)})

export async function GET(request) {
  const post = new URL(request.url).searchParams.get('post')
  if (post) {
    const f = await getPost(post)
    return f ? Response.json(slim(f)) : Response.json({error: 'Post not found'}, {status: 404})
  }
  const features = await getOHP()
  return Response.json(features.map(slim))
}
