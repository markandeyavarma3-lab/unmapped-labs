import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name} — research-first problem solving`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const grid = "linear-gradient(rgba(91,143,214,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(91,143,214,0.14) 1px, transparent 1px)";

/** The share card: navy survey grid, the mark, the headline in white and yellow. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a1626", backgroundImage: grid, backgroundSize: "60px 60px", padding: 80 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
              <path d="M7.5 3V26a16.5 16.5 0 0 0 33 0V3" stroke="#eef2f6" strokeWidth="5" />
              <path d="M15.5 3V26a8.5 8.5 0 0 0 17 0V3" stroke="#eef2f6" strokeWidth="5" />
              <circle cx="24" cy="26" r="3.6" fill="#f2c230" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#eef2f6", letterSpacing: -2, lineHeight: 1 }}>
                unmapped<span style={{ color: "#8a9bb0", marginLeft: 10, fontWeight: 400 }}>labs</span>
              </div>
              <div style={{ display: "flex", fontSize: 15, color: "#8a9bb0", letterSpacing: 4 }}>MAPPING THE UNKNOWN</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#f2c230", letterSpacing: 3 }}>OPERATIONS RESEARCH · INDIA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, lineHeight: 1, color: "#eef2f6", letterSpacing: -4 }}>
          <div style={{ display: "flex" }}>See how it really runs.</div>
          <div style={{ display: "flex", color: "#f2c230" }}>Then fix what&apos;s broken.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", width: 34, height: 34, border: `2px solid ${i === 1 ? "#f2c230" : "#8a9bb0"}` }} />
              {i < 3 && <div style={{ display: "flex", width: 120, height: 2, background: "#2e4b72" }} />}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
