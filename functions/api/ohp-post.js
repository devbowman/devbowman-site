import {getPost, slim} from '../../lib/ohp'

// Cloudflare Pages Function: /api/ohp-post?link=<post link>
// Looks up one older ONE HOUR PHOTO post for the Studio (Substack doesn't allow browsers to ask directly).
export async function onRequestGet({request}) {
  const link = new URL(request.url).searchParams.get('link') || ''
  if (!/onehour\.photo\/p\//i.test(link)) return Response.json({error: 'Not a ONE HOUR PHOTO post link'}, {status: 400})
  const f = await getPost(link)
  return f
    ? Response.json(slim(f), {headers: {'cache-control': 'public, max-age=3600'}})
    : Response.json({error: 'Post not found'}, {status: 404})
}
