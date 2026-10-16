/**
 * Central site configuration. Everything that identifies the brand, the
 * domain or a contact channel lives here so it can change in one place.
 */

export const site = {
  name: "Unmapped Labs",
  tagline: "Mapping the unknown.",
  statement: "We explore what hasn't been mapped.",
  description:
    "Unmapped Labs is a research-first problem-solving startup in India. We study how your operation actually runs — farms, warehouses and yards, hospitals, plants — find the real cause of what's slowing it down, and build the fix: software, hardware, process or data.",
  /** Search title: what we are, in the words people search with. */
  seoTitle: "Unmapped Labs — Operations Research & Problem-Solving Startup, India",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.unmappedlabs.in").replace(/\/$/, ""),
  email: "contact@unmappedlabs.in",
  closingLine: "There is always more to map.",
} as const;

/**
 * Social profiles. Leave a URL empty and the link is not rendered anywhere —
 * never point visitors at an account that doesn't exist.
 */
export const socials: { label: string; href: string }[] = [
  { label: "LinkedIn", href: "" },
  { label: "X", href: "" },
].filter((s) => s.href.length > 0);

export const nav = [
  { id: "approach", label: "Approach" },
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "engage", label: "How we engage" },
  { id: "focus", label: "Focus Areas" },
  { id: "about", label: "About" },
] as const;

export type NavId = (typeof nav)[number]["id"] | "contact";
