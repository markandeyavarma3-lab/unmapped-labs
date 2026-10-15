/**
 * Page copy and structured content. Components render from this file, so
 * wording changes never require touching layout code.
 */

export const hero = {
  eyebrow: "Unmapped Labs / Independent exploration",
  heading: ["Explore what", "hasn't been mapped."],
  body: "We study real-world systems, uncover overlooked problems, and discover opportunities to make things work better.",
  primaryCta: { label: "Explore our approach", href: "#approach" },
  secondaryCta: { label: "Start a conversation", href: "#contact" },
};

export const intro = {
  label: "01 — Beneath the surface",
  heading: "The obvious answer isn't always the right one.",
  body: [
    "Every industry has a reality beneath the surface: people, processes, constraints, dependencies, and opportunities that are easy to overlook from the outside.",
    "We begin by learning how things actually work. Then we investigate what could work better.",
  ],
  progression: ["Unknown", "Observe", "Map", "Understand", "Discover", "Build"],
  figure: "Fig. 02 — From unknown to built",
  captions: [
    "Noise and fragments. Plenty of opinions, no shape yet.",
    "Watch the system as it actually runs — before deciding anything.",
    "Trace the terrain: flows, dependencies, and the places nobody has charted.",
    "Separate the layers. Symptoms on the surface, causes underneath.",
    "Find the connections between parts that no one has drawn.",
    "Only then, build — and build what fits the ground it stands on.",
  ],
};

export type Stage = {
  index: string;
  title: string;
  body: string;
  annotation: string;
};

export const approach = {
  label: "02 — How we work",
  heading: "Before the solution, understand the system.",
  intro:
    "Five stages, rarely in a straight line. Each one exists to make the next decision better informed than the last.",
  stages: [
    {
      index: "01",
      title: "Observe",
      body: "Enter the environment, speak with the people involved, and understand how work happens in reality.",
      annotation: "Field presence · conversations · context",
    },
    {
      index: "02",
      title: "Map",
      body: "Document processes, dependencies, bottlenecks, constraints, and areas of uncertainty.",
      annotation: "Flows · dependencies · unknowns",
    },
    {
      index: "03",
      title: "Understand",
      body: "Investigate root causes, question assumptions, and distinguish symptoms from underlying problems.",
      annotation: "Root causes · assumptions tested",
    },
    {
      index: "04",
      title: "Build",
      body: "Explore appropriate solutions, including technical, operational, analytical, or nontechnical approaches.",
      annotation: "Software only when it fits",
    },
    {
      index: "05",
      title: "Validate",
      body: "Evaluate potential improvements against real requirements and observable outcomes.",
      annotation: "Real requirements · observable outcomes",
    },
  ] satisfies Stage[],
};

export type FocusArea = {
  id: "agriculture" | "logistics" | "healthcare" | "energy" | "open";
  index: string;
  title: string;
  body: string;
  keywords: string[];
};

export const focus = {
  label: "03 — Focus areas",
  heading: "Where we're looking first.",
  intro:
    "These are initial areas of interest — places where we want to learn — not claims of established expertise. The map is deliberately left open at the edges.",
  areas: [
    {
      id: "agriculture",
      index: "A",
      title: "Agriculture & food systems",
      body: "Investigate production, distribution, sourcing, market access, operational processes, and other real-world challenges.",
      keywords: ["Production", "Distribution", "Market access"],
    },
    {
      id: "logistics",
      index: "B",
      title: "Logistics & supply chains",
      body: "Explore transportation, movement of goods, coordination, bottlenecks, inventory, and information flow.",
      keywords: ["Movement", "Coordination", "Information flow"],
    },
    {
      id: "healthcare",
      index: "C",
      title: "Healthcare systems",
      body: "Explore operational challenges, coordination, access, and delivery processes — while respecting privacy, safety, and professional expertise.",
      keywords: ["Access", "Coordination", "Delivery"],
    },
    {
      id: "energy",
      index: "D",
      title: "Energy & essential infrastructure",
      body: "Investigate how essential systems are operated, coordinated, maintained, and improved.",
      keywords: ["Operations", "Maintenance", "Utilities"],
    },
    {
      id: "open",
      index: "?",
      title: "Open exploration",
      body: "The next meaningful problem may exist in an industry that isn't listed here yet. If you know where it is, tell us.",
      keywords: ["Uncharted"],
    },
  ] satisfies FocusArea[],
};

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
  label: "04 — Selected work",
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

