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
            <svg width="52" height="52" viewBox="0 0 33 33" fill="none">
              <path d="M21 3H3V30H30V12" stroke="#eef2f6" strokeWidth="1.7" />
              <path d="M12 3V30M21 12V30M3 12H21M3 21H30" stroke="#eef2f6" strokeOpacity="0.5" strokeWidth="1.7" />
              <path d="M12 21L21 12L26.6 6.4" stroke="#f2c230" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="28.4" cy="4.6" r="2.3" fill="#f2c230" />
            </svg>
            <div style={{ display: "flex", fontSize: 34, color: "#eef2f6", letterSpacing: -1 }}>
              Unmapped<span style={{ color: "#8a9bb0", marginLeft: 10 }}>Labs</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#f2c230", letterSpacing: 3 }}>[ OPERATIONS RESEARCH · INDIA ]</div>
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
