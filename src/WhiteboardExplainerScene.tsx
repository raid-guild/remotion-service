import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type WhiteboardSceneKind =
  | "setup"
  | "harness"
  | "limits"
  | "workspace"
  | "request-flow"
  | "memory"
  | "comparison"
  | "loop"
  | "outro";

export type WhiteboardExplainerSceneItem = {
  kind: WhiteboardSceneKind;
  eyebrow?: string;
  headline: string;
  body?: string;
  labels?: string[];
  durationMs?: number;
};

export type WhiteboardExplainerProps = {
  title?: string;
  subtitle?: string;
  audioUrl?: string;
  backgroundImageUrl?: string;
  logoUrl?: string;
  accent?: string;
  secondaryAccent?: string;
  ink?: string;
  scenes?: WhiteboardExplainerSceneItem[];
  durationMs?: number;
};

const DEFAULT_ACCENT = "#99e500";
const DEFAULT_SECONDARY = "#7c86ff";
const DEFAULT_INK = "#172033";
const DEFAULT_DURATION_MS = 76000;

const resolveAsset = (url: string | undefined): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return staticFile(url.replace(/^\/+/, ""));
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const defaultScenes: WhiteboardExplainerSceneItem[] = [
  {
    kind: "setup",
    eyebrow: "The setup",
    headline: "Prism vs Agent Harnesses",
    body: "AI agent tools are moving fast. They are not all solving the same problem.",
    labels: ["OpenClaw", "Hermes", "Prism"],
    durationMs: 7600,
  },
  {
    kind: "harness",
    eyebrow: "Agent harness pattern",
    headline: "Harnesses run the agent turn.",
    body: "Prompt. Tools. Task runner. Action goes in and out.",
    labels: ["prompt", "tools", "task runner"],
    durationMs: 8200,
  },
  {
    kind: "limits",
    eyebrow: "Where harnesses stop",
    headline: "Real teams need more than execution.",
    body: "Users, memory, workflows, approvals, deployment, source adapters, and artifacts start surrounding the box.",
    labels: ["users", "memory", "workflows", "approvals", "deploys", "artifacts"],
    durationMs: 9400,
  },
  {
    kind: "workspace",
    eyebrow: "Prism enters",
    headline: "Prism is a deployable workspace platform.",
    body: "The agent runtime sits inside a broader operating surface for team work.",
    labels: ["sources", "requests", "workflows", "tasks", "artifacts", "deploy target"],
    durationMs: 9800,
  },
  {
    kind: "request-flow",
    eyebrow: "From conversation to execution",
    headline: "A message becomes structured work.",
    body: "A request can carry context, references, status, owner, workflow state, and execution history.",
    labels: ["Discord", "Request", "Workflow", "Artifact"],
    durationMs: 9600,
  },
  {
    kind: "memory",
    eyebrow: "Memory and knowledge",
    headline: "The agent does not start from zero.",
    body: "Prism separates rolling community memory from durable knowledge so context arrives when it matters.",
    labels: ["Memory", "Knowledge", "Agent"],
    durationMs: 9000,
  },
  {
    kind: "comparison",
    eyebrow: "The comparison",
    headline: "Harnesses run agents. Prism runs work through agents.",
    body: "The question widens from execution to the whole operating loop around execution.",
    labels: ["OpenClaw", "Hermes", "Prism"],
    durationMs: 9600,
  },
  {
    kind: "loop",
    eyebrow: "Core claim",
    headline: "Useful AI work needs infrastructure around the agent.",
    body: "Capture, understand, execute, review, remember.",
    labels: ["capture", "understand", "execute", "review", "remember"],
    durationMs: 8600,
  },
  {
    kind: "outro",
    eyebrow: "Prism",
    headline: "Deployable agent workspace infrastructure",
    body: "Agent harnesses help agents run. Prism helps teams run work through agents.",
    labels: ["superprism.io"],
    durationMs: 5200,
  },
];

export const getWhiteboardExplainerDurationMs = (props: WhiteboardExplainerProps | undefined) => {
  if (Number.isFinite(Number(props?.durationMs)) && Number(props?.durationMs) > 0) {
    return Number(props?.durationMs);
  }
  const scenes = props?.scenes && props.scenes.length > 0 ? props.scenes : defaultScenes;
  return scenes.reduce((total, scene) => total + (scene.durationMs ?? 8000), 0) || DEFAULT_DURATION_MS;
};

const progressFor = (frame: number, duration: number) => clamp(frame / Math.max(1, duration));

