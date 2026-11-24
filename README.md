# HØNTÉRX Store

Premium, minimal storefront for Høntérx hoodies, tees and caps. Plain HTML, CSS and JavaScript, with no build step.

## Pages
- `index.html` — the store: hero, product grid, product pages, cart, CAD/USD switch, loading screen
- `why.html` — "Why Høntérx": scroll-driven hoodie feature story

## Notes
Every image, video and animation frame is built into the two HTML files, so there are no other folders to upload.

## Run locally
Open `index.html` in a browser, or serve the folder:

    npx serve .

## Deploy
Static site, so it works as is on Vercel or GitHub Pages. `vercel.json` is included.

## Status
Checkout is not connected yet. Planned: Stripe Checkout (CAD/USD) and Printful fulfilment. Product descriptions and size charts are placeholders.

## Fonts
Inter, loaded from Google Fonts (SIL Open Font License).
