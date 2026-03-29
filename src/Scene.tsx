import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface SceneProps {
  title?: string;
  accent?: string;
}

const bulletLines = [
  "Orchestrate render requests from any API.",
  "Scale up a visual factory that uses your own assets.",
  "Stream results to your existing S3-compatible bucket.",
];

export const AnimatedScene: React.FC<SceneProps> = ({
  title = "Dark Factory Render",
  accent = "#5ef1ff",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = interpolate(frame % (fps * 2), [0, fps, fps * 2], [0.3, 1, 0.3], {
    extrapolateRight: "clamp",
  });
  const progress = interpolate(frame, [0, fps * 3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(94,241,255,0.3), transparent 40%), #050c1d",
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "5% 5%",
          borderRadius: 32,
          border: `1px solid rgba(255,255,255,0.08)`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 40px 120px rgba(0,0,0,${0.35 + pulse * 0.2})`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
        }}
      >
        <div>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              background: `radial-gradient(circle, ${accent}, transparent 70%)`,
              opacity: 0.9,
              boxShadow: `0 0 ${40 + pulse * 40}px ${accent}`,
            }}
          />
          <h1
            style={{
              fontSize: 64,
              margin: "1.5rem 0 0.5rem",
              letterSpacing: 0.3,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 20,
              maxWidth: 620,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            Programmatic render loops let you orchestrate storyboards, fetch
            real data, and hand the final MP4 directly to the storage system
            you already own.
          </p>
        </div>

        <div>
          {bulletLines.map((line) => (
            <p
              key={line}
              style={{
                margin: "0.3rem 0",
                color: "rgba(255,255,255,0.7)",
                fontSize: 22,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  background: accent,
                  borderRadius: 999,
                  marginRight: 10,
                }}
              />
              {line}
            </p>
          ))}

          <div
            style={{
              marginTop: "1rem",
              width: "100%",
              height: 14,
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(progress * 100, 100)}%`,
                borderRadius: 999,
                background: accent,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p
            style={{
              marginTop: "0.4rem",
              fontSize: 18,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {`${Math.round(progress * 100)}% ready for dispatch`}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
