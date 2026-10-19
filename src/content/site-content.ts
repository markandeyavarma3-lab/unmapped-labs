/**
 * Page copy and structured content. Components render from this file, so
 * wording changes never require touching layout code.
 */

import type { PhotoKey } from "./photos";

export const hero = {
  eyebrow: "Operations research · Problem solving · India",
  heading: "See how it really runs. Then fix what's broken.",
  /** The heading, broken into the lines that rise in on load. */
  lines: ["See how it", "really runs.", "Then fix", "what's broken."],
  body: "We come to your site, study how the work actually happens, and find the real cause of what's slowing it down. Then we fix it — with software, hardware, a better process or better data — building it ourselves or bringing in the right people.",
  primaryCta: { label: "Start a conversation", href: "/contact" },
  secondaryCta: { label: "Try the simulator", href: "/#simulator" },
  proof: [
    { value: "On site", label: "We study the work where it happens" },
    { value: "Measured", label: "Before and after, in numbers" },
    { value: "Any fix", label: "Software, hardware, process or data" },
  ],
};

/** What clients usually come to us with (home page). */
export const problems = {
  label: "Why people call us",
  heading: "Something in the operation costs more than it should.",
  items: [
    { title: "Queues and waiting", body: "Trucks at the gate, patients at the door, produce in the sun. Work piles up at one point while the rest sits idle." },
    { title: "Waste nobody can see", body: "Energy, water or materials lost quietly — leaking air, oversized pumps, machines running with nothing to do." },
    { title: "Slow manual work", body: "Answers that live in a catalogue, a spreadsheet or one person's head, looked up by hand every time." },
    { title: "Decisions without data", body: "Plenty of records, but no clear picture of what is actually happening, or when." },
  ],
};

/** The pinned gallery on the home page: the kinds of place we work in. */
export const sites: { label: string; photo: PhotoKey; title: string; body: string; caseSlug: string }[] = [
  {
    label: "Ports & yards",
    photo: "port",
    title: "Boxes buried in the yard",
    body: "Trucks queue at the gate while cranes dig for containers stacked under others.",
    caseSlug: "boxes-buried-in-the-yard",
  },
  {
    label: "Farms & packhouses",
    photo: "harvest",
    title: "Harvest waiting in the heat",
    body: "Picked produce sits in the sun because the packhouse can't take it fast enough.",
    caseSlug: "harvest-waiting-in-the-heat",
  },
  {
    label: "Hospitals",
    photo: "hospitalQueue",
    title: "Everyone arrives at nine",
    body: "One registration counter sets the pace of the whole morning for every department behind it.",
    caseSlug: "everyone-arrives-at-nine",
  },
  {
    label: "Plants & workshops",
    photo: "factory",
    title: "Air that leaks away",
    body: "Compressed air, motors and pumps quietly waste energy nobody is measuring.",
    caseSlug: "air-that-leaks-away",
  },
  {
    label: "Water & irrigation",
    photo: "canal",
    title: "Some rows drown, others dry",
    body: "The same water, delivered unevenly: pressure differences and clogging decide which crops get it.",
    caseSlug: "some-rows-drown-others-dry",
  },
];

/** Industry figures for the numbers band — each one is sourced on its case page. */
export const figures: { value: string; label: string; caseSlug: string }[] = [
  { value: "25–30%", label: "typical efficiency of a farm pump set; good ones reach 35–60%", caseSlug: "pumps-burning-power" },
  { value: "20–30%", label: "of compressor output lost to leaks in plants without a leak programme", caseSlug: "air-that-leaks-away" },
  { value: "75%", label: "of container moves unproductive, at worst, in one terminal study", caseSlug: "boxes-buried-in-the-yard" },
  { value: "11% → 38%", label: "before-noon discharges at one hospital after a process change", caseSlug: "beds-free-up-too-late" },
];

export type Stage = {
  index: string;
  title: string;
  body: string;
};

