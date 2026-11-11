import Site from '../../components/Site'
import {getSite} from '../../lib/sanity'
import {getOHP} from '../../lib/ohp'

// Rebuild at most once a minute; the Substack feed itself is cached for an hour.
export const revalidate = 60

export default async function Home() {
  const [site, ohp] = await Promise.all([getSite(), getOHP()])
  return <Site site={site} ohp={ohp} />
}
