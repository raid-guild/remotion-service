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
  ember500: "#bd482d",
  ember650: "#8f2f20",
  gold400: "#d8a84e",
  ink950: "#080706",
  ink900: "#11100e",
  ink850: "#181411",
  ash300: "#d4cec1",
  ash500: "#91887a",
  parchment: "#f4ead1",
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
  accent = brand.gold400,
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
        background: brand.ink950,
        color: brand.parchment,
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
            "linear-gradient(135deg, #080706 0%, #14100d 45%, #23120d 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(244,234,209,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(244,234,209,0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.34,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.36) 0%, transparent 35%, rgba(0,0,0,0.44) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 20,
          background: `linear-gradient(90deg, ${brand.ember650} 0%, ${brand.gold400} 52%, ${brand.ember500} 100%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "5% 4%",
          border: `2px solid rgba(244,234,209,0.22)`,
          borderRadius: 28,
          background: "rgba(12,10,8,0.84)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.48), inset 0 0 0 1px rgba(216,168,78,0.14)",
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
                  filter:
                    "brightness(0) invert(1) sepia(0.32) saturate(1.8) hue-rotate(350deg) brightness(1.05)",
                  opacity: 0.94,
                }}
              />

              <div
                style={{
                  border: `1px solid rgba(216,168,78,0.62)`,
                  padding: "0.45rem 0.8rem",
                  fontSize: 18,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontFamily: "'Courier New', monospace",
                  background: "rgba(8,7,6,0.72)",
                  color: brand.gold400,
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
                color: brand.ash500,
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
                  color: accent,
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
                color: brand.ash300,
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
                inset: "8% 10% 4% 6%",
                border: `1px solid rgba(216,168,78,0.2)`,
                background: "rgba(216,168,78,0.045)",
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
                opacity: 0.62,
                objectFit: "contain",
                filter: "sepia(0.18) saturate(0.9) brightness(0.78) contrast(1.08)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            borderTop: `1px solid rgba(244,234,209,0.16)`,
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
                color: brand.ash500,
              }}
            >
              <span>{segments.length} segments</span>
              {activeSegment ? (
                <span
                  style={{
                    border: `1px solid ${accent}`,
                    color: accent,
                    padding: "0.3rem 0.65rem",
                    background: "rgba(8,7,6,0.8)",
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
              border: `1px solid rgba(244,234,209,0.22)`,
              background: `linear-gradient(180deg, rgba(24,20,17,0.96) 0%, rgba(8,7,6,1) 100%)`,
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
                        ? `linear-gradient(180deg, ${brand.parchment} 0%, ${accent} 54%, ${brand.ember500} 100%)`
                        : "rgba(244,234,209,0.16)",
                      boxShadow: isCurrent ? `0 0 18px rgba(216,168,78,0.36)` : "none",
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                height: 8,
                background: "rgba(244,234,209,0.13)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${brand.ember500} 0%, ${accent} 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
