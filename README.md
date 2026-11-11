# dev.pictures

Dev Bowman's portfolio. Next.js site with an embedded Sanity Studio.

## Sections

- **Dev Bowman**: bio, contact and links. Edit in the Studio under *Site settings*.
- **Index**: projects from the Studio. Order them with *Site settings → Index order*.
- **ONE HOUR PHOTO**: pulled automatically from https://www.onehour.photo/feed (the 20 newest posts, portrait images only), refreshed hourly. Nothing to update by hand.

## Adding work

Go to `https://dev.pictures/studio`, sign in with the Sanity account, create a Project, drag images in, publish. The site picks it up within about a minute.

## Running locally

```
npm install
npm run dev
```

Then open http://localhost:3000 (and http://localhost:3000/studio).

## Config

- Sanity project `tf3i75mr`, dataset `production` (see `sanity/env.js`).
- Colors and fonts: the top of `app/(site)/site.css`.
- Feed parsing: `lib/ohp.js`.
