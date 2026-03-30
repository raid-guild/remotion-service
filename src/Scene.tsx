import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
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
  scroll200: "#ece5ac",
  scroll500: "#b5a22c",
  scroll700: "#534a13",
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
  const pulse = interpolate(frame % (fps * 2), [0, fps, fps * 2], [0.3, 1, 0.3], {
    extrapolateRight: "clamp",
  });
  const progress = interpolate(frame, [0, effectiveDuration], [0, 1], {
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

  const visibleSegments = timeline.slice(0, 4);
  const activeSegmentIndex = timeline.findIndex(
    (segment) => frame >= segment.startFrame && frame < segment.endFrame,
  );
  const activeWaveformIndex = Math.min(
    waveformBars.length - 1,
    Math.max(0, Math.floor(progress * waveformBars.length)),
  );

  return (
    <AbsoluteFill
      style={{
        background: brand.scroll100,
        color: brand.moloch800,
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflow: "hidden",
      }}
    >
      {timeline.map((segment) => {
        return (
          <Sequence
            key={`${segment.speaker}-${segment.startFrame}`}
            durationInFrames={segment.segmentFrames}
            from={segment.startFrame}
          >
            <Audio src={segment.url} />
          </Sequence>
        );
      })}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 18% 16%, rgba(189,72,45,0.20), transparent 28%), radial-gradient(circle at 80% 18%, rgba(181,162,44,0.22), transparent 24%), linear-gradient(135deg, #f9f7e7 0%, #ece5ac 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(41,16,10,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(41,16,10,0.08) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          opacity: 0.28,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 28,
          background: brand.moloch500,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 18,
          background: brand.scroll700,
        }}
      />

      <Img
        src={RAIDGUILD_HERO_URL}
        style={{
          position: "absolute",
          right: -20,
          top: 80,
          width: 860,
          opacity: 0.22,
          filter: "sepia(0.55) saturate(0.8) hue-rotate(-10deg)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "5.5% 4.5%",
          borderRadius: 28,
          border: `3px solid ${brand.moloch800}`,
          boxShadow: `0 26px 80px rgba(41,16,10,${0.16 + pulse * 0.08})`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.75rem 3rem",
          overflow: "hidden",
          background: "rgba(249,247,231,0.84)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <Img
              src={RAIDGUILD_LOGO_URL}
              style={{
                width: 340,
                height: "auto",
              }}
            />
            <div
              style={{
                border: `2px solid ${brand.moloch800}`,
                padding: "0.5rem 0.9rem",
                fontSize: 20,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: "'Courier New', monospace",
                background: "rgba(236,229,172,0.55)",
              }}
            >
              Dispatch {`${Math.round(progress * 100)}%`}
            </div>
          </div>

          <h1
            style={{
              fontSize: 72,
              lineHeight: 1.02,
              margin: "2rem 0 0.8rem",
              maxWidth: 980,
              color: brand.moloch800,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: 24,
              maxWidth: 840,
              lineHeight: 1.35,
              color: "rgba(41,16,10,0.82)",
              marginBottom: 18,
            }}
          >
            Mercenary intel for the guild. Daily audio dispatches rendered with
            Raid Guild branding, hardened infrastructure, and a proper battle rhythm.
          </p>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              fontFamily: "'Courier New', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {["Web3 ops", "Guild dispatch", "Onchain build", "Daily brief"].map((tag) => (
              <div
                key={tag}
                style={{
                  border: `2px solid ${brand.moloch500}`,
                  color: brand.moloch500,
                  background: "rgba(249,247,231,0.9)",
                  padding: "0.45rem 0.75rem",
                  fontSize: 16,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              border: `3px solid ${brand.moloch800}`,
              background: `linear-gradient(180deg, rgba(83,74,19,0.92) 0%, rgba(41,16,10,0.98) 100%)`,
              padding: "1.8rem 2rem 1.6rem",
              boxShadow: "inset 0 0 0 2px rgba(249,247,231,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: brand.scroll100,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                Warband Waveform
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(249,247,231,0.76)",
                }}
              >
                {segments.length} segments
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "end",
                gap: 8,
                height: 180,
                padding: "0 2px",
              }}
            >
              {waveformBars.map((sample, index) => {
                const barProgress = index / Math.max(1, waveformBars.length - 1);
                const isPlayed = barProgress <= progress;
                const isActiveBar = index === activeWaveformIndex;
                const height = 24 + sample * 116 + (isActiveBar ? pulse * 18 : 0);

                return (
                  <div
                    key={index}
                    style={{
                      width: 16,
                      height,
                      background: isPlayed
                        ? `linear-gradient(180deg, ${brand.scroll200} 0%, ${accent} 100%)`
                        : "rgba(249,247,231,0.16)",
                      border: isPlayed
                        ? `1px solid rgba(249,247,231,0.45)`
                        : "1px solid rgba(249,247,231,0.08)",
                      boxShadow: isPlayed
                        ? `0 0 ${isActiveBar ? 22 : 10 + pulse * 12}px rgba(189,72,45,0.32)`
                        : "none",
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                marginTop: 18,
                height: 10,
                background: "rgba(249,247,231,0.12)",
                border: "1px solid rgba(249,247,231,0.2)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(progress * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${brand.scroll200} 0%, ${accent} 100%)`,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            {visibleSegments.map((segment, index) => {
              const isActive = segment.index === activeSegmentIndex;
              return (
                <div
                  key={`${segment.speaker}-${index}`}
                  style={{
                    minWidth: 220,
                    padding: "0.85rem 1rem",
                    background: isActive ? brand.moloch500 : "rgba(41,16,10,0.08)",
                    color: isActive ? brand.scroll100 : brand.moloch800,
                    border: `2px solid ${isActive ? brand.moloch500 : "rgba(41,16,10,0.16)"}`,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      opacity: 0.72,
                      marginBottom: 6,
                    }}
                  >
                    Speaker
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {segment.speaker}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
