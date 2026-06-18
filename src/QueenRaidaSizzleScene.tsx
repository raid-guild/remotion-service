import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type QueenRaidaSizzleProps = {
  audioUrl?: string;
  logoVideoUrl?: string;
  backgroundImageUrl?: string;
  avatarUrl?: string;
  clips?: string[];
  promptText?: string;
  durationMs?: number;
};

const DEFAULT_DURATION_MS = 23000;
const GREEN = "#9BE36A";
const RED = "#C0392B";
const PARCHMENT = "#F2EAD8";
const MUTED = "#B8C9B1";

const resolveAsset = (url: string | undefined): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return staticFile(url.replace(/^\/+/, ""));
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const sceneProgress = (frame: number, start: number, duration: number) =>
  clamp((frame - start) / Math.max(1, duration));

export const getQueenRaidaSizzleDurationMs = (props: QueenRaidaSizzleProps | undefined) =>
  Math.max(8000, Number(props?.durationMs) || DEFAULT_DURATION_MS);

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(155,227,106,0.045) 1px, transparent 1px)",
      backgroundSize: "100% 5px, 72px 72px",
      mixBlendMode: "screen",
      opacity: 0.35,
    }}
  />
);

const NoiseField: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const blocks = Array.from({ length: 42 }, (_, index) => {
    const x = random(`x-${index}-${Math.floor(frame / 5)}`) * 100;
    const y = random(`y-${index}-${Math.floor(frame / 7)}`) * 100;
    const width = 10 + random(`w-${index}`) * 120;
    const height = 1 + random(`h-${index}`) * 7;
    const alpha = random(`a-${index}-${Math.floor(frame / 3)}`) * 0.34 * intensity;
    return { x, y, width, height, alpha };
  });

  return (
    <AbsoluteFill style={{ opacity: 0.95 }}>
      {blocks.map((block, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${block.x}%`,
            top: `${block.y}%`,
            width: block.width,
            height: block.height,
            background: index % 3 === 0 ? RED : GREEN,
            opacity: block.alpha,
            filter: "blur(0.4px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const GlitchText: React.FC<{
  children: string;
  size: number;
  align?: "left" | "center";
  active?: number;
}> = ({ children, size, align = "left", active = 1 }) => {
  const frame = useCurrentFrame();
  const jitter = Math.sin(frame * 1.7) * 8 * active;
  const tear = Math.floor(frame / 3) % 5 === 0 ? 1 : 0;

  return (
    <div
      style={{
        position: "relative",
        color: PARCHMENT,
        fontSize: size,
        fontWeight: 900,
        lineHeight: 0.92,
        textAlign: align,
        textTransform: "uppercase",
        letterSpacing: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          color: RED,
          transform: `translate(${jitter - 7 * tear}px, ${tear ? -2 : 0}px)`,
          opacity: 0.45 * active,
          clipPath: "inset(0 0 48% 0)",
        }}
      >
        {children}
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          color: GREEN,
          transform: `translate(${-jitter + 9 * tear}px, ${tear ? 3 : 0}px)`,
          opacity: 0.42 * active,
          clipPath: "inset(48% 0 0 0)",
        }}
      >
        {children}
      </span>
      <span style={{ position: "relative" }}>{children}</span>
    </div>
  );
};

const DuplicatedUiLayers: React.FC<{ progress: number }> = ({ progress }) => {
  const frame = useCurrentFrame();
  const rows = ["ARCHIVE_LINK", "MEMORY_INDEX", "PROPOSAL_GATE", "SIGNAL_TRACE", "QUEEN_RAIDA.EXE"];
  return (
    <AbsoluteFill>
      {[0, 1, 2].map((layer) => (
        <div
          key={layer}
          style={{
            position: "absolute",
            inset: 80 + layer * 42,
            border: `1px solid ${layer === 1 ? RED : GREEN}${layer === 0 ? "66" : "33"}`,
            opacity: (0.22 - layer * 0.045) * progress,
            transform: `translate(${Math.sin(frame / (15 + layer * 5)) * (24 + layer * 18)}px, ${Math.cos(frame / (19 + layer * 4)) * (12 + layer * 10)}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 30,
              top: 28,
              fontFamily: "monospace",
              color: layer === 1 ? RED : GREEN,
              fontSize: 20,
              lineHeight: 1.6,
              opacity: 0.75,
            }}
          >
            {rows.map((row, index) => (
              <div key={row}>
                &gt; {row}...{index < 3 ? "OK" : Math.floor(frame / 8) % 2 ? "SYNC" : "WAIT"}
              </div>
            ))}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const ParticleSilhouette: React.FC<{ avatarUrl: string | null; progress: number }> = ({
  avatarUrl,
  progress,
}) => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 120 }, (_, index) => {
    const angle = random(`angle-${index}`) * Math.PI * 2;
    const radius = 80 + random(`radius-${index}`) * 520 * (1 - progress);
    const targetX = (random(`target-x-${index}`) - 0.5) * 380;
    const targetY = (random(`target-y-${index}`) - 0.5) * 520;
    const x = Math.cos(angle) * radius + targetX * progress;
    const y = Math.sin(angle) * radius + targetY * progress;
    return { x, y, size: 2 + random(`size-${index}`) * 4 };
  });

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      {avatarUrl ? (
        <Img
          src={avatarUrl}
          style={{
            width: 520,
            height: 650,
            objectFit: "cover",
            opacity: interpolate(progress, [0.25, 0.9], [0, 0.74], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            filter: `contrast(1.2) saturate(0.82) brightness(0.75) drop-shadow(0 0 ${28 + progress * 48}px ${GREEN}66)`,
            transform: `translateY(${(1 - progress) * 80}px) scale(${0.9 + progress * 0.08})`,
            clipPath: `inset(${Math.max(0, 28 - progress * 28)}% 0 ${Math.max(0, 42 - progress * 42)}% 0)`,
          }}
        />
      ) : null}
      <div style={{ position: "absolute", left: "50%", top: "50%" }}>
        {particles.map((particle, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              width: particle.size,
              height: particle.size,
              background: index % 5 === 0 ? RED : GREEN,
              opacity: 0.75 * (1 - Math.abs(progress - 0.56)),
              transform: `translate(${particle.x + Math.sin(frame / 4 + index) * 18}px, ${particle.y + Math.cos(frame / 5 + index) * 10}px)`,
              boxShadow: `0 0 12px ${index % 5 === 0 ? RED : GREEN}`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const GlitchMedia: React.FC<{ src: string; opacity: number; side?: "left" | "right" }> = ({
  src,
  opacity,
  side = "right",
}) => {
  const frame = useCurrentFrame();
  const shift = Math.floor(frame / 2) % 7 === 0 ? 22 : 0;
  return (
    <div
      style={{
        position: "absolute",
        top: 92,
        bottom: 92,
        [side]: 86,
        width: 720,
        overflow: "hidden",
        opacity,
        border: `1px solid ${GREEN}44`,
        boxShadow: `0 0 50px ${GREEN}22`,
      }}
    >
      {[0, 1, 2].map((layer) => (
        <Video
          key={layer}
          src={src}
          muted
          loop
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: layer === 0 ? 1 : 0.28,
            mixBlendMode: layer === 0 ? "normal" : "screen",
            filter:
              layer === 1
                ? "hue-rotate(105deg) saturate(1.8)"
                : layer === 2
                  ? "hue-rotate(-55deg) saturate(1.5)"
                  : "contrast(1.18) saturate(0.85)",
            transform: `translateX(${layer === 1 ? -shift : layer === 2 ? shift : 0}px) scale(${1.04 + layer * 0.012})`,
          }}
        />
      ))}
    </div>
  );
};

const TypePrompt: React.FC<{ text: string; progress: number }> = ({ text, progress }) => {
  const visible = text.slice(0, Math.floor(text.length * clamp(progress)));
  return (
    <div
      style={{
        width: 1240,
        minHeight: 250,
        border: `1px solid ${GREEN}55`,
        background: "rgba(0,0,0,0.72)",
        boxShadow: `0 0 80px ${GREEN}22, inset 0 0 40px rgba(155,227,106,0.08)`,
        padding: "34px 40px",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          color: GREEN,
          textTransform: "uppercase",
          fontSize: 22,
          fontWeight: 800,
          marginBottom: 20,
        }}
      >
        Treasury Prompt
      </div>
      <div
        style={{
          color: PARCHMENT,
          fontSize: 38,
          lineHeight: 1.22,
        }}
      >
        {visible}
        <span style={{ color: GREEN, opacity: Math.floor(progress * 20) % 2 ? 1 : 0.2 }}>
          _
        </span>
      </div>
    </div>
  );
};

export const QueenRaidaSizzleScene: React.FC<QueenRaidaSizzleProps> = ({
  audioUrl = "/assets/queen_raida_blarm.m4a",
  logoVideoUrl = "/assets/queen_raida_glitch_reveal_logo.mp4",
  backgroundImageUrl = "/assets/queen_raida_avatar_reference.png",
  avatarUrl = "/assets/queen_raida_avatar.png",
  clips = [
    "/assets/queen_raida_hype_scene_materialization.mp4",
    "/assets/queen_raida_hype_scene_watchtower.mp4",
    "/assets/queen_raida_hype_scene_treasury.mp4",
  ],
  promptText = "Create a proposal against the RaidGuild treasury to build a community operating system for agents, members, projects, and shared work.",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const audioSrc = resolveAsset(audioUrl);
  const logoSrc = resolveAsset(logoVideoUrl);
  const bgSrc = resolveAsset(backgroundImageUrl);
  const avatarSrc = resolveAsset(avatarUrl);
  const clipSources = clips.map(resolveAsset).filter(Boolean) as string[];

  const scene1 = 0;
  const scene2 = Math.round(4.2 * fps);
  const scene3 = Math.round(10.2 * fps);
  const scene4 = Math.round(15.8 * fps);
  const scene5 = Math.round(22.8 * fps);
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.45, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#020302", color: PARCHMENT, overflow: "hidden" }}>
      {audioSrc ? <Audio src={audioSrc} volume={1.85} /> : null}
      {bgSrc ? (
        <Img
          src={bgSrc}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.22,
            filter: "grayscale(0.35) contrast(1.25) brightness(0.42)",
            transform: `scale(${1.05 + Math.sin(frame / 90) * 0.015})`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(circle at 64% 46%, ${GREEN}22 0%, transparent 25%), radial-gradient(circle at 24% 72%, ${RED}22 0%, transparent 29%), linear-gradient(105deg, rgba(0,0,0,0.9), rgba(3,5,7,0.72))`,
        }}
      />
      <DuplicatedUiLayers progress={1} />
      <Scanlines />
      <NoiseField intensity={0.9} />

      <Sequence from={scene1} durationInFrames={scene2 - scene1}>
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          {logoSrc ? (
            <Video
              src={logoSrc}
              muted
              loop
              style={{
                width: 260,
                height: 260,
                objectFit: "contain",
                filter: `drop-shadow(0 0 28px ${GREEN}66)`,
                opacity: interpolate(frame, [0, fps * 0.6, scene2 - fps], [0, 1, 0.8], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />
          ) : null}
          <div style={{ marginTop: 360 }}>
            <GlitchText
              size={94}
              align="center"
              active={sceneProgress(frame, scene1, scene2 - scene1)}
            >
              Ghost in the System
            </GlitchText>
            <div
              style={{
                marginTop: 24,
                color: MUTED,
                fontSize: 28,
                textAlign: "center",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              faint duplicated UI layers drifting asynchronously
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={scene2} durationInFrames={scene3 - scene2}>
        <AbsoluteFill>
          <ParticleSilhouette
            avatarUrl={avatarSrc}
            progress={sceneProgress(frame, scene2, scene3 - scene2)}
          />
          <div style={{ position: "absolute", left: 90, bottom: 110, width: 760 }}>
            <GlitchText size={82} active={1}>
              Entity Manifestation
            </GlitchText>
            <div style={{ color: MUTED, fontSize: 30, marginTop: 22 }}>
              human silhouette forms from particles and glitch trails
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={scene3} durationInFrames={scene4 - scene3}>
        <AbsoluteFill>
          {clipSources[0] ? <GlitchMedia src={clipSources[0]} opacity={0.92} /> : null}
          <div style={{ position: "absolute", left: 90, top: 120, width: 760 }}>
            <GlitchText size={88} active={1}>
              Signal Acquisition
            </GlitchText>
            <div style={{ color: MUTED, fontSize: 30, marginTop: 22 }}>
              text emerges through static/noise
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 98,
              bottom: 126,
              color: GREEN,
              fontFamily: "monospace",
              fontSize: 28,
              lineHeight: 1.55,
            }}
          >
            &gt; OFFICIAL_AGENT...ONLINE
            <br />
            &gt; INFORMATION_ASYMMETRY...DETECTED
            <br />
            &gt; QUEEN_RAIDA...SHIPPING
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={scene4} durationInFrames={scene5 - scene4}>
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          {clipSources[2] ? (
            <Video
              src={clipSources[2]}
              muted
              loop
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.28,
                filter: "contrast(1.35) brightness(0.42)",
              }}
            />
          ) : null}
          <TypePrompt
            text={promptText}
            progress={sceneProgress(frame, scene4 + fps * 0.35, fps * 4.6)}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={scene5} durationInFrames={durationInFrames - scene5}>
        <AbsoluteFill style={{ display: "grid", placeItems: "center", textAlign: "center" }}>
          {clipSources[2] ? (
            <Video
              src={clipSources[2]}
              muted
              loop
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.22,
                filter: "contrast(1.45) brightness(0.32) grayscale(0.25)",
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at center, rgba(155,227,106,0.18) 0%, rgba(2,3,2,0.48) 34%, rgba(2,3,2,0.92) 100%)",
            }}
          />
          {logoSrc ? (
            <Video
              src={logoSrc}
              muted
              loop
              style={{
                width: 132,
                height: 132,
                objectFit: "contain",
                marginBottom: 34,
                filter: `drop-shadow(0 0 32px ${GREEN}88)`,
              }}
            />
          ) : null}
          <div
            style={{
              color: GREEN,
              textTransform: "uppercase",
              fontSize: 24,
              fontWeight: 900,
              marginBottom: 24,
            }}
          >
            Side Quest Detected
          </div>
          <GlitchText size={98} align="center" active={1}>
            Moloch Skills
          </GlitchText>
          <div
            style={{
              marginTop: 26,
              color: PARCHMENT,
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            Agent-first shared treasury management
          </div>
          <div
            style={{
              marginTop: 40,
              color: GREEN,
              fontSize: 38,
              fontFamily: "monospace",
              letterSpacing: 0,
            }}
          >
            raida.raidguild.org
          </div>
        </AbsoluteFill>
      </Sequence>

      <AbsoluteFill
        style={{
          opacity: 1 - fadeOut,
          background: "#020302",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