export const approach = {
  label: "How we work",
  heading: "Before the solution, understand the system.",
  intro: "Five steps, rarely in a straight line. Each one makes the next decision better informed than the last.",
  stages: [
    { index: "01", title: "Observe", body: "We go where the work happens, talk to the people doing it, and watch how it actually runs." },
    { index: "02", title: "Map", body: "We document the flows, dependencies and bottlenecks — on paper first, measured where it matters." },
    { index: "03", title: "Understand", body: "We separate symptoms from causes, test assumptions, and find what really drives the problem." },
    { index: "04", title: "Build", body: "We choose the fix the problem needs — software, hardware, process or data — and build it or bring in the right people." },
    { index: "05", title: "Validate", body: "We measure the result against where we started, so you can see whether it worked." },
  ] satisfies Stage[],
};

export type FixType = "software" | "hardware" | "process" | "data";

export const fixLabels: Record<FixType, string> = {
  software: "Software",
  hardware: "Hardware",
  process: "Process",
  data: "Data & AI",
};

export type Source = { label: string; href: string };

export type CaseStudy = {
  slug: string;
  name: string;
  kind: "Client project" | "Lab project";
  sector: string;
  oneLiner: string;
  problem: string;
  insight: string;
  built: string[];
  outcome: string;
  /** Only real, checkable figures from the work itself. */
  facts: { value: string; label: string }[];
  stack: string[];
  process: { stage: string; note: string }[];
};

export const work = {
  label: "Selected work",
  heading: "Ground we've already mapped.",
  intro:
    "Two pieces of work, one for a client and one of our own. Every figure below comes from the systems themselves — nothing rounded up, nothing invented.",
  cases: [
    {
      slug: "flowmatch",
      name: "FlowMatch",
      kind: "Client project",
      sector: "Agriculture · Pump distribution",
      oneLiner: "The right KSB agricultural pump for a borewell — matched by water flow and depth, with exact prices, in seconds.",
      problem:
        "Choosing an agricultural pump meant reading KSB's performance booklet by hand: hundreds of pump and motor combinations, each with its own operating curve, then cross-checking a separate confidential price list. Slow, and easy to get wrong in front of a farmer.",
      insight:
        "The real question a customer brings is simple — how much water, from how deep. Everything else in the catalogue is detail that should be shown, not asked. And the data had to stay on the dealer's machine.",
      built: [
        "A deterministic extractor that reads the catalogue and price-list PDFs geometrically and turns them into structured data.",
        "A local database of every pump variant and operating point, linked to purchasable price options.",
        "A search that asks only for flow, depth and optional horsepower, ranks results without bias toward price, and explains every near-match.",
        "A built-in correctness check: every operating point scanned must land in exactly one result bucket — which caught a real bug silently dropping about 4% of rows.",
      ],
      outcome:
        "A local-first selector that turns a catalogue lookup into a two-field search, keeps confidential prices on the dealer's own computer, and shows its working for every recommendation.",
      facts: [
        { value: "8,163", label: "operating points extracted" },
        { value: "919", label: "pump–motor variants" },
        { value: "123", label: "performance tables read" },
        { value: "66", label: "automated tests" },
      ],
      stack: ["Python PDF extraction", "Next.js", "TypeScript", "SQLite · Drizzle", "Zod", "Vitest"],
      process: [
        { stage: "Observe", note: "How pumps were actually being chosen at the counter." },
        { stage: "Map", note: "Catalogue structure, price list, and where the two disagreed." },
        { stage: "Understand", note: "Flow and depth are the only true inputs." },
        { stage: "Build", note: "Extractor, database and a two-field search." },
        { stage: "Validate", note: "An invariant that accounts for every row." },
      ],
    },
    {
      slug: "deal-lens",
      name: "Deal Lens",
      kind: "Lab project",
      sector: "Markets · Public disclosures",
      oneLiner: "Who really trades India's bulk and block deals — every session since 2005, labelled.",
      problem:
        "India's exchanges publish every bulk and block deal, but as raw daily files: no history, no idea who the participants really are, and no way to tell a fund house from a high-frequency firm round-tripping the same stock.",
      insight:
        "The disclosures only become information once each participant is identified and grouped. More than half of bulk deals turned out to be same-day round trips — noise that hides the activity worth studying.",
      built: [
        "A research platform that collects NSE and BSE disclosures every night and rebuilds a clean warehouse.",
        "Participant labelling: mutual funds grouped by fund house, foreign institutions, promoters and high-frequency firms.",
        "A free, static, data-only website for analysts and students — company histories, participant footprints, a screener.",
        "Pre-registered research with published negative results, and a test that proves no trading code exists.",
      ],
      outcome:
        "Two decades of disclosures turned into a navigable, labelled map of institutional activity — honest about what the data can and cannot say. It never gives investment advice.",
      facts: [
        { value: "243,929", label: "deals labelled" },
        { value: "5,110", label: "trading sessions since 2005" },
        { value: "32,881", label: "participants identified" },
        { value: "54.8%", label: "of bulk deals are same-day round trips" },
      ],
      stack: ["Python", "Postgres warehouse", "Astro", "Nightly pipelines", "Pre-registered research"],
      process: [
        { stage: "Observe", note: "What the exchanges actually publish, and what's missing." },
        { stage: "Map", note: "Every source, every participant, every gap in history." },
        { stage: "Understand", note: "Round-trip noise versus real institutional activity." },
        { stage: "Build", note: "Warehouse, labelling and a static public site." },
        { stage: "Validate", note: "Pre-registered findings, including the negative ones." },
      ],
    },
  ] satisfies CaseStudy[],
};

