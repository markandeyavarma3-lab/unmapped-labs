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
  /** Before the five stages: where every project starts. */
  unknown: {
    index: "00",
    title: "Unknown",
    body: "A junction that jams every evening. Everyone has a theory — a flyover, too many cars, the autos. Nobody has counted anything yet.",
    annotation: "Opinions · no data yet",
  } satisfies Stage,
  /**
   * What the city block shows at each step. An illustrative example, not
   * client work; the result uses the typical gain from signal retiming
   * (US FHWA evaluations: about 12–13% less delay).
   */
  scene: {
    caption: "Illustrative example: one evening jam at one junction.",
    unknown: ["It jams every evening", "\u201cBuild a flyover\u201d", "\u201cToo many cars\u201d"],
    observe: ["Counting turns in 15-minute blocks", "Queue at red: 18 vehicles", "Main road green: 25 s of a 120 s cycle"],
    map: ["Main road: 3 of every 4 vehicles", "Autos stop on the corner", "Side street: light traffic"],
    understand: ["Symptom: the evening queue", "Cause: a timing plan years old", "Cause: autos block the left lane"],
    build: ["New timing plan, loaded on site", "Auto stand moved off the corner"],
    validate: ["Evening delay: \u221213%", "Re-counted over two weeks"],
    sketch: "Turning counts, sketched on site",
    timing: "Share of traffic vs share of green",
    delay: "Evening delay per 15 minutes",
  },
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

export type FixType = "software" | "hardware" | "process" | "data";

export const fixLabels: Record<FixType, string> = {
  software: "Software",
  hardware: "Hardware",
  process: "Process",
  data: "Data & AI",
};

/** One step of a pinned story: a short label for the step bar and a sentence of narration. */
export type Beat = { label: string; text: string };
/** In-scene callouts for each step of a story (Problem, Diagnose, Fix, Result). */
export type SceneCallouts = [string[], string[], string[], string[]];

export type Source = { label: string; href: string };

/**
 * One problem a large operation really has, played out in the city. The
 * setting is illustrative (not client work); "typical" figures and the
 * method come from the sources listed.
 */
export type FocusCase = {
  id: "harvest" | "irrigation" | "pumps" | "yard" | "discharge" | "opd" | "leaks" | "peak" | "open";
  title: string;
  problem: string;
  fix: FixType | null;
  fixNote: string;
  /** The headline figure from the sources, stated as typical. */
  typical?: string;
  /** The four steps the case plays while it is pinned. */
  beats: [Beat, Beat, Beat, Beat];
  /** One line of narration in the scene per step. */
  scene: SceneCallouts;
  /** Title of the chart the team builds from what it logged. */
  chart?: string;
  sources: Source[];
};

export type FocusArea = {
  id: "agriculture" | "logistics" | "healthcare" | "energy" | "open";
  index: string;
  title: string;
  /** The kind of site, e.g. "A large commercial farm". */
  site: string;
  body: string;
  cases: FocusCase[];
};

