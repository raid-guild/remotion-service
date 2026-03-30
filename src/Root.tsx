import React from "react";
import { Composition } from "remotion";
import { AnimatedScene } from "./Scene";
import { REMOTION_COMPOSITION_ID } from "./constants";
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
  </>
);
