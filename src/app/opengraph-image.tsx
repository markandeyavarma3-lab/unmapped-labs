import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name} — research-first problem solving`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const grid = "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)";

/** The share card: navy survey grid, the mark, the headline in white and yellow. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#070707", backgroundImage: grid, backgroundSize: "60px 60px", padding: 80 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
              <path d="M6 4V25a18 18 0 0 0 36 0V4" stroke="#f4f4f0" strokeWidth="4.8" strokeLinecap="round" />
              <path d="M15 13V25a9 9 0 0 0 18 0V13" stroke="#f4f4f0" strokeWidth="4.8" strokeLinecap="round" />
              <circle cx="24" cy="25" r="3.8" fill="#f2c230" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#f4f4f0", letterSpacing: 7, lineHeight: 1 }}>UNMAPPED LABS</div>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 500, color: "#8a8a84", letterSpacing: 4.5 }}>MAPPING THE UNKNOWN</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#f2c230", letterSpacing: 3 }}>OPERATIONS RESEARCH · INDIA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, lineHeight: 1, color: "#f4f4f0", letterSpacing: -4 }}>
          <div style={{ display: "flex" }}>See how it really runs.</div>
          <div style={{ display: "flex", color: "#b5b5af" }}>Then fix what&apos;s broken.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", width: 34, height: 34, border: `2px solid ${i === 1 ? "#f2c230" : "#8a8a84"}` }} />
              {i < 3 && <div style={{ display: "flex", width: 120, height: 2, background: "#3a3a3a" }} />}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
