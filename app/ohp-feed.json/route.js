import {getOHP, slim} from '../../lib/ohp'

// The latest ONE HOUR PHOTO posts, written as a file at build time for the Studio's cover picker and sync.
export const dynamic = 'force-static'

export async function GET() {
  const features = await getOHP()
  return Response.json(features.map(slim))
}
