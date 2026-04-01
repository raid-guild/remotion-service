import React from "react";
import {AbsoluteFill, Img, Sequence, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {getBrandConfig, type BrandId} from "./brandConfig";

export type CaptionCue = {
  start: number; // seconds relative to clip start
  end: number;   // seconds relative to clip start
  text: string;
};

export type ShortSceneProps = {
  videoUrl: string;
  title: string;
  clipId: string;
  brandId?: BrandId;
  startSeconds: number;
  endSeconds: number;
  captions?: CaptionCue[];
};

const TITLE_HOOK_DURATION_SECONDS = 1.5;

export const ShortScene: React.FC<ShortSceneProps> = ({
  videoUrl,
  title,
  clipId,
  brandId,
  startSeconds,
  endSeconds,
  captions = [],
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const brand = getBrandConfig(brandId);

  const clipDurationSeconds = Math.max(0, endSeconds - startSeconds);
  const totalDurationSeconds = TITLE_HOOK_DURATION_SECONDS + clipDurationSeconds;
  const currentSeconds = frame / fps;

  const showTitleHook = currentSeconds <= TITLE_HOOK_DURATION_SECONDS;
  const titleOpacity = interpolate(currentSeconds, [0, TITLE_HOOK_DURATION_SECONDS, TITLE_HOOK_DURATION_SECONDS + 0.3], [1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  const clipStartFrame = Math.round(TITLE_HOOK_DURATION_SECONDS * fps);
  const clipEndFrame = clipStartFrame + Math.max(1, Math.round(clipDurationSeconds * fps));

  const clipRelativeSeconds = Math.max(0, currentSeconds - TITLE_HOOK_DURATION_SECONDS);
  const activeCaption = captions.find((cue) => clipRelativeSeconds >= cue.start && clipRelativeSeconds < cue.end) ?? null;

  const words = activeCaption ? activeCaption.text.split(/\s+/).filter((word) => word.length > 0) : [];
  const wordTimings = React.useMemo(() => {
    if (!activeCaption || words.length === 0) return [] as { start: number; end: number }[];
    const duration = Math.max(0.001, activeCaption.end - activeCaption.start);
    const slice = duration / words.length;
    return words.map((_, index) => {
      const start = activeCaption.start + slice * index;
      const end = index === words.length - 1 ? activeCaption.end : start + slice;
      return { start, end };
    });
  }, [activeCaption, words.length]);

  const activeWordIndex = React.useMemo(() => {
    if (!activeCaption || wordTimings.length === 0) return -1;
    const t = clipRelativeSeconds;
    return wordTimings.findIndex((window) => t >= window.start && t < window.end);
  }, [activeCaption, clipRelativeSeconds, wordTimings]);

  const videoWidth = width * 0.86;
  const videoHeight = height * 0.7;

  const resolvedSrc = videoUrl.startsWith("http://") || videoUrl.startsWith("https://")
    ? videoUrl
    : staticFile(videoUrl);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.theme.background,
        color: brand.theme.text,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at top, ${brand.theme.backgroundAlt} 0%, ${brand.theme.background} 40%, ${brand.theme.primaryDark} 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: videoWidth,
            height: videoHeight,
            overflow: "hidden",
            borderRadius: 40,
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            position: "relative",
            backgroundColor: "black",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: 40,
            gap: 28,
          }}
        >
          <Sequence from={clipStartFrame} durationInFrames={clipEndFrame - clipStartFrame}>
            <OffthreadVideo
              src={resolvedSrc}
              startFrom={Math.max(0, Math.round(startSeconds * fps))}
              endAt={Math.max(Math.round(startSeconds * fps) + 1, Math.round(endSeconds * fps))}
              style={{
                width: 0,
                height: 0,
                opacity: 0,
                position: "absolute",
                left: -9999,
                top: -9999,
              }}
            />
          </Sequence>

          <div
            style={{
              textAlign: "center",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: 54,
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: -0.03,
                marginBottom: 12,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                opacity: 0.85,
              }}
            >
              @jamessyoung
            </div>
          </div>

          {brand.assets.heroImageUrl ? (
            <Img
              src={brand.assets.heroImageUrl}
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                objectFit: "cover",
                borderRadius: 30,
              }}
            />
          ) : null}

          {/* Brand label inside card at bottom-left */}
          <div
            style={{
              marginTop: "auto",
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid rgba(255,255,255,0.5)` ,
                backgroundColor: "rgba(0,0,0,0.9)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 0.08,
                textTransform: "uppercase",
                color: "white",
              }}
            >
              {brand.label}
            </div>
          </div>

          {activeCaption && !showTitleHook && words.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: 24,
                right: 24,
                bottom: 140,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  maxWidth: "90%",
                  padding: "20px 30px",
                  borderRadius: 22,
                  backgroundColor: "rgba(0,0,0,0.80)",
                  color: "white",
                  fontSize: 72,
                  lineHeight: 1.12,
                  textAlign: "center",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
                }}
              >
                {words.map((word, index) => {
                  const isActive = index === activeWordIndex;
                  return (
                    <span
                      key={`${word}-${index}`}
                      style={{
                        padding: isActive ? "4px 6px" : undefined,
                        borderRadius: isActive ? 8 : undefined,
                        backgroundColor: isActive ? brand.theme.primary : undefined,
                        color: isActive ? brand.theme.background : undefined,
                        transition: "background-color 120ms ease-out, color 120ms ease-out",
                        marginRight: 6,
                        display: "inline-block",
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Brand bug logo pinned to bottom-right of the full frame */}
      {brand.assets.logoUrl ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "flex-end",
            pointerEvents: "none",
            paddingRight: 80,
            paddingBottom: 80,
          }}
        >
          <div
            style={{
              width: 260,
              height: 180,
              borderRadius: 28,
              backgroundColor: "rgba(255,255,255,0.95)",
              padding: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            }}
          >
            <Img
              src={brand.assets.logoUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
