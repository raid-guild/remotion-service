import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type LaunchDemoMediaType = "image" | "video";

export type LaunchDemoBrand = {
  name?: string;
  logoUrl?: string;
  accent?: string;
  background?: string;
  text?: string;
};

export type LaunchDemoIntro = {
  headline?: string;
  subhead?: string;
  durationMs?: number;
};

export type LaunchDemoSection = {
  eyebrow?: string;
  headline: string;
  body?: string;
  bullets?: string[];
  consoleLabel?: string;
  consoleText?: string;
  mediaUrl?: string;
  mediaType?: LaunchDemoMediaType;
  startSeconds?: number;
  endSeconds?: number;
  durationMs?: number;
};

export type LaunchDemoOutro = {
  headline?: string;
  body?: string;
  cta?: string;
  durationMs?: number;
};

export type LaunchDemoProps = {
  brand?: LaunchDemoBrand;
  audioUrl?: string;
  durationMs?: number;
  intro?: LaunchDemoIntro;
  sections?: LaunchDemoSection[];
  outro?: LaunchDemoOutro;
};

const DEFAULT_ACCENT = "#d8a84e";
const DEFAULT_BACKGROUND = "#080706";
const DEFAULT_TEXT = "#f4ead1";
const DEFAULT_LOGO = "https://www.raidguild.org/images/logo-RG-moloch-800.svg";
const DEFAULT_INTRO_MS = 4500;
const DEFAULT_SECTION_MS = 9000;
const DEFAULT_OUTRO_MS = 5000;

const resolveAsset = (url: string | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return staticFile(url.replace(/^\/+/, ""));
};

export const getLaunchDemoDurationMs = (props: LaunchDemoProps | undefined): number => {
  if (props?.durationMs && Number.isFinite(props.durationMs) && props.durationMs > 0) {
    return props.durationMs;
  }

  const introMs = props?.intro?.durationMs ?? DEFAULT_INTRO_MS;
  const sectionsMs = (props?.sections ?? []).reduce((total, section) => {
    return total + (section.durationMs ?? DEFAULT_SECTION_MS);
  }, 0);
  const outroMs = props?.outro?.durationMs ?? DEFAULT_OUTRO_MS;

  return Math.max(DEFAULT_INTRO_MS + DEFAULT_SECTION_MS + DEFAULT_OUTRO_MS, introMs + sectionsMs + outroMs);
};

const clampProgress = (frame: number, from: number, duration: number): number => {
  return interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const splitLines = (value: string, maxWords = 4): string[] => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let index = 0; index < words.length; index += maxWords) {
    lines.push(words.slice(index, index + maxWords).join(" "));
  }
  return lines;
};

const getDefaultSections = (): LaunchDemoSection[] => [
  {
    eyebrow: "Workflow",
    headline: "Briefs, demos, and shorts from one render flow",
    body: "Bring narration, screenshots, screen recordings, and publishable metadata into a single Remotion scene.",
    bullets: ["Async rendering", "Public proxy URLs", "Schema discovery"],
    durationMs: DEFAULT_SECTION_MS,
  },
  {
    eyebrow: "Demo",
    headline: "Reveal the product while the story moves",
    body: "Text animates on the left while screenshots or clips transition on the right.",
    bullets: ["Split-screen layout", "Media wipes", "Branded motion"],
    durationMs: DEFAULT_SECTION_MS,
  },
];