export type Service = { index: string; title: string; body: string; deliverables: string[] };

export const services = {
  label: "05 — What we do",
  heading: "Once the system is understood, this is how we help.",
  intro: "Four kinds of work, usually in this order — and only the ones the problem actually needs.",
  items: [
    {
      index: "S1",
      title: "Field research & mapping",
      body: "We go to where the work happens, talk to the people doing it, and map how the system really runs — flows, dependencies, bottlenecks and the gaps nobody has written down.",
      deliverables: ["Process maps", "Bottleneck reports", "Opportunity briefs"],
    },
    {
      index: "S2",
      title: "Websites & lead systems",
      body: "Sites that explain what a business does to the people who need it, with the plumbing behind them — lead capture, dashboards and follow-up that someone will actually use.",
      deliverables: ["Websites", "Lead dashboards", "Landing pages"],
    },
    {
      index: "S3",
      title: "Internal tools & software",
      body: "Tools shaped around how a business already works: quoting, billing, catalogues, selectors — often local-first, so they run where the work is.",
      deliverables: ["Quoting & billing", "Selectors & catalogues", "Admin tools"],
    },
    {
      index: "S4",
      title: "Data, research & automation",
      body: "Pulling structure out of PDFs and public records, building research platforms, and automating the repetitive parts — with the checks that prove it's right.",
      deliverables: ["Data extraction", "Research platforms", "Automation & ML"],
    },
  ] satisfies Service[],
};

export const notes = {
  label: "06 — Field notes",
  heading: "Notes from the unmapped.",
  intro:
    "Observations, questions, and ideas gathered while exploring the systems that shape how things work.",
  empty: {
    title: "The first notes are still in the field.",
    body: "Nothing here is invented. When we publish, it will be something we actually saw, asked, or learned — and it will appear right here.",
  },
};

export const principles = {
  label: "07 — Philosophy",
  heading: "Understand first. Solve thoughtfully.",
  items: [
    { title: "Research before assumptions", body: "Start from what is observed, not what is expected." },
    { title: "Firsthand understanding", body: "Time with the people doing the work comes before proposals." },
    { title: "Root causes over surface fixes", body: "A symptom treated in isolation tends to come back." },
    { title: "Technology when appropriate", body: "Software is one possible answer — never the default one." },
    { title: "Constraints are real", body: "Budgets, habits, regulation and infrastructure shape what can work." },
    { title: "Findings lead to action", body: "Research is only useful if it informs a better next step." },
  ],
  layers: [
    { title: "Visible symptom", body: "What everyone notices" },
    { title: "Underlying cause", body: "Why it actually happens" },
    { title: "Potential intervention", body: "What might change it" },
    { title: "Validation", body: "Evidence that it helped" },
  ],
};

export const about = {
  label: "08 — About",
  heading: "Curiosity with a practical purpose.",
  body: [
    "Unmapped Labs is an exploration-driven initiative focused on understanding industries, investigating real-world challenges, and discovering opportunities for better solutions.",
    "The approach begins with curiosity and firsthand learning. By studying how people, processes, and systems work together, Unmapped Labs aims to identify meaningful problems before deciding how to address them.",
    "The objective is not to build something merely because it can be built. It is to understand what is worth improving and determine what might genuinely help.",
  ],
  pullQuote: "Understand what exists. Discover what is missing.",
};

export const contact = {
  label: "09 — Contact",
  heading: "Found something worth exploring?",
  body: "Have a problem worth understanding, an industry worth exploring, or an idea worth investigating? Start a conversation.",
  areas: [
    "Agriculture & food systems",
    "Logistics & supply chains",
    "Healthcare systems",
    "Energy & essential infrastructure",
    "Something else",
  ],
};
