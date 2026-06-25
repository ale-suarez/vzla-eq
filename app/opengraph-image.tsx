import { ImageResponse } from "next/og";

export const alt = "Evaluación Estructural de Emergencia para Venezuela";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f9ff",
          color: "#132238",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 36,
              background: "#dbe7ff",
              color: "#2457d6",
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            E
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>Evaluación Estructural</div>
            <div style={{ fontSize: 22, color: "#5f6f87" }}>Venezuela · Respuesta al sismo</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          <div style={{ maxWidth: 880, fontSize: 76, lineHeight: 1, fontWeight: 900, letterSpacing: 0 }}>
            ¿Es segura su estructura?
          </div>
          <div style={{ maxWidth: 760, fontSize: 32, lineHeight: 1.3, color: "#42526b" }}>
            Suba fotos y reciba una evaluación orientativa de daños estructurales con IA.
          </div>
        </div>

        <div style={{ display: "flex", gap: "18px", fontSize: 24, fontWeight: 700, color: "#2457d6" }}>
          <div style={{ padding: "14px 22px", borderRadius: 18, background: "#dbe7ff" }}>Foto</div>
          <div style={{ padding: "14px 22px", borderRadius: 18, background: "#e3f5ec" }}>Análisis</div>
          <div style={{ padding: "14px 22px", borderRadius: 18, background: "#fff0cf" }}>Recomendaciones</div>
        </div>
      </div>
    ),
    size
  );
}
