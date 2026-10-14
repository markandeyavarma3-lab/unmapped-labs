import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#080b0e" }}>
        <svg width="112" height="112" viewBox="0 0 33 33" fill="none">
          <path d="M21 3H3V30H30V12" stroke="#f2f1eb" strokeWidth="1.9" />
          <path d="M12 3V30M21 12V30M3 12H21M3 21H30" stroke="#f2f1eb" strokeOpacity="0.5" strokeWidth="1.9" />
          <path d="M12 21L21 12L26.6 6.4" stroke="#65e4e8" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="28.4" cy="4.6" r="2.4" fill="#65e4e8" />
        </svg>
      </div>
    ),
    size,
  );
}
