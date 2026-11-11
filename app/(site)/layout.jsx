import './site.css'

export default function SiteLayout({children}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap"
      />
      {children}
    </>
  )
}
