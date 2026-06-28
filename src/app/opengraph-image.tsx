import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MM Properties Davao Real Estate";
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
          alignItems: "center",
          background: "linear-gradient(135deg, #071225 0%, #0b1f3f 62%, #102a52 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 78,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "white",
            borderRadius: 42,
            boxShadow: "0 28px 80px rgba(0,0,0,.35)",
            display: "flex",
            gap: 56,
            height: 474,
            padding: 56,
            width: 1032,
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#071225",
              borderRadius: 999,
              display: "flex",
              height: 180,
              justifyContent: "center",
              width: 180,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "white",
                borderRadius: 999,
                display: "flex",
                flexDirection: "column",
                height: 150,
                justifyContent: "center",
                width: 150,
              }}
            >
              <div style={{ color: "#071225", fontSize: 44, fontWeight: 900, lineHeight: 1 }}>MM</div>
              <div style={{ color: "#0b1f3f", fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>PROPERTIES</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ color: "#071225", fontSize: 72, fontWeight: 900, lineHeight: 1 }}>MM Properties</div>
            <div style={{ color: "#f0b91f", fontSize: 58, fontWeight: 900, lineHeight: 1 }}>Davao Real Estate</div>
            <div style={{ color: "#334155", fontSize: 30, fontWeight: 700, marginTop: 16 }}>
              Homes • Lots • Condos • Commercial Properties
            </div>
            <div
              style={{
                alignItems: "center",
                background: "#071225",
                borderRadius: 999,
                color: "white",
                display: "flex",
                fontSize: 26,
                fontWeight: 800,
                height: 62,
                justifyContent: "center",
                marginTop: 22,
                width: 560,
              }}
            >
              Davao-focused property search
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
