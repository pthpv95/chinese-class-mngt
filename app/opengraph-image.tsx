import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "汉语学习 · Chinese Learning"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)",
          fontFamily: "serif",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 24,
            background: "#e11d48",
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 72, color: "#ffffff", lineHeight: 1 }}>汉</span>
        </div>

        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            color: "#881337",
            letterSpacing: "-1px",
            marginBottom: 12,
          }}
        >
          汉语学习
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#9f1239",
            letterSpacing: "0.05em",
            marginBottom: 32,
          }}
        >
          Chinese Learning
        </div>

        <div
          style={{
            fontSize: 20,
            color: "#be123c",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Practice with your teacher — listen, speak, and master Chinese.
        </div>
      </div>
    ),
    size,
  )
}