export type Service = { index: string; title: string; body: string; deliverables: string[]; fix?: FixType };

export const services = {
  label: "What we do",
  heading: "Find where the hours go. Then win them back.",
  intro:
    "Every engagement starts by understanding the system. What comes after depends on what we find — sometimes software, sometimes hardware, sometimes just a better way of working.",
  items: [
    {
      index: "00",
      title: "Find where your operation loses time and money",
      body: "We come to your site, watch the work, talk to the people doing it and measure what really happens. You get a clear picture of where the bottleneck is, what causes it, and the options to fix it — before anyone builds anything.",
      deliverables: ["On-site study", "Bottleneck map", "Options & costs"],
    },
    {
      index: "S1",
      fix: "software",
      title: "Replace slow manual work with simple tools",
      body: "Selectors, quoting and billing, internal dashboards, websites that bring in customers — shaped around how your team already works, so people actually use them.",
      deliverables: ["Internal tools", "Selectors & catalogues", "Websites & lead systems"],
    },
    {
      index: "S2",
      fix: "hardware",
      title: "See problems before they stop the line",
      body: "Sensors, meters and controllers chosen for the job and wired to software that warns you in time. We select and integrate; for specialist installation we bring in and manage the right people.",
      deliverables: ["Device selection", "Sensor integration", "Monitoring & alerts"],
    },
    {
      index: "S3",
      fix: "process",
      title: "Fix the flow without new technology",
      body: "Often the cheapest fix is a better schedule, a clearer handoff or a different layout. We redesign how work moves and stay until it sticks.",
      deliverables: ["Workflow redesign", "Schedules & layouts", "Handoffs"],
    },
    {
      index: "S4",
      fix: "data",
      title: "Turn records you already have into decisions",
      body: "Pull structure out of PDFs, logs and spreadsheets; forecast demand; automate reports — with checks that prove the numbers are right.",
      deliverables: ["Data extraction", "Forecasting", "Automated reports"],
    },
  ] satisfies Service[],
};

