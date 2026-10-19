import { ViewTransition } from "react";

/**
 * Every page's <main>. Wrapped in a view transition so moving between pages
 * fades the old one out and lifts the new one in (the header stays put).
 */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <main id="main" tabIndex={-1} className={className}>
        {children}
      </main>
    </ViewTransition>
  );
}
