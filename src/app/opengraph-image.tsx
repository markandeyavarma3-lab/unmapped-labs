import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/config/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const terrain = await readFile(join(process.cwd(), "public", "terrain-fallback.svg"));
const terrainSrc = `data:image/svg+xml;base64,${terrain.toString("base64")}`;

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#080b0e", position: "relative" }}>
        <img src={terrainSrc} width={1200} height={675} alt="" style={{ position: "absolute", top: -20, left: 180, opacity: 0.9 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(8,11,14,0.97) 0%, rgba(8,11,14,0.75) 50%, rgba(8,11,14,0.1) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="52" height="52" viewBox="0 0 33 33" fill="none">
              <path d="M21 3H3V30H30V12" stroke="#f2f1eb" strokeWidth="1.7" />
              <path d="M12 3V30M21 12V30M3 12H21M3 21H30" stroke="#f2f1eb" strokeOpacity="0.5" strokeWidth="1.7" />
              <path d="M12 21L21 12L26.6 6.4" stroke="#65e4e8" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="28.4" cy="4.6" r="2.3" fill="#65e4e8" />
            </svg>
            <div style={{ display: "flex", fontSize: 34, color: "#f2f1eb", letterSpacing: -1 }}>
              Unmapped<span style={{ color: "#a0aab5", marginLeft: 10 }}>Labs</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ fontSize: 84, lineHeight: 1, color: "#f2f1eb", letterSpacing: -4, maxWidth: 760 }}>
              Explore what hasn&apos;t been mapped.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: "#a0aab5", letterSpacing: 3, textTransform: "uppercase" }}>
              <div style={{ width: 14, height: 14, background: "#c7f36b" }} />
              {site.tagline}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