const DrawPath: React.FC<{
  d: string;
  color: string;
  width?: number;
  progress: number;
  fill?: string;
}> = ({ d, color, width = 6, progress, fill = "none" }) => (
  <path
    d={d}
    fill={fill}
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    pathLength={1}
    strokeDasharray={1}
    strokeDashoffset={1 - clamp(progress)}
  />
);

const MarkerLabel: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  progress: number;
  size?: number;
}> = ({ x, y, text, color, progress, size = 42 }) => (
  <text
    x={x}
    y={y}
    fill={color}
    fontSize={size}
    fontWeight={800}
    fontFamily="Inter, Arial, sans-serif"
    opacity={interpolate(progress, [0.18, 0.5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })}
    style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.9)", strokeWidth: 8 }}
  >
    {text}
  </text>
);

const WhiteboardFrame: React.FC<{
  scene: WhiteboardExplainerSceneItem;
  localFrame: number;
  durationFrames: number;
  accent: string;
  secondary: string;
  ink: string;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
}> = ({ scene, localFrame, durationFrames, accent, secondary, ink, logoUrl, backgroundImageUrl }) => {
  const { fps } = useVideoConfig();
  const p = progressFor(localFrame, durationFrames);
  const enter = spring({ frame: localFrame, fps, config: { damping: 22, stiffness: 80 } });
  const exit = interpolate(localFrame, [durationFrames - fps * 0.7, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      {backgroundImageUrl ? (
        <Img
          src={backgroundImageUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.09,
            filter: "grayscale(0.2) saturate(0.8) contrast(1.2)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 18%, rgba(153,229,0,0.09), transparent 25%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,248,241,0.95))",
        }}
      />
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <filter id="markerRough">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
        </filter>
        <g filter="url(#markerRough)">
          {renderDiagram(scene, p, accent, secondary, ink)}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: 86,
          top: 72,
          color: secondary,
          fontSize: 22,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          opacity: interpolate(enter, [0, 0.6], [0, 1]),
        }}
      >
        {scene.eyebrow}
      </div>
      <div
        style={{
          position: "absolute",
          left: 86,
          top: 116,
          width: 760,
          color: ink,
          fontSize: scene.headline.length > 45 ? 58 : 68,
          lineHeight: 0.98,
          fontWeight: 950,
          transform: `translateY(${(1 - enter) * 24}px)`,
          opacity: enter,
        }}
      >
        {scene.headline}
      </div>
      {scene.body ? (
        <div
          style={{
            position: "absolute",
            left: 90,
            top: 292,
            width: 690,
            color: "#53606b",
            fontSize: 29,
            lineHeight: 1.25,
            fontWeight: 650,
            opacity: interpolate(enter, [0.25, 0.8], [0, 1]),
          }}
        >
          {scene.body}
        </div>
      ) : null}
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            position: "absolute",
            right: 68,
            top: 56,
            width: 170,
            height: 54,
            objectFit: "contain",
            opacity: 0.82,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 54,
          height: 5,
          background: "rgba(23,32,51,0.08)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(p * 100)}%`,
            background: `linear-gradient(90deg, ${secondary}, ${accent})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

function renderDiagram(
  scene: WhiteboardExplainerSceneItem,
  p: number,
  accent: string,
  secondary: string,
  ink: string,
) {
  switch (scene.kind) {
    case "setup":
      return (
        <>
          <DrawPath d="M1090 210 C1260 170 1460 190 1580 260" color={ink} progress={p * 1.7} />
          <DrawPath d="M1090 210 C1240 320 1390 420 1600 430" color={ink} progress={p * 1.4 - 0.2} />
          <DrawPath d="M1090 210 C1250 500 1420 660 1600 700" color={ink} progress={p * 1.2 - 0.35} />
          <DrawPath d="M862 176 C950 120 1060 132 1128 202 C1040 268 936 268 862 176Z" color={secondary} progress={p * 1.6} />
          <MarkerLabel x={910} y={206} text="AI agents" color={ink} progress={p} size={44} />
          <MarkerLabel x={1360} y={238} text="OpenClaw" color={ink} progress={p - 0.15} />
          <MarkerLabel x={1390} y={432} text="Hermes" color={ink} progress={p - 0.3} />
          <MarkerLabel x={1404} y={704} text="Prism" color={accent} progress={p - 0.45} size={58} />
        </>
      );
    case "harness":
      return (
        <>
          <DrawPath d="M1000 250 H1605 V770 H1000 Z" color={ink} progress={p * 1.5} />
          <MarkerLabel x={1146} y={330} text="Agent Harness" color={ink} progress={p} size={58} />
          {["prompt", "tools", "task runner"].map((label, index) => {
            const y = 420 + index * 112;
            return (
              <g key={label}>
                <DrawPath d={`M1090 ${y - 42} H1510 V${y + 28} H1090 Z`} color={secondary} progress={p * 1.6 - index * 0.18} />
                <MarkerLabel x={1190} y={y + 8} text={label} color={ink} progress={p - index * 0.12} size={38} />
              </g>
            );
          })}
          <DrawPath d="M892 510 C940 510 950 510 996 510" color={accent} progress={p - 0.45} />
          <DrawPath d="M1605 510 C1660 510 1705 510 1760 510" color={accent} progress={p - 0.55} />
        </>
      );
    case "limits":
      return (
        <>
          <DrawPath d="M1080 345 H1540 V700 H1080 Z" color={ink} progress={p} />
          <MarkerLabel x={1182} y={528} text="Harness" color={ink} progress={p} size={58} />
          {(scene.labels ?? []).map((label, index) => {
            const angle = (Math.PI * 2 * index) / 6;
            const x = 1320 + Math.cos(angle) * 380;
            const y = 520 + Math.sin(angle) * 270;
            return (
              <g key={label}>
                <DrawPath d={`M1320 520 C${(1320 + x) / 2} ${520 + Math.sin(angle) * 100} ${x - 30} ${y - 20} ${x} ${y}`} color={secondary} progress={p * 1.4 - index * 0.08} width={4} />
                <MarkerLabel x={x - 70} y={y} text={`? ${label}`} color={index % 2 ? secondary : accent} progress={p - index * 0.07} size={34} />
              </g>
            );
          })}
        </>
      );
    case "workspace":
      return (
        <>
          <DrawPath d="M930 230 H1700 V830 H930 Z" color={accent} progress={p * 1.2} width={8} />
          <MarkerLabel x={1120} y={306} text="Prism Workspace" color={accent} progress={p} size={60} />
          {(scene.labels ?? []).map((label, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = 1000 + col * 220;
            const y = 405 + row * 155;
            return (
              <g key={label}>
                <DrawPath d={`M${x} ${y} H${x + 178} V${y + 82} H${x} Z`} color={index % 2 ? secondary : ink} progress={p * 1.45 - index * 0.08} width={5} />
                <MarkerLabel x={x + 20} y={y + 52} text={label} color={ink} progress={p - index * 0.05} size={27} />
              </g>
            );
          })}
        </>
      );
    case "request-flow":
      return (
        <>
          {["Discord", "Request", "Workflow", "Artifact"].map((label, index) => {
            const x = 840 + index * 250;
            return (
              <g key={label}>
                <DrawPath d={`M${x} 440 H${x + 185} V590 H${x} Z`} color={index === 1 ? accent : ink} progress={p * 1.5 - index * 0.15} />
                <MarkerLabel x={x + 18} y={525} text={label} color={index === 1 ? accent : ink} progress={p - index * 0.08} size={31} />
                {index < 3 ? <DrawPath d={`M${x + 190} 515 C${x + 220} 488 ${x + 232} 488 ${x + 250} 515`} color={secondary} progress={p * 1.3 - index * 0.2} /> : null}
              </g>
            );
          })}
          <MarkerLabel x={1030} y={675} text="status • owner • refs • history" color={secondary} progress={p - 0.55} size={38} />
        </>
      );
    case "memory":
      return (
        <>
          <DrawPath d="M950 330 H1240 V740 H950 Z" color={secondary} progress={p} />
          <DrawPath d="M1360 330 H1650 V740 H1360 Z" color={accent} progress={p - 0.12} />
          <MarkerLabel x={1000} y={296} text="Memory" color={secondary} progress={p} size={44} />
          <MarkerLabel x={1402} y={296} text="Knowledge" color={accent} progress={p - 0.1} size={44} />
          {[0, 1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <DrawPath d={`M980 ${395 + i * 72} H1210`} color={secondary} progress={p * 1.3 - i * 0.08} width={5} />
              <DrawPath d={`M1390 ${395 + i * 72} H1620`} color={accent} progress={p * 1.3 - i * 0.08} width={5} />
            </React.Fragment>
          ))}
          <DrawPath d="M1240 535 C1290 500 1320 500 1360 535" color={ink} progress={p - 0.4} />
          <DrawPath d="M1300 610 C1260 720 1170 790 1040 830" color={ink} progress={p - 0.55} />
          <MarkerLabel x={1078} y={850} text="right context, right moment" color={ink} progress={p - 0.62} size={35} />
        </>
      );
    case "comparison":
      return (
        <>
          <DrawPath d="M880 240 H1260 V760 H880 Z" color={ink} progress={p} />
          <DrawPath d="M1350 210 H1730 V815 H1350 Z" color={accent} progress={p - 0.1} width={8} />
          <MarkerLabel x={935} y={320} text="Harness" color={ink} progress={p} size={50} />
          <MarkerLabel x={1395} y={300} text="Workspace" color={accent} progress={p - 0.12} size={50} />
          <MarkerLabel x={930} y={445} text="agent acts" color={ink} progress={p - 0.25} size={36} />
          <MarkerLabel x={930} y={525} text="task runs" color={ink} progress={p - 0.35} size={36} />
          <MarkerLabel x={1398} y={420} text="intake" color={ink} progress={p - 0.25} size={32} />
          <MarkerLabel x={1398} y={490} text="workflow" color={ink} progress={p - 0.33} size={32} />
          <MarkerLabel x={1398} y={560} text="review" color={ink} progress={p - 0.41} size={32} />
          <MarkerLabel x={1398} y={630} text="memory" color={ink} progress={p - 0.49} size={32} />
        </>
      );
    case "loop": {
      const points = [
        [1260, 300],
        [1530, 400],
        [1490, 670],
        [1210, 760],
        [990, 560],
      ];
      return (
        <>
          <DrawPath d="M1260 300 C1540 280 1680 540 1490 670 C1320 850 970 760 990 560 C1010 390 1120 325 1260 300Z" color={accent} progress={p} width={8} />
          {(scene.labels ?? []).map((label, index) => {
            const [x, y] = points[index] ?? [1100, 500];
            return <MarkerLabel key={label} x={x - 70} y={y} text={label} color={index % 2 ? secondary : ink} progress={p - index * 0.08} size={32} />;
          })}
          <MarkerLabel x={1180} y={555} text="Agent" color={accent} progress={p - 0.35} size={58} />
        </>
      );
    }
    case "outro":
      return (
        <>
          <DrawPath d="M940 250 H1660 V780 H940 Z" color={accent} progress={p} width={8} />
          <DrawPath d="M1080 390 H1520 V620 H1080 Z" color={ink} progress={p - 0.18} />
          <MarkerLabel x={1145} y={515} text="Workspace OS" color={ink} progress={p - 0.22} size={54} />
          <MarkerLabel x={1148} y={706} text="Prism" color={accent} progress={p - 0.36} size={76} />
        </>
      );
    default:
      return null;
  }
}

export const WhiteboardExplainerScene: React.FC<WhiteboardExplainerProps> = ({
  title: _title,
  subtitle: _subtitle,
  audioUrl,
  backgroundImageUrl = "/assets/prism_vs_harnesses_landscape.jpg",
  logoUrl = "/assets/superprism_logo.png",
  accent = DEFAULT_ACCENT,
  secondaryAccent = DEFAULT_SECONDARY,
  ink = DEFAULT_INK,
  scenes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioSrc = resolveAsset(audioUrl);
  const bgSrc = resolveAsset(backgroundImageUrl);
  const logoSrc = resolveAsset(logoUrl);
  const resolvedScenes = scenes && scenes.length > 0 ? scenes : defaultScenes;
  const timeline = resolvedScenes.reduce<Array<WhiteboardExplainerSceneItem & { from: number; frames: number }>>(
    (items, scene) => {
      const from = items.reduce((total, item) => total + item.frames, 0);
      const frames = Math.max(1, Math.round(((scene.durationMs ?? 8000) / 1000) * fps));
      items.push({ ...scene, from, frames });
      return items;
    },
    [],
  );

  return (
    <AbsoluteFill style={{ background: "#f8faf2" }}>
      {audioSrc ? <Audio src={audioSrc} volume={1} /> : null}
      {timeline.map((scene) => (
        <Sequence key={`${scene.kind}-${scene.from}`} from={scene.from} durationInFrames={scene.frames}>
          <WhiteboardFrame
            scene={scene}
            localFrame={frame - scene.from}
            durationFrames={scene.frames}
            accent={accent}
            secondary={secondaryAccent}
            ink={ink}
            logoUrl={logoSrc}
            backgroundImageUrl={bgSrc}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