/** How an engagement runs, step by step. No prices: those follow the first call. */
export const engagements = {
  label: "How we engage",
  heading: "Start small. Prove it. Then go further.",
  intro: "Every engagement begins with a free first conversation. Pricing comes after it, once we both know the size of the problem.",
  steps: [
    { index: "01", title: "First conversation", time: "30–45 minutes · free", body: "You tell us what's slowing you down. We ask questions, and tell you honestly whether we're the right people for it." },
    { index: "02", title: "On-site diagnostic", time: "Usually 1–3 weeks", body: "We come to your site, observe, measure and talk to your team. You get a written report: the real cause, the evidence, and the options with rough costs." },
    { index: "03", title: "Build or bring the fix", time: "Scoped to the problem", body: "We build software, data and process fixes ourselves. Where it needs hardware or specialists, we bring in the right people and manage the work for you." },
    { index: "04", title: "Measure and support", time: "After it goes live", body: "We measure the result against where we started, so you can see whether it worked, and stay on to support what we built." },
  ],
  cta: { label: "Start with a free first conversation", href: "/contact" },
};

/**
 * Client words. Nothing here is shown until `published` is true — replace each
 * draft with a real quote (and the person's permission) first.
 */
export type Testimonial = { quote: string; name: string; role: string; published: boolean };
export const testimonials: { label: string; heading: string; items: Testimonial[] } = {
  label: "In their words",
  heading: "What people we've worked with say.",
  items: [
    {
      quote: "DRAFT — replace with a real quote. e.g. what changed at the counter after FlowMatch, in the client's own words.",
      name: "Name Surname",
      role: "Role, Company (FlowMatch client)",
      published: false,
    },
    {
      quote: "DRAFT — replace with a real quote from a collaborator or early conversation.",
      name: "Name Surname",
      role: "Role, Company",
      published: false,
    },
  ],
};

export const notes = {
  label: "Field notes",
  heading: "Notes from the field.",
  intro: "What we learn about how real operations work — and what the research says about fixing them.",
  empty: {
    title: "The first notes are still in the field.",
    body: "Nothing here is invented. When we publish, it will be something we actually saw, asked, or learned — and it will appear right here.",
  },
};

export const principles = {
  label: "Principles",
  heading: "Understand first. Solve thoughtfully.",
  items: [
    { title: "Understand before we build", body: "We start from what we observe on site, not from what we expect to find." },
    { title: "Fix the cause, not the symptom", body: "A symptom treated on its own tends to come back. We look for why it happens." },
    { title: "Technology only when it fits", body: "Software is one possible answer, never the default. Sometimes a schedule change does more." },
  ],
  layers: [
    { title: "Visible symptom", body: "What everyone notices" },
    { title: "Underlying cause", body: "Why it actually happens" },
    { title: "Potential intervention", body: "What might change it" },
    { title: "Validation", body: "Evidence that it helped" },
  ],
};

export const about = {
  label: "About",
  heading: "A startup that goes and looks.",
  body: [
    "Unmapped Labs is a startup that solves operational problems. If something in your work is slow, wasteful or keeps breaking — or you simply want the work to be easier — we come to your place and study it properly.",
    "We watch how the work actually happens, talk to the people doing it, and measure until we find the real cause. Then we fix it: we build the solution ourselves when it's software, data or process, and bring in and manage the right people when it needs hardware or specialist skills.",
    "We don't build things just because they can be built. We build what the problem needs, and show you the before and after.",
  ],
  pullQuote: "Understand what exists. Discover what is missing.",
};

export const contact = {
  label: "Contact",
  heading: "What would you like to fix?",
  body: "Tell us what's slowing you down, or what you'd like to make easier. Name, email and a few lines is enough — we'll take it from there.",
  reply: "We read every message and reply as soon as we can.",
  next: [
    "We read your message and reply as soon as we can.",
    "If it fits, we set up a free first conversation — phone or video, 30 to 45 minutes.",
    "Then, if it's useful, we plan a visit to your site.",
  ],
  areas: [
    "Agriculture & food systems",
    "Logistics & supply chains",
    "Healthcare systems",
    "Energy & essential infrastructure",
    "Something else",
  ],
};
