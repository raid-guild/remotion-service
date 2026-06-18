import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type FiresidePerson = {
  name?: string;
  handle?: string;
  avatarUrl?: string;
};

export type FiresideCard = {
  title: string;
  body: string;
  quote?: string;
  imageUrl?: string;
  audioUrl?: string;
  durationMs?: number;
};

export type FiresideRecapProps = {
  title?: string;
  subtitle?: string;
  introAudioUrl?: string;
  introDurationMs?: number;
  guest?: FiresidePerson;
  host?: FiresidePerson;
  backgroundUrl?: string;
  cards?: FiresideCard[];
  outro?: {
    headline?: string;
    url?: string;
    audioUrl?: string;
    durationMs?: number;
  };
  accent?: string;
  ember?: string;
  text?: string;
  durationMs?: number;
};

const DEFAULT_ACCENT = "#F7B267";
const DEFAULT_EMBER = "#E05243";
const DEFAULT_TEXT = "#FFF3DE";
const DEFAULT_BG = "/assets/fireside_campfire.png";

const defaultCards: FiresideCard[] = [
  {
    title: "Agents need more than wallets",
    body:
      "The frame moves from giving an agent a bank account to giving your agent a company.",
    imageUrl: "/assets/fireside_agentic_coding.png",
    durationMs: 9800,
  },
  {
    title: "Friction as the roadmap",
    body:
      "The hard parts are not distractions. Crypto workflows, wrappers, keys, deployment, security, and trust become the map.",
    quote: "Without friction, there's no moat.",
    imageUrl: "/assets/fireside_open_source_security.png",
    durationMs: 8200,
  },
  {
    title: "Engineering did not get easier",
    body:
      "Model power raises the abstraction level, but it also raises the cost of not understanding your system.",
    imageUrl: "/assets/fireside_shared_state.png",
    durationMs: 10200,
  },
];

const resolveAsset = (url: string | undefined): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return staticFile(url.replace(/^\/+/, ""));
};

const splitTitle = (text: string, maxWords = 4) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    lines.push(words.slice(i, i + maxWords).join(" "));
  }
  return lines;
};

const EmberField: React.FC<{ accent: string; ember: string }> = ({ accent, ember }) => {
  const frame = useCurrentFrame();
  const sparks = Array.from({ length: 55 }, (_, index) => {
    const x = random(`spark-x-${index}`) * 100;
    const drift = (frame * (0.08 + random(`spark-speed-${index}`) * 0.16)) % 120;
    const y = 110 - drift + random(`spark-y-${index}`) * 40;
    const size = 2 + random(`spark-size-${index}`) * 5;
    return { x, y, size };
  });

  return (
    <AbsoluteFill>
      {sparks.map((spark, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${spark.x}%`,
            top: `${spark.y}%`,
            width: spark.size,
            height: spark.size,
            borderRadius: "50%",
            background: index % 3 === 0 ? accent : ember,
            opacity: 0.1 + random(`spark-alpha-${index}`) * 0.34,
            filter: "blur(0.4px)",
            boxShadow: `0 0 ${8 + spark.size * 2}px ${index % 3 === 0 ? accent : ember}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const AvatarBubble: React.FC<{
  person: FiresidePerson | undefined;
  accent: string;
  side?: "left" | "right";
}> = ({ person, accent, side = "right" }) => {
  const avatar = resolveAsset(person?.avatarUrl);
  const initials = (person?.name ?? (side === "right" ? "Guest" : "Host"))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div
      style={{
        position: "absolute",
        [side]: 72,
        top: 70,
        display: "flex",
        alignItems: "center",
        gap: 16,
        color: DEFAULT_TEXT,
      }}
    >
      {side === "right" ? (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, opacity: 0.7, textTransform: "uppercase", fontWeight: 900 }}>
            Guest
          </div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{person?.name ?? "Guest"}</div>
          <div style={{ color: accent, fontSize: 24, fontWeight: 800 }}>{person?.handle}</div>
        </div>
      ) : null}
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: "50%",
          border: `3px solid ${accent}`,
          overflow: "hidden",
          boxShadow: `0 0 38px ${accent}66`,
          background: "rgba(0,0,0,0.55)",
        }}
      >
        {avatar ? (
          <Img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: accent,
              fontSize: 34,
              fontWeight: 950,
            }}
          >
            {initials}
          </div>
        )}
      </div>
      {side === "left" ? (
        <div>
          <div style={{ fontSize: 20, opacity: 0.7, textTransform: "uppercase", fontWeight: 900 }}>
            Host
          </div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{person?.name ?? "Host"}</div>
          <div style={{ color: accent, fontSize: 24, fontWeight: 800 }}>{person?.handle}</div>
        </div>
      ) : null}
    </div>
  );
};

