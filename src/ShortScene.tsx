import React from "react";
import {AbsoluteFill, Img, Sequence, Video, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
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

  const videoAspect = 16 / 9;
  const canvasAspect = width / height;
  let videoWidth: number;
  let videoHeight: number;

  if (canvasAspect > 1 / videoAspect) {
    videoHeight = height;
    videoWidth = videoHeight * videoAspect;
  } else {
    videoWidth = width;
    videoHeight = videoWidth / videoAspect;
  }

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
          }}
        >
          <Sequence from={clipStartFrame} durationInFrames={clipEndFrame - clipStartFrame}>
            <Video
              src={resolvedSrc}
              startFrom={Math.max(0, Math.round(startSeconds * fps))}
              endAt={Math.max(Math.round(startSeconds * fps) + 1, Math.round(endSeconds * fps))}
              delayRenderTimeoutInMilliseconds={120000}
              style={{width: "100%", height: "100%", objectFit: "cover"}}
            />
          </Sequence>

          {showTitleHook && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                padding: 48,
                background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1), transparent)",
                opacity: titleOpacity,
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  textAlign: "center",
                  color: "white",
                }}
              >
                <div
                  style={{
                    fontSize: 64,
                    lineHeight: 1.02,
                    fontWeight: 800,
                    letterSpacing: -0.03,
                  }}
                >
                  {title}
                </div>
              </div>
            </div>
          )}

          {activeCaption && !showTitleHook && (
            <div
              style={{
                position: "absolute",
                left: 24,
                right: 24,
                bottom: 36,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  maxWidth: "90%",
                  padding: "14px 20px",
                  borderRadius: 18,
                  backgroundColor: "rgba(0,0,0,0.76)",
                  color: "white",
                  fontSize: 40,
                  lineHeight: 1.1,
                  textAlign: "center",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
                }}
              >
                {activeCaption.text}
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {brand.assets.logoUrl ? (
          <Img
            src={brand.assets.logoUrl}
            style={{
              width: 48,
              height: 48,
              borderRadius: "999px",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: 6,
            }}
          />
        ) : null}
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid rgba(0,0,0,0.4)`,
            backgroundColor: "rgba(249,247,231,0.92)",
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 0.06,
            textTransform: "uppercase",
          }}
        >
          {brand.label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
