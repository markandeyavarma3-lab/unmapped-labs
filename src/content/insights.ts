import type { FixType, Source } from "./site-content";
import type { PhotoKey } from "./photos";

/**
 * Industry cases: problems large operations really have, written up the way
 * we'd work them — what we'd measure on site, the fix the problem needs, and
 * the typical result. Settings are illustrative, not client work; "typical"
 * figures and methods come from the sources listed on each case.
 */

export type Industry = "agriculture" | "logistics" | "healthcare" | "industry";

export const industries: Record<Industry, { title: string; site: string; body: string }> = {
  agriculture: { title: "Agriculture & food", site: "Commercial farms", body: "Post-harvest handling, water and the energy it takes to move it." },
  logistics: { title: "Logistics & supply chains", site: "Yards, ports and warehouses", body: "Moving goods, stacking them, and the information meant to coordinate it." },
  healthcare: { title: "Healthcare", site: "Hospital campuses", body: "Patient flow, beds and outpatient access — with respect for clinical judgement." },
  industry: { title: "Energy & industry", site: "Industrial plants", body: "Compressed air, motors, and the shape of the electrical load." },
};

/**
 * A before/after chart for a case. Values are shares of the chart's height
 * (0–1); `limit` draws a dashed line (a target, threshold or contract limit).
 */
export type Figure = {
  title: string;
  caption: string;
  labels: string[];
  before: number[];
  after: number[];
  limit?: number;
  limitLabel?: string;
  /** Which bars show the problem; by default, bars above `limit`. */
  bad?: (v: number, i: number, when: "before" | "after") => boolean;
};

export type IndustryCase = {
  slug: string;
  industry: Industry;
  title: string;
  summary: string;
  problem: string;
  measure: string;
  fix: string;
  fixType: FixType;
  result: string;
  typical: string;
  figure: Figure;
  sources: Source[];
};

export const insightsPage = {
  label: "Insights",
  heading: "Problems large operations really have.",
  intro:
    "Each of these is a well-documented problem, written up the way we would work it: what we'd measure on site, the fix it actually needs, and the result you can typically expect. They're illustrative settings, not client work — the figures come from the sources on each page.",
};

const hours = (from: number, n: number, step = 1) => Array.from({ length: n }, (_, i) => `${(from + i * step) % 24}`);

