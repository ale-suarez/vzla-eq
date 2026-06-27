import { ImageResponse } from "next/og";

// Favicon: the flag of Venezuela (yellow / blue / red horizontal bands).
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, background: "#FCD116" }} />
        <div style={{ flex: 1, background: "#00247D" }} />
        <div style={{ flex: 1, background: "#CF142B" }} />
      </div>
    ),
    {
      ...size,
    }
  );
}
