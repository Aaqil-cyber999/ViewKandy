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
          background: "linear-gradient(135deg, #e9f3e4 0%, #f7fbf4 55%, #d7eed7 100%)",
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
            background:
              "radial-gradient(circle, rgba(31,138,76,0.2) 0%, rgba(31,138,76,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-160px",
            bottom: "-180px",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              border: "2px solid rgba(31,138,76,0.35)",
              background: "rgba(31,138,76,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#14663a",
              fontSize: "44px",
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: "30px",
                letterSpacing: "6px",
                color: "#122a1a",
                fontWeight: 700,
              }}
            >
              KANDY<span style={{ color: "#1f8a4c" }}>VERSE</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "15px",
                letterSpacing: "5px",
                color: "#46604e",
                marginTop: "6px",
              }}
            >
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
              color: "#122a1a",
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
              color: "#46604e",
              marginTop: "26px",
              maxWidth: "820px",
              lineHeight: 1.4,
            }}
          >
            Real places, honest data, realistic itineraries. 3D city explorer,
            trip planner and a grounded AI guide for Kandy, Sri Lanka.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "20px",
            color: "#46604e",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "9999px",
              background: "#1f8a4c",
            }}
          />
          7.2906° N, 80.6337° E
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "9999px",
              background: "#7aa884",
            }}
          />
          kandyverse · Sri Lanka
        </div>
      </div>
    ),
    size,
  );
}
