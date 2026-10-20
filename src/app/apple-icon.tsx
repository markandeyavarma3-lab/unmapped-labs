import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1626" }}>
        <svg width="116" height="116" viewBox="0 0 48 48" fill="none">
          <path d="M7.5 3V26a16.5 16.5 0 0 0 33 0V3" stroke="#eef2f6" strokeWidth="5" />
          <path d="M15.5 3V26a8.5 8.5 0 0 0 17 0V3" stroke="#eef2f6" strokeWidth="5" />
          <circle cx="24" cy="26" r="3.6" fill="#f2c230" />
        </svg>
      </div>
    ),
    size,
  );
}
