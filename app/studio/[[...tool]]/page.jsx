import {NextStudio} from 'next-sanity/studio'
import config from '../../../sanity.config'

export const dynamic = 'force-static'
export {metadata, viewport} from 'next-sanity/studio'

// One static page; deeper Studio links (/studio/…) are sent to it by public/_redirects.
export function generateStaticParams() {
  return [{tool: []}]
}

export default function StudioPage() {
  return <NextStudio config={config} />
}
