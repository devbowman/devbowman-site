import {getOHP} from '../../../lib/ohp'

// Feed data for the Studio's cover picker (same origin, so no CORS trouble).
export const revalidate = 3600

export async function GET() {
  const features = await getOHP()
  return Response.json(
    features.map((f) => ({link: f.link, title: f.title, short: f.short, frames: f.frames.map((x) => x.thumb)})),
  )
}