export const cases: IndustryCase[] = [
  {
    slug: "harvest-waiting-in-the-heat",
    industry: "agriculture",
    title: "Harvest waiting in the heat",
    summary: "Picked produce waits for hours in the sun before the packhouse can take it.",
    problem: "Crates pile up at the packhouse door through the hottest part of the day. Picking starts at dawn, but the grading line can only take so much, so produce sits in the field heat.",
    measure: "We log every crate from picking to cooling — time picked, time it reached the cold — and probe pulp temperature. The pattern is usually clear within days: crates picked at 9 are still outside at 1, with pulp at 34 °C.",
    fix: "Picking crews start in waves timed to what the grading line can take, and crates go into a forced-air pre-cooler at the dock first. No new software is needed.",
    fixType: "process",
    result: "Crates are cooling within the hour they're picked.",
    typical: "Each hour of delay before cooling can cost up to a day of shelf life.",
    figure: {
      title: "Wait before cooling, by batch through the day",
      caption: "Hours each batch waited outside. Dashed line: one hour.",
      labels: hours(7, 10),
      before: [0.18, 0.3, 0.42, 0.55, 0.7, 0.82, 0.88, 0.8, 0.66, 0.5],
      after: [0.14, 0.18, 0.2, 0.17, 0.19, 0.21, 0.18, 0.2, 0.17, 0.15],
      limit: 0.25,
      limitLabel: "1 hour",
    },
    sources: [{ label: "Univ. of Kentucky, after the UC Davis Postharvest Technology Center: cooling delay and shelf life", href: "https://marketready.uky.edu/sites/default/files/2022-07/Shelf-life%20Extension%20and%20Quality_FieldDay2022.pdf" }],
  },
  {
    slug: "some-rows-drown-others-dry",
    industry: "agriculture",
    title: "Some rows drown, others dry",
    summary: "On long drip lines, the far ends get far less water than the heads.",
    problem: "Plants at the far end of each drip line are stressed while the near end is waterlogged. The farm adds more water to save the dry rows, which drowns the wet ones.",
    measure: "We walk the blocks with a pressure gauge and set catch cans under emitters along a row, measuring what each one actually delivers. Flow falls away along every line, with dips where emitters have clogged.",
    fix: "Pressure regulators at each block inlet, a flushing routine for the lines, and soil-moisture sensors in every zone so each one runs on its own schedule.",
    fixType: "hardware",
    result: "Every row gets about the same water, and each zone is watered by what its soil needs.",
    typical: "In a study of 329 fields, 45% of uneven watering came from pressure differences and 52% from clogging and wear.",
    figure: {
      title: "Water caught along one row",
      caption: "Each bar is one catch can, from the inlet (left) to the far end.",
      labels: ["Inlet", "", "", "", "", "", "", "", "", "Far end"],
      before: [1.0, 0.95, 0.9, 0.82, 0.76, 0.38, 0.66, 0.6, 0.3, 0.55],
      after: [0.95, 0.96, 0.94, 0.95, 0.93, 0.94, 0.95, 0.92, 0.94, 0.93],
      bad: (v) => v < 0.7,
    },
    sources: [
      { label: "Irrigation Association technical paper, citing an ITRC study of 329 fields", href: "https://www.irrigation.org/IA/FileUploads/IA/Resources/TechnicalPapers/2016/ReversingYieldLossbyManagingDistributionUniformity.pdf" },
      { label: "UC ANR: maintenance of micro-irrigation systems", href: "https://ucanr.edu/node/123435" },
    ],
  },
  {
    slug: "pumps-burning-power",
    industry: "agriculture",
    title: "Pumps burning power, not lifting water",
    summary: "The farm's pump sets run long hours, run hot, and the power bill keeps climbing.",
    problem: "Motors run 16 hours a day and still struggle to keep the reservoir full. Pumps were bought on horsepower or price, not on the flow and depth the farm actually needs.",
    measure: "A pump test on each set: a flow meter on the delivery, pressure gauges, and a clamp meter on the motor. Together they give overall efficiency — often below 30%.",
    fix: "Pumps selected from manufacturers' performance curves for the real flow and head of each well — the same problem our FlowMatch selector solves.",
    fixType: "software",
    result: "The same water with about 30% less energy, the saving measured in India's pump replacement pilots.",
    typical: "Farm pump sets typically run at 25–30% efficiency; efficient, well-matched sets reach 35–60%.",
    figure: {
      title: "Pump test: overall efficiency of three sets",
      caption: "Dashed line: 35%, the low end for an efficient set.",
      labels: ["Set 1", "Set 2", "Set 3"],
      before: [0.26, 0.28, 0.31],
      after: [0.55, 0.58, 0.6],
      limit: 0.35,
      limitLabel: "35%",
      bad: (v) => v < 0.35,
    },
    sources: [
      { label: "National Energy Efficient Agriculture Pumps Programme (Vikaspedia)", href: "https://en.vikaspedia.in/energy/policy-support/energy-efficiency/national-energy-efficient-agriculture-pumps-programme" },
      { label: "CSTEP: irrigation pump sets in Karnataka", href: "https://newsite.cstep.in/drupal/sites/default/files/2020-04/IPSets_GoK_ppt.pdf" },
    ],
  },
  {
    slug: "boxes-buried-in-the-yard",
    industry: "logistics",
    title: "Boxes buried in the yard",
    summary: "Containers sit for days, and getting one out means moving the ones stacked on top of it.",
    problem: "Trucks wait at the gate while the crane digs for the right container. Boxes are stacked in the order they arrive, so the one leaving today is often at the bottom.",
    measure: "We log every crane move for a week and classify it: a delivery, or a reshuffle to reach another box. In many yards most moves turn out to be reshuffles.",
    fix: "A yard view with each box's expected pickup date: new arrivals stacked by departure day, boxes on hold kept at the bottom.",
    fixType: "software",
    result: "More pickups take a single lift, and trucks spend less time at the gate.",
    typical: "One terminal study found up to 75% of container moves were unproductive. An operator using a similar view reported 12% fewer rehandles and 10% shorter dwell.",
    figure: {
      title: "Crane moves in one hour",
      caption: "Red: reshuffles to reach another box. Green: moves that delivered a box.",
      labels: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
      before: [0.5, 0.62, 0.46, 0.58, 0.66, 0.52, 0.48, 0.6, 0.55, 0.64, 0.5, 0.57],
      after: [0.5, 0.62, 0.46, 0.58, 0.66, 0.52, 0.48, 0.6, 0.55, 0.64, 0.5, 0.57],
      bad: (_, i, when) => (when === "before" ? [0, 1, 3, 4, 5, 7, 8, 9, 11] : [2, 7]).includes(i),
    },
    sources: [
      { label: "Toward reducing unproductive container moves (arXiv, 2026)", href: "https://arxiv.org/pdf/2604.06251" },
      { label: "Yard control tower case study (B EYE)", href: "https://b-eye.com/customer-stories/qlik-container-terminal/" },
    ],
  },
  {
    slug: "beds-free-up-too-late",
    industry: "healthcare",
    title: "Beds free up too late",
    summary: "Emergency patients wait for ward beds because most discharges happen late in the afternoon.",
    problem: "Ambulances queue at the emergency entrance and patients wait on trolleys for a ward bed. The beds exist — they just become free after 3 pm, while they're needed from mid-morning.",
    measure: "We chart a month of admissions and discharges by hour, and follow a few discharges from decision to departure to see where the hours go: medicines, paperwork, transport.",
    fix: "Discharges planned the day before, medicines and paperwork ready in the morning, and a discharge lounge where patients wait for their ride instead of in a bed.",
    fixType: "process",
    result: "Beds open when the emergency department needs them, and the ambulance queue clears.",
    typical: "One hospital raised before-noon discharges from 11% to 38%, and kept it there for 41 months. Simulations suggest earlier discharges cut emergency boarding, though one large study found no clear effect — results depend on the hospital.",
    figure: {
      title: "Discharges by hour, 7 am – 6 pm",
      caption: "Before: most beds free up after 3 pm. After: most before noon.",
      labels: hours(7, 12),
      before: [0.05, 0.08, 0.1, 0.14, 0.18, 0.22, 0.3, 0.55, 0.82, 0.95, 0.72, 0.4],
      after: [0.12, 0.42, 0.7, 0.82, 0.66, 0.48, 0.36, 0.3, 0.26, 0.2, 0.14, 0.08],
      bad: (_, i, when) => when === "before" && i >= 7,
    },
    sources: [
      { label: "BMC Health Services Research (2024): sustaining discharge before noon", href: "https://bmchealthservres.biomedcentral.com/counter/pdf/10.1186/s12913-024-10960-x.pdf" },
      { label: "Simulation of discharge timing and ED boarding (PubMed)", href: "https://pubmed.ncbi.nlm.nih.gov/20888163" },
    ],
  },
  {
    slug: "everyone-arrives-at-nine",
    industry: "healthcare",
    title: "Everyone arrives at 9",
    summary: "Outpatients arrive together first thing, so the registration hall overflows every morning.",
    problem: "The registration hall is packed by 9 am and nearly empty by 1 pm. Patients arrive early hoping to be seen first, and everyone waits longer as a result.",
    measure: "We count arrivals in 15-minute blocks and time each step — registration, waiting, consultation — to see which one actually limits the flow.",
    fix: "A forecast of arrivals sets staggered appointment slots for each doctor, with registration done online before the visit.",
    fixType: "data",
    result: "Arrivals spread across the morning. The doctors' slots matter as much as registration — online booking alone didn't cut waits at one large hospital.",
    typical: "At one tertiary hospital, registration took about 10 minutes at the counter and about 4 online.",
    figure: {
      title: "Arrivals per 15 minutes, 7 – 11 am",
      caption: "Dashed line: what registration can handle without a queue.",
      labels: ["7:00", "", "", "", "8:00", "", "", "", "9:00", "", "", "", "10:00", "", "", ""],
      before: [0.12, 0.24, 0.46, 0.78, 1.0, 0.96, 0.74, 0.5, 0.36, 0.3, 0.24, 0.2, 0.17, 0.14, 0.12, 0.1],
      after: [0.32, 0.4, 0.44, 0.48, 0.5, 0.5, 0.48, 0.46, 0.44, 0.42, 0.4, 0.38, 0.34, 0.3, 0.26, 0.22],
      limit: 0.62,
      limitLabel: "Capacity",
    },
    sources: [
      { label: "Online vs counter OPD registration at a tertiary hospital (Cureus, 2025)", href: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12063933/" },
      { label: "Online registration and waiting at PGI Chandigarh (Tribune)", href: "https://www.tribuneindia.com/news/archive/community/online-registration-fails-to-reduce-patient-rush-waiting-period-at-pgi-333944" },
    ],
  },
  {
    slug: "air-that-leaks-away",
    industry: "industry",
    title: "Paying for air that leaks away",
    summary: "The plant's compressors run around the clock, even when the lines are idle.",
    problem: "At night, with production stopped, the compressors still keep loading. Compressed air is one of the most expensive utilities in a plant, and leaks are rarely heard over the noise of a working floor.",
    measure: "We walk every line with an ultrasonic leak detector and tag each leak we hear, and log the air flow over 24 hours. The night-time flow is, roughly, the leakage.",
    fix: "The tagged leaks repaired, and a flow meter on the main header so new leaks show up early instead of a year later.",
    fixType: "hardware",
    result: "Leakage held under 10%, and one compressor can stay off at night.",
    typical: "Leaks typically waste 20–30% of compressor output in plants without a leak programme; a managed system holds them under 10%.",
    figure: {
      title: "Air flow over 24 hours",
      caption: "The night-time flow, with nothing running, is leakage. Dashed line: 10%.",
      labels: ["0", "", "", "", "", "", "6", "", "", "", "", "", "12", "", "", "", "", "", "18", "", "", "", "", ""],
      before: Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 18 ? 0.82 + 0.06 * Math.sin(h) : 0.34 + 0.02 * Math.sin(h * 2))),
      after: Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 18 ? 0.66 + 0.06 * Math.sin(h) : 0.07)),
      limit: 0.1,
      limitLabel: "10%",
      bad: (_, i, when) => when === "before" && (i < 7 || i > 18),
    },
    sources: [
      { label: "Compressed Air Challenge, via Fluid Power World", href: "https://www.fluidpowerworld.com/?p=140736" },
      { label: "US DOE / NREL: compressed air leak guidance", href: "https://nrel.gov/docs/fy01osti/28008.pdf" },
    ],
  },
  {
    slug: "a-bill-set-by-fifteen-minutes",
    industry: "industry",
    title: "A bill set by fifteen minutes",
    summary: "Every big machine starts at the start of the shift, and that one spike sets the month's demand charge.",
    problem: "The electricity bill carries an excess-demand charge even though daily energy use looks normal. Demand is billed on the highest short interval of the month — one bad start-up is enough.",
    measure: "A power logger on the main incomer, recording demand in 15-minute intervals for a few weeks. The spike usually lines up with one moment: every furnace and motor switching on at once.",
    fix: "Machines start one after another in a set order, and an alarm warns operators before demand reaches the contract limit.",
    fixType: "process",
    result: "The peak stays under contract demand, and the excess charge goes away.",
    typical: "Demand is billed on the highest 15- or 30-minute average; some Indian tariffs charge 50% extra on demand above the contract.",
    figure: {
      title: "Demand in 15-minute intervals, 5 – 9 am",
      caption: "Dashed line: the contract demand.",
      labels: ["5:00", "", "", "", "6:00", "", "", "", "7:00", "", "", "", "8:00", "", "", ""],
      before: [0.24, 0.24, 0.25, 0.26, 0.96, 0.92, 0.74, 0.66, 0.64, 0.63, 0.62, 0.62, 0.63, 0.62, 0.61, 0.62],
      after: [0.24, 0.24, 0.25, 0.26, 0.4, 0.52, 0.62, 0.68, 0.66, 0.64, 0.63, 0.62, 0.63, 0.62, 0.61, 0.62],
      limit: 0.78,
      limitLabel: "Contract",
    },
    sources: [
      { label: "KSEB EHT industrial tariff: excess demand charged 50% extra", href: "https://kseb.in/articledetail/eyJpdiI6IjE3MHVjdU5WWWhkTmRDWXdWMm5RUUE9PSIsInZhbHVlIjoiclNuK1B6d0U2S1BFWHVsMG9LYVlDZz09IiwibWFjIjoiMDM5MGU0ZjgxZmFiMGRkYzZhZjM0ZGZjMjdjNmU3ODBhNGUwMDZiMTYwYjcxMDdiOTM3MDBkNTU4NzllYjJkNiIsInRhZyI6IiJ9" },
      { label: "Mundra SEZ tariff schedule (GERC): maximum demand over 15/30 minutes", href: "https://bi-cd02.bimco.org/-/media/bimco/ships-ports-and-voyage-planning/countries/india/mundra/tariff_schedule_of_mupl_for_fy_2018_19.ashx" },
    ],
  },
];

export const getCase = (slug: string) => cases.find((c) => c.slug === slug) ?? null;

/** Two photographs for each case's card and header (credits in photos.ts). */
export const casePhotos: Record<string, [PhotoKey, PhotoKey]> = {
  "harvest-waiting-in-the-heat": ["harvestCarry", "mandiOnions"],
  "some-rows-drown-others-dry": ["sprinklers", "fieldsGrid"],
  "pumps-burning-power": ["pumpOutlet", "pumpEngine"],
  "boxes-buried-in-the-yard": ["yardAerial", "portShip"],
  "beds-free-up-too-late": ["wardBeds", "nurseComputer"],
  "everyone-arrives-at-nine": ["waitingHall", "waitingPeople"],
  "air-that-leaks-away": ["pipesBlue", "pumpsGauges"],
  "a-bill-set-by-fifteen-minutes": ["substation", "plantAerial"],
};

export const industryPhotos: Record<Industry, [PhotoKey, PhotoKey]> = {
  agriculture: ["harvestWoman", "paddyPlanting"],
  logistics: ["truckIndia", "warehouseUnload"],
  healthcare: ["nurseDesk", "hospitalCrowd"],
  industry: ["workersHelmet", "lathe"],
};
