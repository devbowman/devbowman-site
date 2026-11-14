import Site from '../../components/Site'
import {getSite} from '../../lib/sanity'
import {getOHP, buildOHP} from '../../lib/ohp'

export default async function Home() {
  const [site, feed] = await Promise.all([getSite(), getOHP()])
  // Never publish an empty site: if Sanity can't be reached, fail the build so the last good version stays up.
  if (!site.projects.length) throw new Error('No projects came back from Sanity; stopping the build.')
  return <Site site={site} ohp={await buildOHP(feed, site.covers)} />
}
