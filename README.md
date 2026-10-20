# Unmapped Labs — website

An operations-research and problem-solving startup in India. The site uses a
"blueprint" design — deep navy, survey-yellow, grotesk + mono type — across
several pages: a home page with an interactive bottleneck simulator, services,
written industry cases with figures and sources, field notes, and a contact form.

Live: **https://www.unmappedlabs.in**

The earlier 3D "miniature city" version lives on the `3d-city` branch.

---

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm start          # serve the production build
```

Requires Node 20+.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components); every page is prerendered |
| Styling | Tailwind CSS v4, tokens and component classes in `src/app/globals.css` (`.paper` flips a section to light) |
| Type | Geist (headings, text) and Geist Mono (labels), via `next/font` |
| Figures | Plain SVG components and one canvas simulator, no chart library |
| Motion | `MotionRoot` (reveals, scroll progress `--p`, Lenis smooth wheel scroll), React `<ViewTransition>` page transitions; all off with reduced motion |
| Photos | Unsplash (via the official API, Unsplash License), hotlinked from Unsplash's CDN through `src/lib/image-loader.ts` and credited on every image (`src/content/photos.ts`). Cards show two photos that crossfade every 2 s. |
| Content | TypeScript content files + MDX field notes |
| Contact | Next route handler + Resend |
| Analytics | Vercel Analytics (with contact-funnel events) + Speed Insights |

## Pages

| Route | What it is |
|---|---|
| `/` | Blueprint hero, pinned photo gallery of sites, bottleneck simulator, pinned "how we work" story, sourced figures, work, insights, principles |
| `/services` | The on-site diagnostic, the four kinds of fix, how engagements run |
| `/work`, `/work/[slug]` | Our own projects |
| `/insights`, `/insights/[slug]` | Eight researched industry cases (agriculture, logistics, healthcare, industry) and field notes |
| `/notes/[slug]` | Field notes (`/notes` redirects to `/insights#notes`) |
| `/about`, `/contact`, `/privacy` | — |

## Project structure

```
src/
  app/                      routes, metadata files (icon, OG image, sitemap, robots, manifest)
    api/contact/route.ts    contact form endpoint
  config/site.ts            name, domain, email, socials, nav  ← edit here
  content/
    site-content.ts         page copy, services, approach, work, testimonials  ← edit here
    insights.ts             the industry cases and their figures  ← edit here
    photos.ts               photographs and their credits  ← replace with our own
    (site-content.ts)       `founder` (hidden until published), `pagePhotos`, `sites`
    notes/*.mdx             field notes (files starting with "_" never publish)
  components/
    layout/                 header, footer, click tracking
    home/                   hero drawing, site gallery, pinned story
    sim/                    the bottleneck simulator and its scenarios
    motion/                 MotionRoot, CountUp, Page (view transition)
    ui/                     headings, CTA band, photos, before/after chart
    cards/                  case and work cards
    contact/ContactForm.tsx
    notes/NoteCover.tsx     procedural contour cover
    brand/Logo.tsx
  lib/                      notes loader, contact validation, noise
```

## Editing content

- **Copy:** `src/content/site-content.ts`. Every section reads from it.
- **Brand, domain, email:** `src/config/site.ts`.
- **Social links:** add URLs to `socials` in `src/config/site.ts`. Empty entries
  are hidden everywhere (footer and structured data).
- **Industry cases (Insights):** `src/content/insights.ts`. Each case has the
  problem, how it's measured, the fix, a typical result, an illustrative
  before/after figure and sources. Add one and it gets a page and a sitemap entry.
- **Testimonials:** `testimonials` in `site-content.ts`. Only entries with
  `published: true` appear. Never publish a quote nobody actually gave.

### Publishing a Field Note

1. Copy `src/content/notes/_template.mdx` to `src/content/notes/<slug>.mdx`.
2. Fill in `export const meta = { title, date, category, summary, tags }`.
3. Write Markdown. Reading time and a unique contour cover are generated.
4. Commit and deploy. The note appears on the home page, in
   `/insights#notes`, at `/notes/<slug>`, and in the sitemap.

Only publish things that were actually observed, asked or learned.

## Contact form setup (Resend)

Until `RESEND_API_KEY` is set, the form says plainly that it isn't connected
and points people to the email address. It never pretends a message was sent.

1. Create an account at resend.com → **Domains → Add domain** → `unmappedlabs.in`.
2. Add the DNS records Resend shows (MX/TXT/DKIM) in **GoDaddy → DNS**. Wait
   for them to verify.
3. **API Keys → Create** (sending access only).
4. In Vercel → Project → Settings → Environment Variables, add:
   - `RESEND_API_KEY` = the key
   - `CONTACT_TO_EMAIL` = `contact@unmappedlabs.in`
   - `CONTACT_FROM_EMAIL` = `Unmapped Labs website <noreply@unmappedlabs.in>`
5. Redeploy. Send a test message.

See `.env.example`. Never commit real keys.

Spam protection: hidden honeypot field, minimum fill time (2.5s), per-IP rate
limit (5 per 10 minutes). The rate limit is in-memory per server instance, so
it's best effort. Move it to a shared store (e.g. Upstash) if abuse appears.

## Deploying (Vercel + GoDaddy)

1. Import the GitHub repo in Vercel (framework preset: Next.js, no overrides).
2. Add the environment variables above, plus `NEXT_PUBLIC_SITE_URL=https://unmappedlabs.in`.
3. Vercel → Project → Settings → Domains → add `unmappedlabs.in` and `www.unmappedlabs.in`.
4. In GoDaddy DNS, create exactly the records Vercel displays (normally an
   **A** record for `@` and a **CNAME** for `www`). Remove conflicting GoDaddy
   "parked" records.

## Accessibility

- Real HTML throughout; figures have text alternatives.
- Skip link, visible focus rings, the mobile menu traps focus, closes on
  Escape and returns focus.
- Colours meet WCAG AA contrast. With `prefers-reduced-motion`, nothing animates,
  pinned sections become plain lists/strips, and the simulator starts paused.
- axe-core (WCAG 2 A/AA + best practice): no violations on any page at 390px
  and 1440px; no horizontal overflow.

## Known limitations

- The contact rate limit is per-instance (see above).
- Social links are hidden until real URLs are added.
- Testimonials are hidden until real quotes are added.
- The founder section is hidden until `founder.published` is set in `site-content.ts`.
- The free call is booked on Cal.com (`site.bookingUrl` in `src/config/site.ts`).
- `three`, `@react-three/fiber` and `lenis` are still in `package.json` but
  unused; remove them with `npm uninstall` when convenient.