const LaunchLogo: React.FC<{
  logoUrl: string | null;
  brandName: string;
  accent: string;
  text: string;
  scale: number;
}> = ({ logoUrl, brandName, accent, text, scale }) => {
  if (logoUrl) {
    return (
      <Img
        src={logoUrl}
        style={{
          width: 260,
          height: 260,
          objectFit: "contain",
          transform: `scale(${scale})`,
          filter:
            "brightness(0) invert(1) sepia(0.32) saturate(1.8) hue-rotate(350deg) brightness(1.06)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 240,
        height: 240,
        border: `2px solid ${accent}`,
        display: "grid",
        placeItems: "center",
        color: text,
        fontSize: 44,
        fontWeight: 800,
        transform: `scale(${scale})`,
      }}
    >
      {brandName.slice(0, 2).toUpperCase()}
    </div>
  );
};

const MediaPanel: React.FC<{
  section: LaunchDemoSection;
  accent: string;
  localFrame: number;
  sectionFrames: number;
}> = ({ section, accent, localFrame, sectionFrames }) => {
  const { fps } = useVideoConfig();
  const mediaSrc = resolveAsset(section.mediaUrl);
  const mediaType = section.mediaType ?? (mediaSrc?.match(/\.(mp4|webm|mov)(\?|$)/i) ? "video" : "image");
  const reveal = spring({
    frame: localFrame,
    fps,
    config: {
      damping: 18,
      stiffness: 80,
    },
  });
  const exit = clampProgress(localFrame, Math.max(1, sectionFrames - fps), fps);
  const typedText =
    section.consoleText && section.consoleText.length > 0
      ? section.consoleText.slice(
          0,
          Math.min(
            section.consoleText.length,
            Math.floor(Math.max(0, localFrame - fps * 0.55) / 1.45),
          ),
        )
      : "";

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        transform: `translateX(${(1 - reveal) * 120 - exit * 80}px) rotateY(${-8 + reveal * 8}deg)`,
        opacity: Math.max(0, reveal - exit),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `1px solid rgba(244,234,209,0.2)`,
          background: "rgba(244,234,209,0.04)",
          transform: "translate(26px, 26px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          border: `1px solid rgba(244,234,209,0.28)`,
          background: "#050403",
          boxShadow: "0 34px 90px rgba(0,0,0,0.52)",
        }}
      >
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 18px",
            borderBottom: "1px solid rgba(244,234,209,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: index === 0 ? accent : "rgba(244,234,209,0.28)",
              }}
            />
          ))}
        </div>

        <div style={{ position: "absolute", inset: "44px 0 0" }}>
          {mediaSrc ? (
            mediaType === "video" ? (
              <Video
                src={mediaSrc}
                startFrom={Math.max(0, Math.round((section.startSeconds ?? 0) * fps))}
                endAt={
                  section.endSeconds
                    ? Math.max(1, Math.round(section.endSeconds * fps))
                    : undefined
                }
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                muted
              />
            ) : (
              <Img
                src={mediaSrc}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg, rgba(216,168,78,0.12) 0%, rgba(189,72,45,0.18) 48%, rgba(244,234,209,0.06) 100%)",
              }}
            >
              <div
                style={{
                  width: "68%",
                  display: "grid",
                  gap: 22,
                }}
              >
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    style={{
                      height: index === 0 ? 82 : 38,
                      border: `1px solid rgba(244,234,209,${0.18 + index * 0.05})`,
                      background:
                        index === 0 ? "rgba(216,168,78,0.2)" : "rgba(244,234,209,0.08)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${(-110 + reveal * 220).toFixed(2)}%)`,
            background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
            opacity: 0.18,
            mixBlendMode: "screen",
          }}
        />

        {section.consoleText ? (
          <div
            style={{
              position: "absolute",
              left: 34,
              right: 34,
              bottom: 34,
              padding: "18px 22px",
              border: `1px solid rgba(216,168,78,0.42)`,
              background: "rgba(5,4,3,0.86)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.44)",
              fontFamily: "'Courier New', monospace",
            }}
          >
            <div
              style={{
                marginBottom: 8,
                color: accent,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {section.consoleLabel ?? "Prism console"}
            </div>
            <div
              style={{
                color: "rgba(244,234,209,0.92)",
                fontSize: 22,
                lineHeight: 1.3,
                minHeight: 58,
              }}
            >
              <span>{typedText}</span>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 24,
                  marginLeft: 4,
                  background: accent,
                  opacity: Math.floor(localFrame / 12) % 2 === 0 ? 1 : 0.2,
                  transform: "translateY(4px)",
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const LaunchDemoScene: React.FC<LaunchDemoProps> = ({
  brand,
  audioUrl,
  intro,
  sections,
  outro,
  durationMs: _durationMs,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const accent = brand?.accent ?? DEFAULT_ACCENT;
  const background = brand?.background ?? DEFAULT_BACKGROUND;
  const text = brand?.text ?? DEFAULT_TEXT;
  const brandName = brand?.name ?? "Prism Refactory";
  const logoUrl = resolveAsset(brand?.logoUrl ?? DEFAULT_LOGO);
  const resolvedAudioUrl = resolveAsset(audioUrl);
  const resolvedIntro = {
    headline: intro?.headline ?? brandName,
    subhead: intro?.subhead ?? "Launch-ready media for agent-native workflows",
    durationMs: intro?.durationMs ?? DEFAULT_INTRO_MS,
  };
  const resolvedSections = sections && sections.length > 0 ? sections : getDefaultSections();
  const resolvedOutro = {
    headline: outro?.headline ?? "Launch the workflow",
    body: outro?.body ?? "Briefs, demos, shorts, and public media from the same pipeline.",
    cta: outro?.cta ?? "Build with Dark Factory",
    durationMs: outro?.durationMs ?? DEFAULT_OUTRO_MS,
  };

  const introFrames = Math.round((resolvedIntro.durationMs / 1000) * fps);
  const sectionTimeline = resolvedSections.reduce<
    Array<LaunchDemoSection & { from: number; frames: number }>
  >((timeline, section) => {
    const previous = timeline[timeline.length - 1];
    const from = previous ? previous.from + previous.frames : introFrames;
    const frames = Math.max(1, Math.round(((section.durationMs ?? DEFAULT_SECTION_MS) / 1000) * fps));
    timeline.push({ ...section, from, frames });
    return timeline;
  }, []);
  const outroFrames = Math.round((resolvedOutro.durationMs / 1000) * fps);
  const outroFrom =
    sectionTimeline.length > 0
      ? sectionTimeline[sectionTimeline.length - 1].from + sectionTimeline[sectionTimeline.length - 1].frames
      : introFrames;

  const globalProgress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const introReveal = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 65,
    },
  });
  const introExit = clampProgress(frame, Math.max(1, introFrames - fps), fps);
  const logoScale = 0.72 + introReveal * 0.28 + introExit * 0.7;
  const audioFade = interpolate(
    frame,
    [0, fps, Math.max(fps, durationInFrames - fps), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background,
        color: text,
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        overflow: "hidden",
      }}
    >
      {resolvedAudioUrl ? <Audio src={resolvedAudioUrl} volume={audioFade} /> : null}

      <AbsoluteFill
        style={{
          background:
            `radial-gradient(circle at 72% 30%, ${accent}24 0%, transparent 28%), linear-gradient(135deg, ${background} 0%, #120d0a 48%, #1b0d09 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(244,234,209,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,234,209,0.04) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 46,
          height: 3,
          background: "rgba(244,234,209,0.15)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(globalProgress * 100)}%`,
            background: `linear-gradient(90deg, #bd482d 0%, ${accent} 100%)`,
          }}
        />
      </div>

      <Sequence from={0} durationInFrames={introFrames}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: Math.max(0, 1 - introExit),
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 620,
              height: 620,
              border: `1px solid ${accent}55`,
              transform: `rotate(${frame * 0.25}deg) scale(${0.82 + introReveal * 0.18})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 440,
              height: 440,
              border: `2px solid ${accent}`,
              opacity: 0.2 + introReveal * 0.28,
              transform: `rotate(${-frame * 0.45}deg) scale(${0.78 + introReveal * 0.24})`,
            }}
          />
          <LaunchLogo
            logoUrl={logoUrl}
            brandName={brandName}
            accent={accent}
            text={text}
            scale={logoScale}
          />
          <div
            style={{
              marginTop: 36,
              textAlign: "center",
              transform: `translateY(${(1 - introReveal) * 40}px)`,
              opacity: introReveal,
            }}
          >
            <div
              style={{
                fontSize: 86,
                lineHeight: 0.95,
                fontWeight: 850,
                letterSpacing: 0,
              }}
            >
              {resolvedIntro.headline}
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 28,
                color: "rgba(244,234,209,0.72)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {resolvedIntro.subhead}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {sectionTimeline.map((section, sectionIndex) => (
        <Sequence
          key={`${section.headline}-${sectionIndex}`}
          from={section.from}
          durationInFrames={section.frames}
        >
          <AbsoluteFill
            style={{
              padding: "104px 92px 94px",
              display: "grid",
              gridTemplateColumns: "0.88fr 1.12fr",
              gap: 66,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  color: accent,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: 28,
                }}
              >
                {section.eyebrow ?? `Scene ${sectionIndex + 1}`}
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                {splitLines(section.headline, 4).map((line, lineIndex) => {
                  const localFrame = frame - section.from;
                  const reveal = spring({
                    frame: localFrame - lineIndex * 5,
                    fps,
                    config: { damping: 18, stiffness: 82 },
                  });
                  return (
                    <div
                      key={`${line}-${lineIndex}`}
                      style={{
                        fontSize: 72,
                        lineHeight: 0.96,
                        fontWeight: 840,
                        letterSpacing: 0,
                        transform: `translateX(${(1 - reveal) * -70}px)`,
                        opacity: reveal,
                      }}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
              {section.body ? (
                <div
                  style={{
                    marginTop: 32,
                    maxWidth: 720,
                    fontSize: 28,
                    lineHeight: 1.28,
                    color: "rgba(244,234,209,0.76)",
                  }}
                >
                  {section.body}
                </div>
              ) : null}
              {section.bullets && section.bullets.length > 0 ? (
                <div
                  style={{
                    marginTop: 34,
                    display: "grid",
                    gap: 14,
                  }}
                >
                  {section.bullets.slice(0, 4).map((bullet, bulletIndex) => {
                    const localFrame = frame - section.from;
                    const reveal = spring({
                      frame: localFrame - 14 - bulletIndex * 6,
                      fps,
                      config: { damping: 18, stiffness: 78 },
                    });
                    return (
                      <div
                        key={bullet}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          fontSize: 24,
                          color: "rgba(244,234,209,0.88)",
                          transform: `translateY(${(1 - reveal) * 24}px)`,
                          opacity: reveal,
                        }}
                      >
                        <div
                          style={{
                            width: 13,
                            height: 13,
                            background: accent,
                            boxShadow: `0 0 20px ${accent}77`,
                          }}
                        />
                        {bullet}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <MediaPanel
              section={section}
              accent={accent}
              localFrame={frame - section.from}
              sectionFrames={section.frames}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      <Sequence from={outroFrom} durationInFrames={outroFrames}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "16% 18%",
              border: `1px solid ${accent}44`,
              transform: `rotate(${frame * 0.18}deg)`,
            }}
          />
          <div
            style={{
              width: 160,
              height: 160,
              marginBottom: 36,
              display: "grid",
              placeItems: "center",
            }}
          >
            <LaunchLogo logoUrl={logoUrl} brandName={brandName} accent={accent} text={text} scale={0.64} />
          </div>
          <div
            style={{
              fontSize: 88,
              lineHeight: 0.95,
              fontWeight: 860,
              maxWidth: 980,
            }}
          >
            {resolvedOutro.headline}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 30,
              lineHeight: 1.25,
              color: "rgba(244,234,209,0.72)",
              maxWidth: 760,
            }}
          >
            {resolvedOutro.body}
          </div>
          <div
            style={{
              marginTop: 44,
              padding: "18px 30px",
              border: `1px solid ${accent}`,
              color: background,
              background: accent,
              fontSize: 24,
              fontWeight: 850,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: `0 18px 60px ${accent}33`,
            }}
          >
            {resolvedOutro.cta}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
