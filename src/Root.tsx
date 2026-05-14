import React from "react";
import { Composition } from "remotion";
import { LaunchDemoScene, getLaunchDemoDurationMs, type LaunchDemoProps } from "./LaunchDemoScene";
import { AnimatedScene } from "./Scene";
import { ShortScene } from "./ShortScene";
import {
  REMOTION_COMPOSITION_ID,
  REMOTION_LAUNCH_DEMO_COMPOSITION_ID,
  REMOTION_SHORT_COMPOSITION_ID,
} from "./constants";
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
        videoUrl: "/assets/jamesyoung-DTA-avatar-short.mp4",
        title: "Example Clip",
        clipId: "example",
        startSeconds: 0,
        endSeconds: 24.3,
        captions: [
          {
            start: 0.0,
            end: 0.04,
            text:
              "And, uh, what I've seen is that, uh, you know, with most dows, you see huge momentum at the",
          },
          {
            start: 0.04,
            end: 8.14,
            text:
              "beginning, but it's hard and difficult to maintain that alignment. So coordination is necessary",
          },
          {
            start: 8.14,
            end: 13.98,
            text:
              "as a bootstrap event, but it is not sufficient from an alignment perspective.",
          },
          {
            start: 15.0,
            end: 24.3,
            text:
              "Um, from a game mechanism, how do you keep alignment? And so how do you use agents to be able to",
          },
        ],
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

    <Composition
      id={REMOTION_LAUNCH_DEMO_COMPOSITION_ID}
      component={LaunchDemoScene}
      durationInFrames={DEFAULT_FPS * 24}
      fps={DEFAULT_FPS}
      width={1920}
      height={1080}
      defaultProps={{
        brand: {
          name: "Prism Refactory",
          accent: "#d8a84e",
          background: "#080706",
          text: "#f4ead1",
        },
        intro: {
          headline: "Prism Refactory",
          subhead: "Launch-ready media for agent-native workflows",
        },
        sections: [
          {
            eyebrow: "Workflow",
            headline: "Briefs, demos, and shorts from one render flow",
            body:
              "Bring narration, screenshots, screen recordings, and publishable metadata into a single Remotion scene.",
            bullets: ["Async rendering", "Public proxy URLs", "Schema discovery"],
          },
          {
            eyebrow: "Demo",
            headline: "Reveal the product while the story moves",
            body:
              "Text animates on the left while screenshots or clips transition on the right.",
            bullets: ["Split-screen layout", "Media wipes", "Branded motion"],
          },
        ],
        outro: {
          headline: "Launch the workflow",
          body: "Briefs, demos, shorts, and public media from the same pipeline.",
          cta: "Build with Dark Factory",
        },
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          DEFAULT_FPS * 6,
          Math.round((getLaunchDemoDurationMs(props as LaunchDemoProps) / 1000) * DEFAULT_FPS),
        ),
      })}
    />
  </>
);
