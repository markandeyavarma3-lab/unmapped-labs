import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/** Typography for Field Notes. Styling lives in `.prose-note` (globals.css). */
const components: MDXComponents = {
  a: ({ href = "", ...props }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href} {...props} />
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
    ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
