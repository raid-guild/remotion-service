import React from "react";
import { Composition } from "remotion";
import { AnimatedScene } from "./Scene";
import { ShortScene } from "./ShortScene";
import { REMOTION_COMPOSITION_ID, REMOTION_SHORT_COMPOSITION_ID } from "./constants";
import {
  DEFAULT_FPS,
  getDurationFromSegments,
  MINIMUM_DURATION_IN_FRAMES,
  type SceneProps,
} from "./segmentTiming";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id={REMOTION_COMPOSITION_ID}
      component={AnimatedScene}
      durationInFrames={MINIMUM_DURATION_IN_FRAMES}
      fps={DEFAULT_FPS}
      width={1920}
      height={1080}
      defaultProps={{
        title: "Dark Factory Render",
        accent: "#5ef1ff",
        segments: [],
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: getDurationFromSegments((props as SceneProps).segments, DEFAULT_FPS),
      })}
    />

    <Composition
      id={REMOTION_SHORT_COMPOSITION_ID}
      component={ShortScene}
      durationInFrames={DEFAULT_FPS * 6}
      fps={DEFAULT_FPS}
      width={1080}
      height={1920}
      defaultProps={{
        videoUrl: "https://example.com/video.mp4",
        title: "Example Clip",
        clipId: "example",
        startSeconds: 0,
        endSeconds: 4,
        captions: [],
      }}
      calculateMetadata={({ props }) => {
        const p = props as {
          startSeconds?: number;
          endSeconds?: number;
        };
        const start = Number.isFinite(p.startSeconds) ? (p.startSeconds as number) : 0;
        const end = Number.isFinite(p.endSeconds) ? (p.endSeconds as number) : start + 4;
        const clipDuration = Math.max(0, end - start);
        const totalSeconds = 1.5 + clipDuration;
        const frames = Math.max(DEFAULT_FPS * 3, Math.round(totalSeconds * DEFAULT_FPS));
        return {
          durationInFrames: frames,
        };
      }}
    />
  </>
);
