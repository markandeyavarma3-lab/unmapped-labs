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

export const notes = {
  label: "04 — Field notes",
  heading: "Notes from the unmapped.",
  intro:
    "Observations, questions, and ideas gathered while exploring the systems that shape how things work.",
  empty: {
    title: "The first notes are still in the field.",
    body: "Nothing here is invented. When we publish, it will be something we actually saw, asked, or learned — and it will appear right here.",
  },
};

export const principles = {
  label: "05 — Philosophy",
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
  label: "06 — About",
  heading: "Curiosity with a practical purpose.",
  body: [
    "Unmapped Labs is an exploration-driven initiative focused on understanding industries, investigating real-world challenges, and discovering opportunities for better solutions.",
    "The approach begins with curiosity and firsthand learning. By studying how people, processes, and systems work together, Unmapped Labs aims to identify meaningful problems before deciding how to address them.",
    "The objective is not to build something merely because it can be built. It is to understand what is worth improving and determine what might genuinely help.",
  ],
  pullQuote: "Understand what exists. Discover what is missing.",
};

export const contact = {
  label: "07 — Contact",
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
