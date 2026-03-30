import express from "express";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia, selectComposition } from "@remotion/renderer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { REMOTION_COMPOSITION_ID } from "./constants.js";
import { type SegmentMetadata } from "./segmentTiming.js";

const PORT = Number(process.env.PORT ?? 3000);
const DEFAULT_PREFIX = "remotion";
const bucketName =
  process.env.PAPERCLIP_STORAGE_S3_BUCKET ?? process.env.REMOTION_STORAGE_S3_BUCKET;

const region =
  process.env.PAPERCLIP_STORAGE_S3_REGION ??
  process.env.REMOTION_STORAGE_S3_REGION ??
  "us-east-1";
const endpoint =
  process.env.PAPERCLIP_STORAGE_S3_ENDPOINT ??
  process.env.REMOTION_STORAGE_S3_ENDPOINT;
const forcePathStyle =
  (process.env.PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE ??
    process.env.REMOTION_STORAGE_S3_FORCE_PATH_STYLE ??
    "false") === "true";
const prefix =
  (process.env.PAPERCLIP_STORAGE_S3_PREFIX ??
    process.env.REMOTION_STORAGE_S3_PREFIX ??
    DEFAULT_PREFIX)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .trim();

if (!bucketName) {
  throw new Error(
    "S3 storage bucket is not configured. Set PAPERCLIP_STORAGE_S3_BUCKET or REMOTION_STORAGE_S3_BUCKET.",
  );
}

const s3Client = new S3Client({
  region,
  endpoint,
  forcePathStyle,
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  const body = req.body as Record<string, unknown> | undefined;
  const props = body?.props as Record<string, unknown> | undefined;
  console.log("Incoming request", {
    method: req.method,
    path: req.path,
    composition: body?.composition,
    outputKey: body?.outputKey,
    title: props?.title,
    segmentCount: Array.isArray(props?.segments) ? props.segments.length : undefined,
  });
  next();
});

type BundleResult = Awaited<ReturnType<typeof bundle>>;

let bundleCache: BundleResult | null = null;
let bundlePromise: Promise<BundleResult> | null = null;

const bundleEntry = path.resolve("src/index.ts");

async function ensureBundle(): Promise<BundleResult> {
  if (bundleCache) return bundleCache;
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: bundleEntry,
    }).catch((err) => {
      bundlePromise = null;
      throw err;
    });
  }
  const bundleResult = await bundlePromise;
  bundleCache = bundleResult;
  return bundleResult;
}

function buildObjectKey(value: string): string {
  const sanitized = value.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!prefix) return sanitized;
  return `${prefix}/${sanitized}`;
}

function ensureMp4(fileName: string): string {
  if (fileName.toLowerCase().endsWith(".mp4")) return fileName;
  return `${fileName}.mp4`;
}

function composeKey(suggested?: string, compositionId?: string): string {
  const base =
    (suggested && suggested.trim()) ||
    `${(compositionId ?? "remotion").replace(/[^a-z0-9-_]/gi, "-")}-${Date.now()}`;
  return buildObjectKey(ensureMp4(base));
}

async function uploadToS3(localPath: string, key: string): Promise<void> {
  const stream = createReadStream(localPath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: stream,
      ContentType: "video/mp4",
    }),
  );
}

function normalizeSegments(input: unknown): SegmentMetadata[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new Error("`props.segments` must be an array.");
  }

  return input.map((segment, index) => {
    if (typeof segment !== "object" || segment === null) {
      throw new Error(`Segment at index ${index} must be an object.`);
    }

    const candidate = segment as Partial<SegmentMetadata>;
    const speaker = typeof candidate.speaker === "string" ? candidate.speaker.trim() : "";
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    const durationMs = Number(candidate.durationMs);

    if (!url) {
      throw new Error(`Segment at index ${index} is missing a valid \`url\`.`);
    }

    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error(`Segment at index ${index} must include a positive \`durationMs\`.`);
    }

    return {
      speaker: speaker || `segment-${index + 1}`,
      url,
      durationMs,
      color: typeof candidate.color === "string" ? candidate.color : undefined,
    };
  });
}

app.get("/healthz", (_req, res) => {
  res.sendStatus(200);
});

app.get("/compositions", async (_req, res) => {
  try {
    const serveUrl = await ensureBundle();
    const comps = await getCompositions(serveUrl);
    res.json(
      comps.map((comp) => ({
        id: comp.id,
        durationInFrames: comp.durationInFrames,
        fps: comp.fps,
        width: comp.width,
        height: comp.height,
      })),
    );
  } catch (error) {
    console.error("Failed to list compositions", error);
    res.status(500).json({ error: "Unable to list compositions" });
  }
});

app.post("/render", async (req, res) => {
  const composition = String(req.body.composition ?? REMOTION_COMPOSITION_ID);
  const requestedKey = typeof req.body.outputKey === "string" ? req.body.outputKey.trim() : undefined;
  const outputKey = composeKey(requestedKey, composition);
  const tmpFile = path.join(tmpdir(), `remotion-${randomUUID()}.mp4`);

  try {
    const rawProps =
      typeof req.body.props === "object" && req.body.props !== null ? req.body.props : {};
    const props = {
      ...rawProps,
      segments: normalizeSegments((rawProps as Record<string, unknown>).segments),
    };
    console.log("Render requested", {
      composition,
      propsPreview: {
        title: props?.title,
        segments: Array.isArray(props?.segments) ? props.segments.length : undefined,
      },
      outputKey,
    });
    const serveUrl = await ensureBundle();
    const videoConfig = await selectComposition({
      serveUrl,
      id: composition,
      inputProps: props,
      onBrowserDownload: ({ chromeMode }) => {
        console.log("Ensuring Chromium is available", { chromeMode });
        return {
          version: null,
          onProgress: () => undefined,
        };
      },
    });
    console.log("renderMedia start", { composition, outputLocation: tmpFile });
    await renderMedia({
      serveUrl,
      composition: videoConfig,
      outputLocation: tmpFile,
      inputProps: props,
      codec: "h264",
      enforceAudioTrack: true,
      jpegQuality: 90,
      logLevel: "error",
      onBrowserLog: ({ text, type }) => {
        if (type === "warning" || type === "error") {
          console.warn("Browser log", { type, text });
        }
      },
    });
    console.log("renderMedia complete", { composition, outputLocation: tmpFile });

    await uploadToS3(tmpFile, outputKey);
    console.log("uploadToS3 complete", { bucket: bucketName, key: outputKey });

    res.status(201).json({
      bucket: bucketName,
      key: outputKey,
      endpoint,
    });
  } catch (error) {
    const detail = (error as Error)?.message ?? "Unknown render error";
    const isValidationError =
      detail.includes("`props.segments`") || detail.includes("Segment at index");
    console.error("Render failed", error);
    res.status(isValidationError ? 400 : 500).json({
      error: isValidationError ? "Invalid render input" : "Render failed",
      detail,
    });
  } finally {
    await rm(tmpFile, { force: true });
  }
});

app.listen(PORT, () => {
  console.log(`Remotion service listening on port ${PORT}`);
});
