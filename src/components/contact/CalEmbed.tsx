"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { site } from "@/config/site";

type CalApi = ((...args: unknown[]) => void) & { ns?: Record<string, (...args: unknown[]) => void>; loaded?: boolean; q?: unknown[] };
declare global {
  interface Window {
    Cal?: CalApi;
  }
}

const NS = "free-call";

/**
 * Cal.com's official loader (from @calcom/embed-snippet): queues calls until
 * https://app.cal.com/embed/embed.js has loaded.
 */
function loadCal() {
  (function (i: Window & typeof globalThis, p: string, d: string) {
    const t = function (e: { q: unknown[] }, n: unknown) {
      e.q.push(n);
    };
    const c = i.document;
    i.Cal =
      i.Cal ||
      (function (this: unknown, ...n: unknown[]) {
        const e = i.Cal!;
        if (!e.loaded) {
          e.ns = {};
          e.q = e.q || [];
          c.head.appendChild(c.createElement("script")).src = p;
          e.loaded = true;
        }
        if (n[0] === d) {
          const s = function (...args: unknown[]) {
            t(s as unknown as { q: unknown[] }, args);
          } as unknown as CalApi & { q: unknown[] };
          const a = n[1];
          s.q = s.q || [];
          if (typeof a === "string") {
            e.ns![a] = e.ns![a] || s;
            t(e.ns![a] as unknown as { q: unknown[] }, n);
            t(e as unknown as { q: unknown[] }, ["initNamespace", a]);
          } else t(e as unknown as { q: unknown[] }, n);
          return;
        }
        t(e as unknown as { q: unknown[] }, n);
      } as CalApi);
  })(window, "https://app.cal.com/embed/embed.js", "init");
  return window.Cal!;
}

/** The booking calendar, embedded inline and themed to the site. */
export function CalEmbed() {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const Cal = loadCal();
    Cal("init", NS, { origin: "https://app.cal.com" });
    const ns = Cal.ns![NS];
    ns("inline", { elementOrSelector: `#${box.current!.id}`, calLink: site.calLink, config: { layout: "month_view", theme: "dark" } });
    ns("ui", { theme: "dark", hideEventTypeDetails: false, layout: "month_view", cssVarsPerTheme: { dark: { "cal-brand": "#f2c230", "cal-brand-emphasis": "#f6d061", "cal-brand-text": "#0a1626" } } });
    ns("on", { action: "linkReady", callback: () => setReady(true) });
    ns("on", { action: "bookingSuccessfulV2", callback: () => track("booking_made") });
  }, []);

  const direct = `https://cal.com/${site.calLink}`;
  return (
    <div>
      <div className="card relative min-h-[34rem] overflow-hidden">
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center text-[15px] text-[color:var(--color-fg-3)]" aria-live="polite">
            Loading the calendar…
          </p>
        )}
        <div id="cal-inline" ref={box} className="relative h-full w-full overflow-auto" />
      </div>
      <p className="mt-4 text-[14px] text-[color:var(--color-fg-3)]">
        Calendar not showing?{" "}
        <a href={direct} target="_blank" rel="noopener noreferrer" className="link">
          Open the booking page
        </a>{" "}
        or email{" "}
        <a href={`mailto:${site.email}`} className="link">
          {site.email}
        </a>
        .
      </p>
    </div>
  );
}