export const focus = {
  label: "03 — Focus areas",
  heading: "Where we're looking first.",
  intro:
    "Large operations: commercial farms, ports and yards, hospital campuses, industrial plants. These are areas of interest, not claims of past work. Each example is a problem these places really have, worked the way we work: go on site, measure, find the cause, then choose the fix it needs.",
  note: "Illustrative settings. Typical figures come from the sources linked on each case.",
  areas: [
    {
      id: "agriculture",
      index: "A",
      title: "Agriculture & food systems",
      site: "A large commercial farm",
      body: "Production, post-harvest handling, water and energy on farms run at scale.",
      cases: [
        {
          id: "harvest",
          title: "Harvest waiting in the heat",
          problem: "Picked produce waits for hours in the sun before the packhouse can take it.",
          fix: "process",
          fixNote: "Picking in waves matched to the grading line, and a pre-cooler at the dock.",
          typical: "Each hour before cooling can cost up to a day of shelf life.",
          beats: [
            { label: "Problem", text: "Crates pile up at the packhouse door through the hottest part of the day." },
            { label: "Diagnose", text: "We log every crate: picked at 9, still outside at 1, pulp at 34 °C. Each hour before cooling can cost up to a day of shelf life." },
            { label: "Fix · Process", text: "Picking crews start in waves timed to the grading line, and crates go into a forced-air pre-cooler first." },
            { label: "Result", text: "Crates are cooling within the hour they're picked." },
          ],
          scene: [["Crates waiting: 3.5 h"], ["Pulp 34 °C · logged crate by crate"], ["Picking in waves → pre-cooler"], ["In the cold within 1 h"]],
          chart: "Wait before cooling, by batch",
          sources: [
            { label: "Univ. of Kentucky, after UC Davis Postharvest Center: cooling delay and shelf life", href: "https://marketready.uky.edu/sites/default/files/2022-07/Shelf-life%20Extension%20and%20Quality_FieldDay2022.pdf" },
          ],
        },
        {
          id: "irrigation",
          title: "Some rows drown, others dry",
          problem: "On long drip lines, the far ends get far less water than the heads.",
          fix: "hardware",
          fixNote: "Pressure regulators at every block, a flushing routine, and soil-moisture sensors per zone.",
          typical: "In a study of 329 fields, 45% of uneven watering came from pressure differences and 52% from clogging and wear.",
          beats: [
            { label: "Problem", text: "Plants at the far end of each line are stressed while the near end is waterlogged." },
            { label: "Diagnose", text: "We walk the blocks with a pressure gauge and catch cans under the emitters. Flow falls away along every line." },
            { label: "Fix · Hardware", text: "Pressure regulators at each block inlet, the lines flushed, and soil-moisture sensors in every zone." },
            { label: "Result", text: "Every row gets about the same water, and each zone runs on its own schedule." },
          ],
          scene: [["Far ends: 40% less water"], ["Gauge + catch cans, emitter by emitter"], ["Regulators + moisture sensors"], ["Even water down every row"]],
          chart: "Water caught along one row",
          sources: [
            { label: "Irrigation Association technical paper, citing an ITRC study of 329 fields", href: "https://www.irrigation.org/IA/FileUploads/IA/Resources/TechnicalPapers/2016/ReversingYieldLossbyManagingDistributionUniformity.pdf" },
            { label: "UC ANR: maintenance of micro-irrigation systems", href: "https://ucanr.edu/node/123435" },
          ],
        },
        {
          id: "pumps",
          title: "Pumps burning power, not lifting water",
          problem: "The farm's pump sets run long hours, run hot, and the power bill keeps climbing.",
          fix: "software",
          fixNote: "Choosing each pump by the flow and head the farm actually needs.",
          typical: "Farm pump sets typically run at 25–30% efficiency; efficient, well-matched sets reach 35–60%.",
          beats: [
            { label: "Problem", text: "Motors run 16 hours a day and still struggle to keep the reservoir full." },
            { label: "Diagnose", text: "A pump test: flow meter on the delivery, pressure gauges, a clamp meter on the motor. Overall efficiency: 28%." },
            { label: "Fix · Software", text: "Pumps selected from the manufacturers' curves for the real flow and head." },
            { label: "Result", text: "The same water with about 30% less energy — the saving measured in India's pump replacement pilots." },
          ],
          scene: [["Running 16 h a day"], ["Pump test: 28% efficient"], ["Matched to flow + head"], ["Energy \u221230%"]],
          chart: "Pump test: overall efficiency",
          sources: [
            { label: "National Energy Efficient Agriculture Pumps Programme (Vikaspedia)", href: "https://en.vikaspedia.in/energy/policy-support/energy-efficiency/national-energy-efficient-agriculture-pumps-programme" },
            { label: "CSTEP: irrigation pump sets in Karnataka", href: "https://newsite.cstep.in/drupal/sites/default/files/2020-04/IPSets_GoK_ppt.pdf" },
          ],
        },
      ],
    },
    {
      id: "logistics",
      index: "B",
      title: "Logistics & supply chains",
      site: "A container yard and distribution centre",
      body: "Movement of goods, yards and docks, and the information that's supposed to coordinate them.",
      cases: [
        {
          id: "yard",
          title: "Boxes buried in the yard",
          problem: "Containers sit for days, and getting one out means moving the ones stacked on top of it.",
          fix: "software",
          fixNote: "A live yard view that stacks each box by the day it will leave.",
          typical: "One terminal study found up to 75% of container moves were unproductive.",
          beats: [
            { label: "Problem", text: "Trucks wait at the gate while the crane digs for the right container." },
            { label: "Diagnose", text: "We log every crane move for a week. Most are reshuffles, not deliveries: boxes were stacked by arrival, not by departure." },
            { label: "Fix · Software", text: "A yard view with each box's expected pickup: new arrivals stacked by departure day, held boxes at the bottom." },
            { label: "Result", text: "More pickups take a single lift. One operator reported 12% fewer rehandles and 10% shorter dwell with a similar view." },
          ],
          scene: [["Truck waiting: 2 h"], ["3 of 4 moves are reshuffles"], ["Stacked by pickup day"], ["One lift, truck out"]],
          chart: "Crane moves in one hour",
          sources: [
            { label: "Toward reducing unproductive container moves (arXiv, 2026)", href: "https://arxiv.org/pdf/2604.06251" },
            { label: "Yard control tower case study (B EYE)", href: "https://b-eye.com/customer-stories/qlik-container-terminal/" },
          ],
        },
      ],
    },
    {
      id: "healthcare",
      index: "C",
      title: "Healthcare systems",
      site: "A large hospital campus",
      body: "Patient flow, beds and outpatient access — with respect for privacy, safety and clinical judgement.",
      cases: [
        {
          id: "discharge",
          title: "Beds free up too late",
          problem: "Emergency patients wait for ward beds, because most discharges happen late in the afternoon.",
          fix: "process",
          fixNote: "Discharges planned the day before, medicines ready by morning, and a discharge lounge.",
          typical: "One hospital raised before-noon discharges from 11% to 38%, and held it for 41 months.",
          beats: [
            { label: "Problem", text: "Ambulances queue at the emergency entrance; patients wait on trolleys for a ward bed." },
            { label: "Diagnose", text: "We chart a month of admissions and discharges by hour: beds are needed from mid-morning, but most free up after 3 pm." },
            { label: "Fix · Process", text: "Discharges planned a day ahead, medicines and paperwork ready in the morning, and a lounge to wait for a ride." },
            { label: "Result", text: "Beds open when the emergency department needs them, and the ambulance queue clears." },
          ],
          scene: [["6 patients waiting for a bed"], ["Needed at 10 am, freed at 4 pm"], ["Planned the day before + lounge"], ["Before-noon discharges: 11% \u2192 38%"]],
          chart: "Discharges by hour",
          sources: [
            { label: "BMC Health Services Research (2024): sustaining discharge before noon", href: "https://bmchealthservres.biomedcentral.com/counter/pdf/10.1186/s12913-024-10960-x.pdf" },
            { label: "Simulation of discharge timing and ED boarding (PubMed)", href: "https://pubmed.ncbi.nlm.nih.gov/20888163" },
          ],
        },
        {
          id: "opd",
          title: "Everyone arrives at 9",
          problem: "Outpatients arrive together first thing, so the registration hall overflows every morning.",
          fix: "data",
          fixNote: "A forecast of arrivals that shapes appointment slots, plus registration online.",
          typical: "At one tertiary hospital, registration took about 10 minutes at the counter and about 4 online.",
          beats: [
            { label: "Problem", text: "The registration hall is packed by 9 am and nearly empty by 1 pm." },
            { label: "Diagnose", text: "We count arrivals in 15-minute blocks and time every step. Counter registration: about 10 minutes; online: about 4." },
            { label: "Fix · Data & AI", text: "A forecast of arrivals sets staggered slots for each doctor, with registration done online before the visit." },
            { label: "Result", text: "Arrivals spread across the morning. The doctors' slots matter as much as registration — online booking alone didn't cut waits at one large hospital." },
          ],
          scene: [["Hall full by 9 am"], ["Counted in 15-minute blocks"], ["Forecast \u2192 staggered slots"], ["The peak spreads out"]],
          chart: "Arrivals per 15 minutes",
          sources: [
            { label: "Online vs counter OPD registration, tertiary hospital (Cureus, 2025)", href: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12063933/" },
            { label: "Online registration and waiting at PGI Chandigarh (Tribune)", href: "https://www.tribuneindia.com/news/archive/community/online-registration-fails-to-reduce-patient-rush-waiting-period-at-pgi-333944" },
          ],
        },
      ],
    },
    {
      id: "energy",
      index: "D",
      title: "Energy & industrial infrastructure",
      site: "An industrial plant",
      body: "How plants buy, make and waste energy — compressed air, motors, and the shape of the load.",
      cases: [
        {
          id: "leaks",
          title: "Paying for air that leaks away",
          problem: "The plant's compressors run around the clock, even when the lines are idle.",
          fix: "hardware",
          fixNote: "An ultrasonic leak survey, tagged repairs, and a flow meter that keeps watching.",
          typical: "Leaks typically waste 20–30% of compressor output; a managed system holds them under 10%.",
          beats: [
            { label: "Problem", text: "At night, with production stopped, the compressors still keep loading." },
            { label: "Diagnose", text: "We walk the lines with an ultrasonic detector and tag every leak we hear." },
            { label: "Fix · Hardware", text: "Tagged leaks repaired, and a flow meter on the main header to catch new ones early." },
            { label: "Result", text: "Leakage held under 10%, and one compressor can stay off at night." },
          ],
          scene: [["Compressors on all night"], ["Ultrasonic survey: 14 leaks tagged"], ["Repaired + flow meter on the header"], ["Leaks under 10%"]],
          chart: "Air flow over 24 hours",
          sources: [
            { label: "Compressed Air Challenge, via Fluid Power World", href: "https://www.fluidpowerworld.com/?p=140736" },
            { label: "US DOE / NREL: compressed air leak guidance", href: "https://nrel.gov/docs/fy01osti/28008.pdf" },
          ],
        },
        {
          id: "peak",
          title: "A bill set by fifteen minutes",
          problem: "Every big machine starts at the start of the shift, and that one spike sets the month's demand charge.",
          fix: "process",
          fixNote: "A staggered start-up order, and an alarm before demand crosses the contract limit.",
          typical: "Demand is billed on the highest 15- or 30-minute average; some tariffs charge 50% extra above contract demand.",
          beats: [
            { label: "Problem", text: "The bill carries an excess-demand charge, though daily energy use looks normal." },
            { label: "Diagnose", text: "A power logger on the main incomer: demand spikes at 6 am, when every furnace and motor starts at once." },
            { label: "Fix · Process", text: "Machines start one after another, and an alarm warns before demand reaches the limit." },
            { label: "Result", text: "The peak stays under contract demand, and the excess charge goes away." },
          ],
          scene: [["Excess demand charged"], ["Logger: spike at the 6 am start"], ["Staggered start + alarm"], ["Peak under the limit"]],
          chart: "Demand in 15-minute intervals",
          sources: [
            { label: "KSEB EHT industrial tariff: excess demand charged 50% extra", href: "https://kseb.in/articledetail/eyJpdiI6IjE3MHVjdU5WWWhkTmRDWXdWMm5RUUE9PSIsInZhbHVlIjoiclNuK1B6d0U2S1BFWHVsMG9LYVlDZz09IiwibWFjIjoiMDM5MGU0ZjgxZmFiMGRkYzZhZjM0ZGZjMjdjNmU3ODBhNGUwMDZiMTYwYjcxMDdiOTM3MDBkNTU4NzllYjJkNiIsInRhZyI6IiJ9" },
            { label: "Mundra SEZ tariff schedule (GERC): maximum demand over 15/30 minutes", href: "https://bi-cd02.bimco.org/-/media/bimco/ships-ports-and-voyage-planning/countries/india/mundra/tariff_schedule_of_mupl_for_fy_2018_19.ashx" },
          ],
        },
      ],
    },
    {
      id: "open",
      index: "?",
      title: "Open exploration",
      site: "Uncharted ground",
      body: "The next meaningful problem may be in an industry that isn't listed here yet. If you know where it is, tell us.",
      cases: [
        {
          id: "open",
          title: "We don't know yet",
          problem: "We don't know yet — and that is the point.",
          fix: null,
          fixNote: "The next problem might need any of the four. We find out first.",
          beats: [
            { label: "Unknown", text: "Ground nobody has charted yet." },
            { label: "Survey", text: "Survey first: walk it, measure it, ask the people who work there." },
            { label: "Fix · ?", text: "Software, hardware, process or data? Too early to say." },
            { label: "Your turn", text: "If you know where the next problem is, tell us." },
          ],
          scene: [["Uncharted"], ["Surveying"], ["Fix: still unknown"], ["Tell us where to look"]],
          sources: [],
        },
      ],
    },
  ] satisfies FocusArea[] as FocusArea[],
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
  /** The four steps the project plays in the city while it is pinned. */
  beats: [Beat, Beat, Beat, Beat];
  scene: SceneCallouts;
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
      beats: [
        { label: "Catalogue", text: "KSB's performance booklet: hundreds of pump curves, read by hand at the counter." },
        { label: "Extract", text: "Every curve read geometrically from the PDFs: 8,163 operating points." },
        { label: "Search", text: "Two questions only: how much water, and from how deep." },
        { label: "Match", text: "The right pump and its exact price, in seconds, on the dealer's own machine." },
      ],
      scene: [["123 performance tables, in PDFs"], ["8,163 operating points"], ["Flow 4 L/s · depth 55 m"], ["Match: 1 of 919 variants"]],
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
      beats: [
        { label: "Raw", text: "Every bulk and block deal since 2005, as raw daily files: no history, no names that mean anything." },
        { label: "Label", text: "Each participant identified: fund houses, foreign institutions, promoters, high-frequency firms." },
        { label: "Filter", text: "54.8% of bulk deals are same-day round trips: noise, set aside." },
        { label: "Map", text: "What's left: a labelled map of who really trades, session by session." },
      ],
      scene: [
        ["Raw disclosures"],
        ["Labelled by participant", "Fund houses", "Foreign institutions", "Promoters", "High-frequency firms"],
        ["Round trips: 54.8%, set aside"],
        ["243,929 deals since 2005, mapped"],
      ],
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
  label: "05 — What we do",
  heading: "Research first. Then whichever fix the problem needs.",
  intro:
    "Every engagement starts the same way: understanding the system. What comes after depends on what we find — sometimes software, sometimes hardware, sometimes just a better way of working.",
  items: [
    {
      index: "00",
      title: "Field research & mapping",
      body: "We go to where the work happens, talk to the people doing it, and map how the system really runs — flows, dependencies, bottlenecks and the gaps nobody has written down. This decides everything else.",
      deliverables: ["Process maps", "Bottleneck reports", "Opportunity briefs"],
    },
    {
      index: "S1",
      fix: "software",
      title: "Software & tools",
      body: "Websites that bring customers, lead systems, quoting and billing, selectors and internal tools shaped around how a business already works.",
      deliverables: ["Websites & lead systems", "Internal tools", "Selectors & catalogues"],
    },
    {
      index: "S2",
      fix: "hardware",
      title: "Hardware & IoT",
      body: "When the answer is physical, we advise on the right sensors, devices and controllers, and integrate them with the software that makes them useful. We don't manufacture hardware.",
      deliverables: ["Device selection", "Sensor integration", "Monitoring"],
    },
    {
      index: "S3",
      fix: "process",
      title: "Process & operations",
      body: "Sometimes the fix isn't technology at all: a different layout, a clearer handoff, a better schedule. We redesign the way work flows and help it stick.",
      deliverables: ["Workflow redesign", "Layouts & schedules", "Handoff design"],
    },
    {
      index: "S4",
      fix: "data",
      title: "Data & AI",
      body: "Pulling structure out of PDFs and public records, forecasting, research platforms and automation — with the checks that prove the numbers are right.",
      deliverables: ["Data extraction", "Forecasting", "Research platforms"],
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

export const epilogue = {
  label: "Fig. 10 — The southern hills",
  line: "Past the last street, the map runs out.",
  body: "That's usually where the interesting problems are.",
  back: { label: "Back to the start", href: "#top" },
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
