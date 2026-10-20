"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * Measurement: every click that leads to a conversation (the booking link,
 * a link to /contact or a mailto), and where on the site it came from.
 */
export function TrackClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, location.href);
      const from = a.closest("header") ? "header" : a.closest("footer") ? "footer" : `${location.pathname}${a.closest("section[id]") ? `#${a.closest("section[id]")!.id}` : ""}`;
      if (url.origin === location.origin && url.pathname === "/book") track("booking_click", { from });
      else if (url.origin === location.origin && url.pathname === "/contact") track("contact_cta_click", { from });
      else if (url.protocol === "mailto:") track("email_click", { from });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
