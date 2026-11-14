import {client} from '../lib/sanity'

const base = {
  metadataBase: new URL('https://dev.pictures'),
  title: 'Dev Bowman',
  description: 'Dev Bowman is a photographer, writer, and editor in Brooklyn, and the creator of ONE HOUR PHOTO.',
  openGraph: {title: 'Dev Bowman', siteName: 'Dev Bowman', type: 'website', url: 'https://dev.pictures'},
}

// The favicon comes from Site settings in the Studio; the pink dot is the fallback.
export async function generateMetadata() {
  let url = null
  try {
    url = await client.fetch(`*[_id == "siteSettings"][0].favicon.asset->url`, {}, {next: {revalidate: 60}})
  } catch {}
  const sized = (n) => `${url}?w=${n}&h=${n}&fit=crop&auto=format`
  return {
    ...base,
    icons: url
      ? {icon: [{url: sized(32), sizes: '32x32'}, {url: sized(192), sizes: '192x192'}], apple: sized(180)}
      : {icon: '/favicon.svg'},
  }
}

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
