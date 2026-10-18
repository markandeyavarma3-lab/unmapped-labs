import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name} — research-first problem solving`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The share card: paper, the mark, and the headline. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f6f5f0", padding: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="52" height="52" viewBox="0 0 33 33" fill="none">
            <path d="M21 3H3V30H30V12" stroke="#14171a" strokeWidth="1.7" />
            <path d="M12 3V30M21 12V30M3 12H21M3 21H30" stroke="#14171a" strokeOpacity="0.5" strokeWidth="1.7" />
            <path d="M12 21L21 12L26.6 6.4" stroke="#0d5c57" strokeWidth="1.9" strokeLinecap="round" />
            <circle cx="28.4" cy="4.6" r="2.3" fill="#0d5c57" />
          </svg>
          <div style={{ display: "flex", fontSize: 34, color: "#14171a", letterSpacing: -1 }}>
            Unmapped<span style={{ color: "#454b52", marginLeft: 10 }}>Labs</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 80, lineHeight: 1.05, color: "#14171a", letterSpacing: -2, maxWidth: 900 }}>See how it really runs. Then fix what&apos;s broken.</div>
          <div style={{ display: "flex", fontSize: 26, color: "#454b52" }}>Operations research &amp; problem solving · India</div>
        </div>
        <div style={{ display: "flex", height: 6, width: 160, background: "#0d5c57" }} />
      </div>
    ),
    size,
  );
}
