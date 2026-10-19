/**
 * Scenarios for the bottleneck simulator. Each is four steps in a row; one of
 * them can't keep up. Times are in simulated minutes (one item arrives about
 * every minute); `scale` turns them into the real-world minutes we display.
 *
 * Capacity of a step = servers / service time. Arrival rate is 1 per minute,
 * so the slow step (1 server, 1.4 min) runs at 140% of what it can handle —
 * its queue grows without limit until something changes.
 */
export type Entity = "truck" | "person" | "crate" | "part";
export type FixId = "capacity" | "speed" | "smooth";

export type Step = { name: string; short: string; servers: number; service: number };

export type Scenario = {
  id: string;
  tab: string;
  entity: Entity;
  unit: string;
  scale: number;
  slow: number;
  steps: Step[];
  fixes: Record<FixId, { label: string; kind: string }>;
};

export const ARRIVAL_MEAN = 1;

export const scenarios: Scenario[] = [
  {
    id: "yard",
    tab: "Container yard",
    entity: "truck",
    unit: "trucks",
    scale: 2,
    slow: 1,
    steps: [
      { name: "Gate check", short: "Gate", servers: 2, service: 1.2 },
      { name: "Weighbridge", short: "Weigh", servers: 1, service: 1.4 },
      { name: "Crane & unload", short: "Unload", servers: 2, service: 1.3 },
      { name: "Exit gate", short: "Exit", servers: 1, service: 0.6 },
    ],
    fixes: {
      capacity: { label: "Add a second weighbridge", kind: "Hardware" },
      speed: { label: "Pre-register trucks online", kind: "Software" },
      smooth: { label: "Book arrival slots", kind: "Process" },
    },
  },
  {
    id: "hospital",
    tab: "Hospital OPD",
    entity: "person",
    unit: "patients",
    scale: 1.5,
    slow: 0,
    steps: [
      { name: "Registration", short: "Register", servers: 1, service: 1.4 },
      { name: "Triage", short: "Triage", servers: 2, service: 1.2 },
      { name: "Doctor", short: "Doctor", servers: 3, service: 2.3 },
      { name: "Pharmacy", short: "Pharmacy", servers: 1, service: 0.65 },
    ],
    fixes: {
      capacity: { label: "Open a second counter", kind: "People" },
      speed: { label: "Online pre-registration", kind: "Software" },
      smooth: { label: "Stagger appointment times", kind: "Process" },
    },
  },
  {
    id: "mandi",
    tab: "Packhouse",
    entity: "crate",
    unit: "crates",
    scale: 1,
    slow: 1,
    steps: [
      { name: "Unloading", short: "Unload", servers: 2, service: 1.2 },
      { name: "Grading", short: "Grade", servers: 1, service: 1.4 },
      { name: "Weighing", short: "Weigh", servers: 1, service: 0.6 },
      { name: "Pre-cooling", short: "Cool", servers: 2, service: 1.1 },
    ],
    fixes: {
      capacity: { label: "Add a grading table", kind: "Hardware" },
      speed: { label: "Sort in the field first", kind: "Process" },
      smooth: { label: "Pick in timed waves", kind: "Process" },
    },
  },
  {
    id: "factory",
    tab: "Factory line",
    entity: "part",
    unit: "parts",
    scale: 1,
    slow: 2,
    steps: [
      { name: "Cutting", short: "Cut", servers: 1, service: 0.7 },
      { name: "Welding", short: "Weld", servers: 2, service: 1.3 },
      { name: "Painting", short: "Paint", servers: 1, service: 1.4 },
      { name: "Packing", short: "Pack", servers: 1, service: 0.65 },
    ],
    fixes: {
      capacity: { label: "Add a paint booth", kind: "Hardware" },
      speed: { label: "Faster colour changeovers", kind: "Process" },
      smooth: { label: "Level the daily schedule", kind: "Data" },
    },
  },
];

/** How hard the slow step is working, given the fixes switched on. */
export function load(s: Scenario, fixes: Record<FixId, boolean>) {
  const st = s.steps[s.slow];
  const servers = st.servers + (fixes.capacity ? 1 : 0);
  const service = st.service * (fixes.speed ? 0.55 : 1);
  return service / ARRIVAL_MEAN / servers;
}

export function verdict(s: Scenario, fixes: Record<FixId, boolean>) {
  const rho = load(s, fixes);
  const name = s.steps[s.slow].name.toLowerCase();
  if (rho > 1)
    return fixes.smooth
      ? `Smoother arrivals don't help yet: ${name} still needs ${Math.round((rho - 1) * 100)}% more capacity than it has. Fix the capacity first.`
      : `${s.steps[s.slow].name} gets ${Math.round(rho * 100)}% of the work it can handle. The queue will keep growing until that changes.`;
  if (rho > 0.85) return `${s.steps[s.slow].name} keeps up now — just. Small surges still cause long waits${fixes.smooth ? "." : "; smoothing arrivals would help."}`;
  return `Flowing. ${s.steps[s.slow].name} runs at ${Math.round(rho * 100)}% of its capacity, so surges clear quickly.`;
}
