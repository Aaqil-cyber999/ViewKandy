import { ImageResponse } from "next/og";

export const alt =
  "KandyVerse — an immersive 3D tourism and smart-city guide for Kandy, Sri Lanka";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #07111f 0%, #0b1728 55%, #102b45 100%)",
          padding: "72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-120px",
            top: "-140px",
            width: "560px",
            height: "560px",
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(56,189,248,0.28) 0%, rgba(56,189,248,0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              border: "2px solid rgba(56,189,248,0.4)",
              background: "rgba(56,189,248,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38bdf8",
              fontSize: "44px",
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: "30px", letterSpacing: "6px", color: "#f8fafc", fontWeight: 700 }}>
              KANDY<span style={{ color: "#38bdf8" }}>VERSE</span>
            </div>
            <div style={{ display: "flex", fontSize: "15px", letterSpacing: "5px", color: "#64748b", marginTop: "6px" }}>
              BEYOND THE MAP
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "76px",
              lineHeight: 1.05,
              color: "#f8fafc",
              fontWeight: 700,
              maxWidth: "900px",
              letterSpacing: "-2px",
            }}
          >
            Explore Kandy in three dimensions.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#94a3b8",
              marginTop: "26px",
              maxWidth: "820px",
              lineHeight: 1.4,
            }}
          >
            Real places, honest data, realistic itineraries. 3D city explorer,
            trip planner and a grounded AI guide for Kandy, Sri Lanka.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "20px", color: "#64748b" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "9999px", background: "#34d399" }} />
          7.2906° N, 80.6337° E
          <div style={{ width: "4px", height: "4px", borderRadius: "9999px", background: "#334155" }} />
          kandyverse · Sri Lanka
        </div>
      </div>
    ),
    size,
  );
}
