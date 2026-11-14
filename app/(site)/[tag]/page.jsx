import Site from '../../../components/Site'
import {getSite} from '../../../lib/sanity'
import {getOHP, buildOHP} from '../../../lib/ohp'

// dev.pictures/events, /bridal, … open Selects with that tag already on.
// One page per tag that's in use, made at each build; /all is always there (no filter).
export const dynamicParams = false

export async function generateStaticParams() {
  const site = await getSite()
  return [{tag: 'all'}, ...site.categories.map((c) => ({tag: c.slug}))]
}

export async function generateMetadata({params}) {
  const {tag} = await params
  const site = await getSite()
  const c = site.categories.find((x) => x.slug === tag)
  return c ? {title: `${c.title} · Dev Bowman`, alternates: {canonical: `/${tag}`}} : {}
}

export default async function TagPage({params}) {
  const {tag} = await params
  const [site, feed] = await Promise.all([getSite(), getOHP()])
  if (!site.projects.length) throw new Error('No projects came back from Sanity; stopping the build.')
  const c = site.categories.find((x) => x.slug === tag)
  return <Site site={site} ohp={await buildOHP(feed, site.covers)} initialFilter={c?.id || null} />
}
