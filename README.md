# Unmapped Labs — website

*Mapping the unknown.* The official site for Unmapped Labs: a single cinematic
scroll through a procedural 3D terrain that goes from unknown, to mapped, to
connected. Field Notes get their own routes.

Live domain (once deployed): **https://unmappedlabs.in**

---

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm start          # serve the production build
npm run lint
npx tsx scripts/generate-terrain-svg.ts   # regenerate the static fallback map
```

Requires Node 20+.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Cache Components) | Static prerendering for every page; one API route |
| 3D | three.js + React Three Fiber, custom GLSL | One art-directed scene, no generic helpers |
| Smooth scroll | Lenis | Inertial wheel scrolling; native on touch |
| Scroll-linked motion | `src/components/motion/scroll-engine.ts` (in-house, ~150 lines) | Replaced GSAP: the site only needs scrubbed progress values |
| UI motion | CSS transitions/keyframes | Replaced Motion; menu and form swaps don't need a library |
| Styling | Tailwind CSS v4, tokens in `src/app/globals.css` `@theme` | Single source for colour, type, motion and layout |
| Content | MDX (`@next/mdx`) for Field Notes | Write a file → get a page |
| Contact | Next route handler + Resend | Real delivery, honest failure states |
| Analytics | Vercel Analytics + Speed Insights | Privacy-friendly; real-user Core Web Vitals |

GSAP, Motion, drei and Zod were tried and then removed to cut initial
JavaScript (mobile Lighthouse performance went from 61 to 96).

## Project structure

```
src/
  app/                      routes, metadata files (icon, OG image, sitemap, robots, manifest)
    api/contact/route.ts    contact form endpoint
    notes/                  Field Notes index + [slug] article pages
  config/site.ts            name, tagline, domain, email, socials, nav  ← edit here
  content/
    site-content.ts         all page copy, process stages, focus areas  ← edit here
    notes/*.mdx             Field Notes (files starting with "_" never publish)
  components/
    three/                  the 3D world (see "The world" below)
    sections/               one component per page section
    layout/                 header (adaptive light/dark), footer
    motion/                 Lenis, scroll engine, reveals, intro, cursor
    notes/                  note card, procedural cover, empty state
    brand/Logo.tsx          mark + wordmark
  lib/                      notes loader, contact validation, contour generator
scripts/generate-terrain-svg.ts
public/terrain-fallback.svg generated top-down contour map of the same terrain
```

## The world (3D)

- **One persistent scene** sits fixed behind the page (`WorldLayer` → `World` → `Scene`).
  It loads lazily, after first paint and when the browser is idle. Headline, copy
  and CTAs never wait for it.
- **Terrain** is a deterministic noise function (`terrain-math.ts`) shared by the
  mesh, nodes, paths and the SVG fallback, so they all agree.
- **Shader** (`shaders.ts`) draws contour lines from screen-space derivatives
  (sharp at any distance). It splits territory into *unknown* (faint) and
  *known* (bright, gridded). The known region grows as you scroll and follows
  the mouse like an explorer's light.
- **Camera journey:** each section with `data-chapter="0…5"` anchors a camera
  keyframe (`landmarks.ts`). Scroll position interpolates between them, and the
  camera damps toward the result. Scroll is never hijacked.
- **Discovery paths** draw in over chapter ranges; **survey nodes** light up as
  paths reach them, and show a label on hover (or tap on touch).
- **Performance:** two quality tiers (touch, small screen or ≤4 cores/4GB → low:
  fewer vertices, no particles, lower DPR); adaptive DPR from measured FPS; the
  render loop stops completely while a light editorial section covers the
  screen; layers mount over several frames.
- **Fallback:** reduced motion, Save-Data or no WebGL → the static contour map
  (`public/terrain-fallback.svg`). The same image shows while WebGL starts.

If you change `terrain-math.ts` or `landmarks.ts`, rerun the SVG generator.

## Editing content

- **Copy:** `src/content/site-content.ts`. Every section reads from it.
- **Brand, domain, email:** `src/config/site.ts`.
- **Social links:** add URLs to `socials` in `src/config/site.ts`. Empty entries
  are hidden everywhere (footer and structured data).
- **New focus area:** add an entry to `focus.areas`, and a glyph in
  `src/components/ui/FocusGlyph.tsx`, keyed by `id`.

### Publishing a Field Note

1. Copy `src/content/notes/_template.mdx` to `src/content/notes/<slug>.mdx`.
2. Fill in `export const meta = { title, date, category, summary, tags }`.
3. Write Markdown. Reading time and a unique contour cover are generated.
4. Commit and deploy. The note appears on the home page, at `/notes`, at
   `/notes/<slug>`, and in the sitemap.

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

## Accessibility & motion

- All content is real HTML. The canvas is decorative (`aria-hidden`).
- Skip link; visible focus rings on both surfaces; keyboard-reachable process
  map; the mobile menu traps focus, closes on Escape and returns focus.
- `prefers-reduced-motion`: no WebGL, no intro, no smooth scroll, no scrubbed
  animations. Everything is shown complete.
- The intro shows once per browser, only on the home page, can be skipped
  (button, Escape, click), and dismisses itself with CSS even if JavaScript fails.

## Testing done (and results)

Run locally against the production build (`next build && next start`):

- `tsc --noEmit`: pass. `eslint`: 0 findings. `next build`: pass; all pages
  static except `/api/contact`.
- Browser suite (Playwright, 30 checks): **30/30 pass**. Covers mobile menu
  (open, focus, trap, Escape, link navigation), skip link, hero CTA scroll and
  focus, form validation and focus on first error, honest no-key failure, kept
  input after errors, API honeypot / timing / validation / 503, 404 page,
  drafts not public, `/notes` empty state, sitemap/robots/OG/icons/manifest,
  reduced-motion fallback, first visit vs. return visit intro.
- No horizontal overflow at 390px and 1440px across all sections.
- Lighthouse 12 (local, simulated throttling):
  mobile **96 / 100 / 96 / 100** (Perf / A11y / BP / SEO), LCP 2.4s, CLS 0, TBT 130ms;
  desktop **99 / 100 / 96 / 100**, LCP 0.6s, CLS 0, TBT 20ms.
  The Best Practices deduction is Vercel Analytics' script 404ing locally; it
  only exists on Vercel.

## Known limitations

- Headless test browsers render WebGL in software, so 3D frame-rate and
  start-up cost on real phones haven't been measured. After launch, check
  Vercel Speed Insights for real-user LCP, INP and CLS.
- Category filter and search on `/notes` are deliberately absent until there
  are enough notes to need them.
- The contact rate limit is per-instance (see above).
- Social links are hidden until real URLs are added.
