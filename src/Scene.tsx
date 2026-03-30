import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getDurationFromSegments, getSegmentFrames, type SceneProps } from "./segmentTiming";

const RAIDGUILD_LOGO_URL = "https://www.raidguild.org/images/logo-RG-moloch-800.svg";
const RAIDGUILD_HERO_URL = "https://www.raidguild.org/images/home-image-1-c.webp";

const brand = {
  moloch500: "#bd482d",
  moloch800: "#29100a",
  scroll100: "#f9f7e7",
  scroll150: "#f3eeca",
  scroll200: "#ece5ac",
  scroll700: "#534a13",
};

const splitTitle = (title: string): { primary: string; secondary: string | null } => {
  const separators = [" — ", " – ", " - "];

  for (const separator of separators) {
    if (title.includes(separator)) {
      const [primary, ...rest] = title.split(separator);
      return {
        primary: primary.trim(),
        secondary: rest.join(separator).trim() || null,
      };
    }
  }

  return {
    primary: title,
    secondary: null,
  };
};

export const AnimatedScene: React.FC<SceneProps> = ({
  title = "Raid Guild Daily Brief",
  accent = brand.moloch500,
  segments = [],
  waveform = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const effectiveDuration = Math.max(durationInFrames, getDurationFromSegments(segments, fps));
  const progress = interpolate(frame, [0, effectiveDuration], [0, 1], {
    extrapolateRight: "clamp",
  });
  const pulse = interpolate(frame % (fps * 2), [0, fps, fps * 2], [0.92, 1.08, 0.92], {
    extrapolateRight: "clamp",
  });

  const waveformBars = waveform.length > 0 ? waveform : Array.from({ length: 72 }, () => 0.18);
  let runningFrame = 0;
  const timeline = segments.map((segment, index) => {
    const segmentFrames = getSegmentFrames(segment.durationMs, fps);
    const startFrame = runningFrame;
    const endFrame = startFrame + segmentFrames;
    runningFrame = endFrame;

    return {
      ...segment,
      index,
      segmentFrames,
      startFrame,
      endFrame,
    };
  });

  const activeSegment =
    timeline.find((segment) => frame >= segment.startFrame && frame < segment.endFrame) ?? null;
  const activeWaveformIndex = Math.min(
    waveformBars.length - 1,
    Math.max(0, Math.floor(progress * waveformBars.length)),
  );
  const { primary, secondary } = splitTitle(title);

  return (
    <AbsoluteFill
      style={{
        background: brand.scroll100,
        color: brand.moloch800,
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflow: "hidden",
      }}
    >
      {timeline.map((segment) => (
        <Sequence
          key={`${segment.speaker}-${segment.startFrame}`}
          durationInFrames={segment.segmentFrames}
          from={segment.startFrame}
        >
          <Audio src={segment.url} />
        </Sequence>
      ))}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(135deg, #f9f7e7 0%, #f3eeca 56%, #ece5ac 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(41,16,10,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(41,16,10,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.24,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 20,
          background: brand.moloch500,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "5% 4%",
          border: `3px solid ${brand.moloch800}`,
          borderRadius: 28,
          background: "rgba(249,247,231,0.82)",
          boxShadow: "0 24px 80px rgba(41,16,10,0.12)",
          padding: "2.5rem 2.6rem 2.2rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <Img
                src={RAIDGUILD_LOGO_URL}
                style={{
                  width: 250,
                  height: "auto",
                }}
              />

              <div
                style={{
                  border: `2px solid ${brand.moloch800}`,
                  padding: "0.45rem 0.8rem",
                  fontSize: 18,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontFamily: "'Courier New', monospace",
                  background: "rgba(249,247,231,0.95)",
                  whiteSpace: "nowrap",
                }}
              >
                Dispatch {`${Math.round(progress * 100)}%`}
              </div>
            </div>

            <div
              style={{
                marginTop: 26,
                fontSize: 17,
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(41,16,10,0.68)",
              }}
            >
              Daily Brief
            </div>

            <h1
              style={{
                fontSize: secondary ? 68 : 76,
                lineHeight: 0.98,
                margin: "0.5rem 0 0",
                maxWidth: 760,
              }}
            >
              {primary}
            </h1>

            {secondary ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 34,
                  lineHeight: 1.1,
                  color: brand.moloch500,
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {secondary}
              </div>
            ) : null}

            <p
              style={{
                marginTop: 22,
                maxWidth: 660,
                fontSize: 25,
                lineHeight: 1.3,
                color: "rgba(41,16,10,0.78)",
              }}
            >
              Mercenary intel for the guild, delivered as a clean daily audio dispatch.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              minHeight: 360,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "2% 8% 6% 10%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(189,72,45,0.16) 0%, rgba(189,72,45,0.08) 45%, transparent 72%)",
                transform: `scale(${pulse})`,
              }}
            />
            <Img
              src={RAIDGUILD_HERO_URL}
              style={{
                position: "absolute",
                right: -30,
                top: -16,
                width: 500,
                height: "auto",
                opacity: 0.72,
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            borderTop: `2px solid rgba(41,16,10,0.16)`,
            paddingTop: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 40,
                lineHeight: 1,
              }}
            >
              Waveform
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontFamily: "'Courier New', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: 16,
                color: "rgba(41,16,10,0.72)",
              }}
            >
              <span>{segments.length} segments</span>
              {activeSegment ? (
                <span
                  style={{
                    border: `2px solid ${accent}`,
                    color: accent,
                    padding: "0.3rem 0.65rem",
                    background: "rgba(249,247,231,0.95)",
                  }}
                >
                  {activeSegment.speaker}
                </span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              height: 240,
              border: `3px solid ${brand.moloch800}`,
              background: `linear-gradient(180deg, rgba(83,74,19,0.94) 0%, rgba(41,16,10,1) 100%)`,
              padding: "1.6rem 1.4rem 1.1rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "end",
                gap: 8,
                height: 168,
              }}
            >
              {waveformBars.map((sample, index) => {
                const isPlayed = index <= activeWaveformIndex;
                const isCurrent = index === activeWaveformIndex;
                const height = 22 + sample * 124 + (isCurrent ? 12 : 0);

                return (
                  <div
                    key={index}
                    style={{
                      width: 16,
                      height,
                      background: isPlayed
                        ? `linear-gradient(180deg, ${brand.scroll100} 0%, ${accent} 100%)`
                        : "rgba(249,247,231,0.18)",
                      boxShadow: isCurrent ? `0 0 16px rgba(249,247,231,0.28)` : "none",
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                height: 8,
                background: "rgba(249,247,231,0.16)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${brand.scroll200} 0%, ${accent} 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
