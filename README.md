# Unmapped Labs — website

*Mapping the unknown.* The official site for Unmapped Labs: a single cinematic
scroll that starts on the hills above a miniature city, dives into it, plays
out how we work in its blocks and districts, and leaves over the hills on the
far side. Field Notes get their own routes.

Live domain (once deployed): **https://unmappedlabs.in**

---

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm start          # serve the production build
npm run lint
npx tsx scripts/generate-city-svg.ts      # regenerate the static fallback map
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
| Post-processing | three.js `EffectComposer` + `UnrealBloomPass` (high tier only) | Glow on paths, nodes and particles |

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

## The world (3D): a colourful miniature city at golden hour

The background is one persistent, living toy city (`src/components/three/`).
Visitors read it as *we study real systems, find the bottleneck, and pick the
fix the problem actually needs*.

- **Models** (`public/models/city.glb`, ~1.7 MB): Kenney's CC0 city, car and
  nature kits, built by `npx tsx scripts/build-models.mts <unzipped kits>`.
  The script bakes each kit's palette texture into vertex colours, merges
  parts, welds, quantises and meshopt-compresses, and writes model sizes to
  `models.generated.ts`. Credits: `public/models/CREDITS.txt`. Pieces the kits
  lack (pylons, cranes, ships, train, helicopter, exchange, people, birds) are
  built in `procedural.ts`. Every model shares one material, so the city draws
  in a handful of `BatchedMesh` calls (`models.ts`).
- **Layout** (`city-layout.ts`, pure data): a core street grid with perimeter
  blocks and courtyards, suburbs along lanes and a ring road, farmland and a
  railway to the west, the coast and harbour to the east, and a downtown of
  slim towers whose letters spell **UNMAPPED LABS**. The 3D scene, the
  journey and the fallback map all build from it.
- **Look** (`Environment.tsx`, `ground-paint.ts`): a low warm sun with soft
  shadows that follow the camera, a peach-to-blue sky, haze that scales with
  the shot, an animated sea, a painted ground and shader road markings.
- **Hills** (`hill-terrain.ts`, `Hills.tsx`): two faceted ranges with pine
  woods, villages and their fields, clouds and birds, north and south of the
  city. A river runs down the northern valley, across the city's edge and
  out to sea; a road with traffic climbs beside it. The journey starts on
  the northern ridge (chapter −1), dives low along the river into the city
  (`DIVE_KEYS` in `landmarks.ts`), and ends over the southern hills
  (chapter 17, the `Epilogue` section).
- **Time of day** (`time-of-day.ts`): morning on the first hills, day in the
  city, golden hour near the end, sunset over the far hills. Sun, sky, haze
  and fill light blend by chapter.
- **Interaction** (`Interaction.tsx`, mouse only): drag to look around while
  a story or the process holds the camera (it eases back); hover a district
  while the camera roams and click to jump to its story.
- **Sound** (`motion/Sound.tsx`): off by default; a toggle under the header.
  All generated with Web Audio (wind and birds on the hills, a city hum,
  a tick on each step). The choice is remembered.
- **Pinned stories** (`story.ts`, `sections/StoryStop.tsx`): each district and
  each project pins while the camera holds on it, and scrolling plays its
  story in four beats (Problem → Diagnose → Fix → Result). The card
  introduces the stop, then slides away and leaves a step bar that narrates
  the current beat. Copy for the beats and in-scene callouts lives in
  `site-content.ts` (`beats`, `scene`).
- **Large sites and real cases** (`districts/`, `cases.ts`, `Districts.tsx`):
  a commercial farm, a container yard, a hospital campus and an industrial
  plant, each a rectangle of land between a side avenue and the ring road
  (`DISTRICTS` in `city-layout.ts`, details in `districts/layout.ts`). Each
  case is its own pinned story, worked the way the work is really done: our
  team (teal shirts) on site with real instruments — tally counters, a
  pressure gauge and catch cans, a clamp meter, an ultrasonic leak detector,
  a power logger — then a chart built from what they logged, the fix the
  problem actually needs, and the result. Cases: harvest waiting in the heat,
  uneven drip irrigation, inefficient pump sets (farm); boxes buried in the
  yard (logistics); late discharges, the 9 am outpatient crush (hospital);
  compressed-air leaks, a demand charge set by the 6 am start (plant).
  Problems, methods and "typical" figures come from the sources listed on
  each case in `site-content.ts`; the settings are illustrative, not client
  work. A fork of **Software / Hardware / Process / Data & AI** rises over
  each problem and the right one is chosen. To add a case: its copy in
  `focus.areas[].cases`, its id in `STORY_ORDER` (`chapters.ts`), its focus
  and camera in `cases.ts`, its animation in the site's `districts/*.tsx`.
- **Projects** (`Projects.tsx`): FlowMatch (catalogue pages → operating points
  → flow and depth → one match) and Deal Lens (raw slips → labelled lanes →
  round trips fall away → a timeline since 2005), using only the projects'
  real figures.
- **Callouts** (`callouts.ts`): short labels pinned to points in the scene,
  laid out once per frame into a small DOM pool.
- **Life** (`Life.tsx`): traffic that keeps left and stops at signals, trucks
  queueing at the logistics gate, patients at the hospital, a tractor, an
  ambulance, a helicopter, a train, boats, birds, people and chimney smoke.
- **Process** (`ProcessBlock.tsx`): one evening jam at one junction, worked
  the way it's really done, filmed in one steady orbit (`processCamera`) with
  a shockwave "hit" as each step starts: Unknown (the queue backs up; people
  have theories) → Observe (tally counters, a stopwatch on the signal, a
  camera on a tripod) → Map (a hand-drawn turning-movement sketch; flows on
  the road) → Understand (the main road gets a quarter of the green for three
  quarters of the traffic; autos stop on the corner) → Build (a new timing
  plan loaded at the controller cabinet; the auto stand moved to the side
  street) → Validate (re-counted; evening delay down by the typical ~13% from
  US FHWA signal-retiming evaluations). The queue is simulated against the
  signal (`MAIN_GREEN` in `views.ts`), so it really shortens after re-timing.
- **Journey** (`chapters.ts`, `landmarks.ts`): one camera key per chapter,
  from the northern hills (−1) to the southern hills; the order of chapters
  lives in `chapters.ts`. Page sections anchor them with `data-chapter`; a pinned
  story anchors its chapter twice so the camera holds while it plays.
- **Performance:** pixel density capped at 1.4 (1.0 on phones) and adapting
  down under load; per-instance culling; half-rate rendering while idle;
  layers mount over several frames; phones get fewer houses, trees and cars.
- **Fallback:** `public/city-map.svg`, a plan of the same city, is generated
  by `npx tsx scripts/generate-city-svg.ts`. Rerun it if you change the layout.

The district scenarios are **illustrative examples**, labelled as such on the
page. They are not claims of client work.

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
- Pinned stories don't pin: every beat is listed in the card instead.
- The intro (particles assemble the logo, then burst away) shows once per
  browser, only on the home page, can be skipped (button, Escape, click), runs as
  a tiny inline 2D-canvas script before the app loads, and dismisses itself with
  CSS even if JavaScript fails.
- Wide screens get a chapter rail (left edge) for orientation and jumping.

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
- Lighthouse 12 (local, simulated throttling), after the 3D upgrade:
  mobile **97 / 100 / 96 / 100** (Perf / A11y / BP / SEO), LCP 2.4s, CLS 0, TBT 130ms;
  desktop **100 / 100 / 96 / 100**, LCP 0.6s, CLS 0, TBT 20ms.
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