const CardScene: React.FC<{
  card: FiresideCard;
  index: number;
  localFrame: number;
  durationFrames: number;
  accent: string;
  ember: string;
  text: string;
  guest?: FiresidePerson;
  host?: FiresidePerson;
}> = ({ card, index, localFrame, durationFrames, accent, ember, text, guest, host }) => {
  const { fps } = useVideoConfig();
  const image = resolveAsset(card.imageUrl);
  const audio = resolveAsset(card.audioUrl);
  const enter = spring({ frame: localFrame, fps, config: { damping: 19, stiffness: 90 } });
  const exit = interpolate(localFrame, [durationFrames - fps * 0.7, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardTilt = interpolate(enter, [0, 1], [-4, index % 2 === 0 ? -1.2 : 1.2]);

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      {audio ? <Audio src={audio} volume={1} /> : null}
      {image ? (
        <Img
          src={image}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.44,
            filter: "saturate(0.95) contrast(1.12) brightness(0.58)",
            transform: `scale(${1.08 + enter * 0.05})`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(8,5,3,0.96) 0%, rgba(8,5,3,0.82) 45%, rgba(8,5,3,0.42) 100%)",
        }}
      />
      <EmberField accent={accent} ember={ember} />
      <AvatarBubble person={guest} accent={accent} />
      <AvatarBubble person={host} accent={accent} side="left" />

      <div
        style={{
          position: "absolute",
          left: 130,
          top: 228,
          width: 1010,
          minHeight: 520,
          padding: "56px 64px",
          background: "rgba(15,9,5,0.78)",
          border: `1px solid ${accent}66`,
          boxShadow: `0 34px 100px rgba(0,0,0,0.56), inset 0 0 44px ${ember}16`,
          transform: `translateY(${(1 - enter) * 46}px) rotate(${cardTilt}deg)`,
          opacity: enter,
        }}
      >
        <div
          style={{
            color: accent,
            textTransform: "uppercase",
            fontSize: 22,
            fontWeight: 950,
            letterSpacing: "0.14em",
            marginBottom: 24,
          }}
        >
          Insight {index + 1}
        </div>
        <div style={{ display: "grid", gap: 4, marginBottom: 34 }}>
          {splitTitle(card.title, 4).map((line) => (
            <div
              key={line}
              style={{
                color: text,
                fontSize: 72,
                lineHeight: 0.94,
                fontWeight: 950,
                letterSpacing: 0,
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div
          style={{
            color: "rgba(255,243,222,0.86)",
            fontSize: 34,
            lineHeight: 1.23,
            maxWidth: 820,
            fontWeight: 650,
          }}
        >
          {card.body}
        </div>
        {card.quote ? (
          <div
            style={{
              marginTop: 34,
              color: accent,
              fontSize: 38,
              lineHeight: 1.05,
              fontWeight: 900,
              borderLeft: `5px solid ${ember}`,
              paddingLeft: 24,
            }}
          >
            "{card.quote}"
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: 130,
          right: 130,
          bottom: 68,
          height: 4,
          background: "rgba(255,243,222,0.14)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round((localFrame / durationFrames) * 100)}%`,
            background: `linear-gradient(90deg, ${ember}, ${accent})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const getFiresideRecapDurationMs = (props: FiresideRecapProps | undefined) => {
  if (Number.isFinite(Number(props?.durationMs)) && Number(props?.durationMs) > 0) {
    return Number(props?.durationMs);
  }
  const cards = props?.cards && props.cards.length > 0 ? props.cards : defaultCards;
  return (
    (props?.introDurationMs ?? 6500) +
    cards.reduce((total, card) => total + (card.durationMs ?? 9000), 0) +
    (props?.outro?.durationMs ?? 8200)
  );
};

export const FiresideRecapScene: React.FC<FiresideRecapProps> = ({
  title = "Fireside Recap",
  subtitle = "Session notes from the RaidGuild campfire",
  introAudioUrl,
  introDurationMs = 6500,
  guest = {
    name: "Justice",
    handle: "@singularityhack",
    avatarUrl: "/assets/fireside_justice_avatar.jpg",
  },
  host = {
    name: "Dekan",
    handle: "@dekanbro",
  },
  backgroundUrl = DEFAULT_BG,
  cards,
  outro,
  accent = DEFAULT_ACCENT,
  ember = DEFAULT_EMBER,
  text = DEFAULT_TEXT,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = resolveAsset(backgroundUrl);
  const resolvedCards = cards && cards.length > 0 ? cards : defaultCards;
  const introFrames = Math.max(1, Math.round((introDurationMs / 1000) * fps));
  const cardTimeline = resolvedCards.reduce<Array<FiresideCard & { from: number; frames: number }>>(
    (items, card) => {
      const from = introFrames + items.reduce((total, item) => total + item.frames, 0);
      const frames = Math.max(1, Math.round(((card.durationMs ?? 9000) / 1000) * fps));
      items.push({ ...card, from, frames });
      return items;
    },
    [],
  );
  const cardsEnd = introFrames + cardTimeline.reduce((total, card) => total + card.frames, 0);
  const outroFrames = Math.round(((outro?.durationMs ?? 8200) / 1000) * fps);
  const outroAudio = resolveAsset(outro?.audioUrl);
  const introAudio = resolveAsset(introAudioUrl);
  const introReveal = spring({ frame, fps, config: { damping: 18, stiffness: 75 } });

  return (
    <AbsoluteFill style={{ background: "#080503", color: text, overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={introFrames}>
        {introAudio ? <Audio src={introAudio} volume={1} /> : null}
        {bg ? (
          <Img
            src={bg}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.68,
              filter: "saturate(1.1) contrast(1.08) brightness(0.64)",
              transform: `scale(${1.04 + introReveal * 0.04})`,
            }}
          />
        ) : null}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(90deg, rgba(8,5,3,0.92), rgba(8,5,3,0.64), rgba(8,5,3,0.86))",
          }}
        />
        <EmberField accent={accent} ember={ember} />
        <AvatarBubble person={guest} accent={accent} />
        <AvatarBubble person={host} accent={accent} side="left" />
        <div
          style={{
            position: "absolute",
            left: 132,
            bottom: 180,
            transform: `translateY(${(1 - introReveal) * 44}px)`,
            opacity: introReveal,
          }}
        >
          <div
            style={{
              color: accent,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: 24,
              fontWeight: 950,
              marginBottom: 28,
            }}
          >
            RaidGuild Fireside
          </div>
          <div style={{ fontSize: 112, lineHeight: 0.88, fontWeight: 950 }}>{title}</div>
          <div
            style={{
              marginTop: 28,
              fontSize: 38,
              lineHeight: 1.18,
              color: "rgba(255,243,222,0.78)",
              maxWidth: 940,
              fontWeight: 700,
            }}
          >
            {subtitle}
          </div>
        </div>
      </Sequence>

      {cardTimeline.map((card, index) => (
        <Sequence key={`${card.title}-${index}`} from={card.from} durationInFrames={card.frames}>
          <CardScene
            card={card}
            index={index}
            localFrame={frame - card.from}
            durationFrames={card.frames}
            accent={accent}
            ember={ember}
            text={text}
            guest={guest}
            host={host}
          />
        </Sequence>
      ))}

      <Sequence from={cardsEnd} durationInFrames={outroFrames}>
        {outroAudio ? <Audio src={outroAudio} volume={1} /> : null}
        {bg ? (
          <Img
            src={bg}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
              filter: "saturate(1.15) contrast(1.08) brightness(0.5)",
            }}
          />
        ) : null}
        <AbsoluteFill style={{ background: "rgba(8,5,3,0.68)" }} />
        <EmberField accent={accent} ember={ember} />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: accent, fontSize: 30, fontWeight: 950, marginBottom: 28 }}>
              {guest.handle} with {host.handle}
            </div>
            <div style={{ fontSize: 78, lineHeight: 0.98, fontWeight: 950 }}>
              {outro?.headline ?? "Watch the full interview"}
            </div>
            <div
              style={{
                marginTop: 38,
                color: "rgba(255,243,222,0.78)",
                fontSize: 36,
                fontWeight: 750,
              }}
            >
              on RaidGuild Portal
            </div>
            <div
              style={{
                marginTop: 26,
                color: accent,
                fontFamily: "monospace",
                fontSize: 42,
                fontWeight: 900,
              }}
            >
              {outro?.url ?? "portal.raidguild.org"}
            </div>
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
