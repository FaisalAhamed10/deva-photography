# DEVA Photography — Website

A premium, animated photography portfolio for **DEVA Photography** (Wedding · Fashion · Portraits · Baby Shoot).
Plain HTML/CSS/JavaScript (no framework). Animations use **GSAP 3 + ScrollTrigger**, smooth scrolling uses **Lenis**, icons are **Lucide** glyphs inlined.
Hosted on **Netlify**, deployed automatically from the `main` branch on GitHub.

| | |
|---|---|
| Framework | None — static multi-page site |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 20 (set in `netlify.toml`) |
| Environment variables | None required. Optional `SITE_URL` (see below) |

## Run it locally

Requires [Node.js](https://nodejs.org) 18+ (only for the local server and the photo tool).

```powershell
npm install        # installs sharp (only used by the add-photos tool)
npm run dev        # source folder   → http://localhost:5173
npm run preview    # production build → http://localhost:5174
```

You can also open `index.html` directly in a browser — everything works from `file://` too.

## Project structure

```
index.html            Home: preloader, hero, about, services, gallery, booking CTA, contact
privacy.html          Privacy Policy (contains [placeholders] to complete)
terms.html            Terms & Conditions (contains [placeholders] to complete)
404.html              Not-found page
assets/
  css/main.css        All styles (tokens, layout, components, responsive, reduced-motion)
  js/config.js        Contact details, WhatsApp number, social links  ← edit here
  js/utils.js         Shared helpers (picture markup, scroll lock, focus trap)
  js/icons.js         Inline Lucide icons
  js/preloader.js     Animated logo intro (once per visit) + page transitions
  js/nav.js           Lenis smooth scroll, header states, mobile menu, back-to-top
  js/hero.js          Hero slider (triptych on desktop, single image on mobile)
  js/gallery.js       Filterable gallery + footer "Latest Photos"
  js/lightbox.js      Full-screen viewer (keyboard, swipe, focus management)
  js/forms.js         Booking popup + contact form → validation → WhatsApp
  js/animations.js    Scroll reveals, parallax, magnetic buttons, footer reveal
  js/main.js          Boot sequence
  data/gallery.js     ★ The photo library — single source of truth
  images/gallery/     Optimised photos (AVIF + WebP at 480/960/1440 px)
  images/og/          Social-share image (1200×630)
  logo/               Logo as vector SVG (traced from the original), PNG, favicons
scripts/
  build.mjs           Production build → dist/ (copies public files, sets site URL, verifies assets)
  serve.mjs           Zero-dependency local server
  add-photos.mjs      Adds new photos to the gallery (see below)
uploads/              Drop new photos here (by category)
source-images/        Original Instagram downloads — local only, git-ignored
netlify.toml          Netlify build settings, security & cache headers
robots.txt, sitemap.xml, site.webmanifest
```

## Photos: gallery + "Latest Photos" stay in sync automatically

The gallery, the footer **Latest Photos** grid (9 newest) and the lightbox all read
`assets/data/gallery.js`. Add a photo once and every section updates.

**Add new photos**

1. Copy originals into the right folder: `uploads/wedding`, `uploads/fashion`, `uploads/portraits` or `uploads/baby`.
2. Run:
   ```powershell
   npm run add-photos
   ```
   Each photo is resized (AVIF + WebP, 3 sizes), added to `gallery.js` with today's date,
   and moved to `uploads/_done/`. The newest 9 automatically appear in the footer.
3. Open `assets/data/gallery.js` and improve the new entry's `title` and `alt` (describe the photo for accessibility and SEO).
4. Re-deploy.

A photo can belong to several categories: `"categories": ["wedding", "fashion"]`.

> **Instagram sync:** this site does not pretend to auto-import from Instagram. For real
> automatic syncing you'd need the official Instagram API (a Meta app + access token) or a
> CMS such as Decap CMS / Sanity writing to `gallery.js`. The `add-photos` tool is the
> simple, reliable path.

### About the current photos

All 13 photos are DEVA Photography's own work, taken from the public posts on
[@deva__photograph_y](https://www.instagram.com/deva__photograph_y/) (the `source` field
records each post). Notes:

- Only ~1440px versions are publicly available. **Please supply original high-resolution files** — the hero and lightbox will look noticeably sharper on large and retina screens.
- The public posts had **no dedicated fashion shoot**, so the "Fashion" filter and service card currently use two styled bridal portraits (`bridal-blue-silk`, `white-veshti`). Replace them with real fashion work when available.
- Instagram designs that were collages or had large text overlays were left out. Two images were cropped to remove post text/collage borders; faces were never altered.
- Hero, About, Services, CTA and booking-popup images are chosen in the HTML (search for `assets/images/gallery/` in `index.html`).

## Booking & contact → WhatsApp

Both forms validate (required fields, Indian/international phone numbers, optional email),
then open `https://wa.me/919943677235?text=…` with a pre-filled, URL-encoded message.
**Nothing is sent automatically** — the visitor reviews the message and presses Send in WhatsApp.
Any button with `data-book` opens the popup; `data-book="Baby Shoot"` pre-selects the event.
A link to `index.html#book` opens the popup on load (handy for an Instagram bio link).

Change numbers/emails in `assets/js/config.js` **and** the visible text in the HTML files.

## Build & deploy

`npm run build` creates `dist/` containing only the public site (HTML, `assets/`, robots, sitemap, manifest).
It also:

- replaces the `https://YOUR-DOMAIN.com` placeholder in canonical/Open Graph tags, `sitemap.xml` and `robots.txt`
  with the live URL — `SITE_URL` if set, otherwise Netlify's built-in `URL` variable;
- refreshes the sitemap `lastmod` dates;
- **fails the build** if any image, script, stylesheet or gallery photo referenced by the site is missing.

### Netlify (continuous deployment)

Already configured in `netlify.toml` — every push to `main` redeploys the site.

1. Netlify → **Add new site → Import an existing project → GitHub** → pick this repository.
2. Build settings are read from `netlify.toml` (build `npm run build`, publish `dist`). Click **Deploy**.
3. Optional: **Site configuration → Environment variables → `SITE_URL`** = your custom domain
   (e.g. `https://devephotography.in`) once it's connected, then redeploy.
4. Optional custom domain: **Domain management → Add a domain**, then follow Netlify's DNS steps.

No API keys or secrets are used anywhere in this project. The contact and booking forms open WhatsApp
on the visitor's device — there is no server-side form handling.

### Updating the site

```powershell
npm run add-photos            # optional: process new photos from uploads/
npm run build                 # optional: check locally that the build passes
git add -A
git commit -m "Describe the change"
git push                      # Netlify redeploys automatically
```

## Before going live — checklist

- [ ] Complete every `[placeholder]` in `privacy.html` and `terms.html` (payments, cancellation, delivery timelines…) with the business owner.
- [ ] Add photographer name / experience / location to the About section if desired (see the `EDIT:` comment).
- [ ] Add Facebook / YouTube links only if official profiles exist (`EDIT:` comment in the footer, plus `config.js`).
- [ ] Swap in high-resolution originals and real fashion photographs.
- [ ] When a custom domain is connected, set `SITE_URL` in Netlify.

## Accessibility & performance notes

- Respects `prefers-reduced-motion` (no Ken Burns, parallax, smooth scroll or travel animations).
- Smooth scrolling and parallax switch off on low-powered touch devices.
- Keyboard: skip link, focus-trapped menu/modal/lightbox, Esc to close, arrow keys in the lightbox.
- Images: AVIF/WebP with responsive `srcset`, lazy-loaded below the fold, only the first hero image is preloaded.
- The preloader runs once per browser session and never blocks the site for more than ~4s, even on slow connections.
