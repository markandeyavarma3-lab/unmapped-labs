/**
 * Central site configuration. Everything that identifies the brand, the
 * domain or a contact channel lives here so it can change in one place.
 */

export const site = {
  name: "Unmapped Labs",
  tagline: "Mapping the unknown.",
  statement: "We explore what hasn't been mapped.",
  description:
    "Unmapped Labs is an independent exploration initiative studying real-world systems — agriculture, logistics, healthcare, energy and beyond — to uncover overlooked problems and discover what could work better.",
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
  { id: "focus", label: "Focus Areas" },
  { id: "about", label: "About" },
] as const;

export type NavId = (typeof nav)[number]["id"] | "contact";
