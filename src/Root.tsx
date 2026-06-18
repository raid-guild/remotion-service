import React from "react";
import { Composition } from "remotion";
import { LaunchDemoScene, getLaunchDemoDurationMs, type LaunchDemoProps } from "./LaunchDemoScene";
import {
  QueenRaidaSizzleScene,
  getQueenRaidaSizzleDurationMs,
  type QueenRaidaSizzleProps,
} from "./QueenRaidaSizzleScene";
import {
  WhiteboardExplainerScene,
  getWhiteboardExplainerDurationMs,
  type WhiteboardExplainerProps,
} from "./WhiteboardExplainerScene";
import {
  FiresideRecapScene,
  getFiresideRecapDurationMs,
  type FiresideRecapProps,
} from "./FiresideRecapScene";
import { AnimatedScene } from "./Scene";
import { ShortScene } from "./ShortScene";
import {
  REMOTION_COMPOSITION_ID,
  REMOTION_FIRESIDE_RECAP_COMPOSITION_ID,
  REMOTION_LAUNCH_DEMO_COMPOSITION_ID,
  REMOTION_QUEEN_RAIDA_SIZZLE_COMPOSITION_ID,
  REMOTION_SHORT_COMPOSITION_ID,
  REMOTION_WHITEBOARD_EXPLAINER_COMPOSITION_ID,
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

    <Composition
      id={REMOTION_QUEEN_RAIDA_SIZZLE_COMPOSITION_ID}
      component={QueenRaidaSizzleScene}
      durationInFrames={DEFAULT_FPS * 23}
      fps={DEFAULT_FPS}
      width={1920}
      height={1080}
      defaultProps={{
        audioUrl: "/assets/queen_raida_blarm.m4a",
        logoVideoUrl: "/assets/queen_raida_glitch_reveal_logo.mp4",
        backgroundImageUrl: "/assets/queen_raida_avatar_reference.png",
        avatarUrl: "/assets/queen_raida_avatar.png",
        clips: [
          "/assets/queen_raida_hype_scene_materialization.mp4",
          "/assets/queen_raida_hype_scene_watchtower.mp4",
          "/assets/queen_raida_hype_scene_treasury.mp4",
        ],
        promptText:
          "Create a proposal against the RaidGuild treasury to build a community operating system for agents, members, projects, and shared work.",
        durationMs: 28000,
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          DEFAULT_FPS * 8,
          Math.round((getQueenRaidaSizzleDurationMs(props as QueenRaidaSizzleProps) / 1000) * DEFAULT_FPS),
        ),
      })}
    />

    <Composition
      id={REMOTION_WHITEBOARD_EXPLAINER_COMPOSITION_ID}
      component={WhiteboardExplainerScene}
      durationInFrames={DEFAULT_FPS * 76}
      fps={DEFAULT_FPS}
      width={1920}
      height={1080}
      defaultProps={{
        title: "Prism vs Agent Harnesses",
        subtitle: "Deployable agent workspace infrastructure",
        backgroundImageUrl: "/assets/prism_vs_harnesses_landscape.jpg",
        logoUrl: "/assets/superprism_logo.png",
        accent: "#99e500",
        secondaryAccent: "#7c86ff",
        ink: "#172033",
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          DEFAULT_FPS * 8,
          Math.round((getWhiteboardExplainerDurationMs(props as WhiteboardExplainerProps) / 1000) * DEFAULT_FPS),
        ),
      })}
    />

    <Composition
      id={REMOTION_FIRESIDE_RECAP_COMPOSITION_ID}
      component={FiresideRecapScene}
      durationInFrames={DEFAULT_FPS * 48}
      fps={DEFAULT_FPS}
      width={1920}
      height={1080}
      defaultProps={{
        title: "Justice on Clawbank",
        subtitle: "Agents, companies, friction, and building through the AI timeline",
        introAudioUrl: "/assets/fireside_crawl_bank_tts_intro.mp3",
        introDurationMs: 6500,
        guest: {
          name: "Justice",
          handle: "@singularityhack",
          avatarUrl: "/assets/fireside_justice_avatar.jpg",
        },
        host: {
          name: "Dekan",
          handle: "@dekanbro",
          avatarUrl: "/assets/fireside_dekan_avatar.jpg",
        },
        backgroundUrl: "/assets/fireside_campfire.png",
        cards: [
          {
            title: "Agents need more than wallets",
            body:
              "Clawbank moves from giving an agent a bank account toward giving your agent a company.",
            imageUrl: "/assets/fireside_agentic_coding.png",
            audioUrl: "/assets/fireside_crawl_bank_tts_agents.mp3",
            durationMs: 11400,
          },
          {
            title: "Friction as the roadmap",
            body:
              "The hard parts are not distractions. Crypto workflows, legal wrappers, private-key handling, deployment, security, and trust become the map.",
            quote: "Without friction, there's no moat.",
            imageUrl: "/assets/fireside_open_source_security.png",
            audioUrl: "/assets/fireside_crawl_bank_tts_friction.mp3",
            durationMs: 8200,
          },
          {
            title: "Engineering did not get easier",
            body:
              "Model power raises the abstraction level, but it also raises the cost of not understanding your system.",
            imageUrl: "/assets/fireside_shared_state.png",
            audioUrl: "/assets/fireside_crawl_bank_tts_engineering.mp3",
            durationMs: 10900,
          },
        ],
        outro: {
          headline: "Watch the full interview",
          url: "portal.raidguild.org",
          audioUrl: "/assets/fireside_crawl_bank_tts_outro.mp3",
          durationMs: 7900,
        },
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          DEFAULT_FPS * 8,
          Math.round((getFiresideRecapDurationMs(props as FiresideRecapProps) / 1000) * DEFAULT_FPS),
        ),
      })}
    />
  </>
);
