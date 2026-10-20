import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#070707" }}>
        <svg width="116" height="116" viewBox="0 0 48 48" fill="none">
          <path d="M6 4V25a18 18 0 0 0 36 0V4" stroke="#eef2f6" strokeWidth="4.8" strokeLinecap="round" />
          <path d="M15 13V25a9 9 0 0 0 18 0V13" stroke="#eef2f6" strokeWidth="4.8" strokeLinecap="round" />
          <circle cx="24" cy="25" r="3.8" fill="#f2c230" />
        </svg>
      </div>
    ),
    size,
  );
}
