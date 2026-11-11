export const metadata = {
  metadataBase: new URL('https://dev.pictures'),
  title: 'Dev Bowman',
  description: 'Dev Bowman is a photographer, writer, and editor in Brooklyn, and the creator of ONE HOUR PHOTO.',
  openGraph: {title: 'Dev Bowman', siteName: 'Dev Bowman', type: 'website', url: 'https://dev.pictures'},
}

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
