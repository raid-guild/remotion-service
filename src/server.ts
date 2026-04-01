import express from "express";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia, selectComposition } from "@remotion/renderer";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "node:fs";
import { access, copyFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { REMOTION_COMPOSITION_ID, REMOTION_SHORT_COMPOSITION_ID } from "./constants.js";
import { type SceneProps, type SegmentMetadata } from "./segmentTiming.js";

const PORT = Number(process.env.PORT ?? 3000);
const DEFAULT_PREFIX = "remotion";
const bucketName =
  process.env.PAPERCLIP_STORAGE_S3_BUCKET ?? process.env.REMOTION_STORAGE_S3_BUCKET;
const localOutputDir = process.env.REMOTION_LOCAL_OUTPUT_DIR;

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

if (!bucketName && !localOutputDir) {
  throw new Error(
    "No output configured. Set either PAPERCLIP_STORAGE_S3_BUCKET/REMOTION_STORAGE_S3_BUCKET (for S3) or REMOTION_LOCAL_OUTPUT_DIR (for local development).",
  );
}

const s3Client = bucketName
  ? new S3Client({
      region,
      endpoint,
      forcePathStyle,
    })
  : null;
const execFileAsync = promisify(execFile);
const localAssetRegistry = new Map<string, { filePath: string; contentType: string }>();
const WAVEFORM_BAR_COUNT = 72;

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

async function uploadToS3(localPath: string, key: string): Promise<{
  bucket: string | null;
  key: string;
  location: string;
}> {
  if (!bucketName) {
    if (!localOutputDir) {
      throw new Error(
        "Local output requested but REMOTION_LOCAL_OUTPUT_DIR is not set. This should not happen.",
      );
    }

    const baseDir = localOutputDir.replace(/\/+$/, "");
    const destination = path.join(baseDir, key);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(localPath, destination);

    return {
      bucket: null,
      key,
      location: destination,
    };
  }

  const stream = createReadStream(localPath);
  await s3Client!.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: stream,
      ContentType: "video/mp4",
    }),
  );

  return {
    bucket: bucketName,
    key,
    location: buildObjectKey(key),
  };
}

async function cleanupRenderArtifacts(options: {
  cleanupLocalizedSegments: (() => Promise<void>) | null;
  tmpFile: string;
}): Promise<void> {
  const { cleanupLocalizedSegments, tmpFile } = options;
  if (cleanupLocalizedSegments) {
    await cleanupLocalizedSegments();
  }

  await rm(tmpFile, { force: true });
}

function getAssetExtension(url: string, contentType: string | null): string {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname);
  if (ext) return ext;

  if (contentType?.includes("mpeg")) return ".mp3";
  if (contentType?.includes("wav")) return ".wav";
  if (contentType?.includes("mp4")) return ".m4a";
  if (contentType?.includes("aac")) return ".aac";
  if (contentType?.includes("ogg")) return ".ogg";
  return ".bin";
}

async function probeAudio(filePath: string): Promise<void> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-select_streams",
    "a:0",
    filePath,
  ]);

  if (!stdout.includes("[STREAM]")) {
    throw new Error(`Downloaded asset does not contain an audio stream: ${filePath}`);
  }
}

function allocateWaveformBars(durationsMs: number[], totalBars: number): number[] {
  if (durationsMs.length === 0) {
    return [];
  }

  const totalDurationMs = durationsMs.reduce((sum, duration) => sum + duration, 0);
  if (totalDurationMs <= 0) {
    return durationsMs.map((_duration, index) => (index === 0 ? totalBars : 0));
  }

  const allocations = durationsMs.map((duration) => (duration / totalDurationMs) * totalBars);
  const base = allocations.map((value) => Math.floor(value));
  let assigned = base.reduce((sum, value) => sum + value, 0);

  if (durationsMs.length <= totalBars) {
    for (let index = 0; index < base.length; index += 1) {
      if (base[index] === 0) {
        base[index] = 1;
        assigned += 1;
      }
    }
  }

  while (assigned > totalBars) {
    const candidate = base.findIndex((value) => value > 1);
    if (candidate === -1) {
      break;
    }
    base[candidate] -= 1;
    assigned -= 1;
  }

  const remainderOrder = allocations
    .map((value, index) => ({
      index,
      remainder: value - Math.floor(value),
    }))
    .sort((left, right) => right.remainder - left.remainder);

  let cursor = 0;
  while (assigned < totalBars && remainderOrder.length > 0) {
    base[remainderOrder[cursor % remainderOrder.length].index] += 1;
    assigned += 1;
    cursor += 1;
  }

  return base;
}

async function extractWaveformSamples(filePath: string, sampleCount: number): Promise<number[]> {
  if (sampleCount <= 0) {
    return [];
  }

  const pcm = await new Promise<Buffer>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-v",
      "error",
      "-i",
      filePath,
      "-ac",
      "1",
      "-ar",
      "1200",
      "-f",
      "f32le",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    const stderr: Buffer[] = [];

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg failed while extracting waveform from ${filePath}: ${Buffer.concat(stderr).toString("utf8")}`,
          ),
        );
        return;
      }

      resolve(Buffer.concat(chunks));
    });
  });

  const floatCount = Math.floor(pcm.length / 4);
  if (floatCount === 0) {
    return Array.from({ length: sampleCount }, () => 0);
  }

  const amplitudes = Array.from({ length: floatCount }, (_value, index) => {
    return Math.abs(pcm.readFloatLE(index * 4));
  });

  const samplesPerBucket = Math.max(1, Math.floor(amplitudes.length / sampleCount));

  return Array.from({ length: sampleCount }, (_value, index) => {
    const start = index * samplesPerBucket;
    const end = index === sampleCount - 1 ? amplitudes.length : Math.min(amplitudes.length, start + samplesPerBucket);
    if (start >= amplitudes.length) {
      return 0;
    }

    let sumSquares = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      sumSquares += amplitudes[cursor] * amplitudes[cursor];
    }

    return Math.sqrt(sumSquares / Math.max(1, end - start));
  });
}

async function buildWaveform(filePaths: string[], durationsMs: number[]): Promise<number[]> {
  if (filePaths.length === 0) {
    return Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.12);
  }

  const barsPerSegment = allocateWaveformBars(durationsMs, WAVEFORM_BAR_COUNT);
  const segmentSamples = await Promise.all(
    filePaths.map((filePath, index) => extractWaveformSamples(filePath, barsPerSegment[index] ?? 0)),
  );

  const merged = segmentSamples.flat().slice(0, WAVEFORM_BAR_COUNT);
  while (merged.length < WAVEFORM_BAR_COUNT) {
    merged.push(0);
  }

  const max = merged.reduce((currentMax, value) => Math.max(currentMax, value), 0);
  if (max === 0) {
    return merged.map(() => 0.12);
  }

  return merged.map((value) => {
    const normalized = value / max;
    return Number((0.12 + normalized * 0.88).toFixed(4));
  });
}

async function localizeSegments(segments: SegmentMetadata[]): Promise<{
  localizedSegments: SegmentMetadata[];
  localFilePaths: string[];
  cleanup: () => Promise<void>;
}> {
  if (segments.length === 0) {
    return {
      localizedSegments: segments,
      localFilePaths: [],
      cleanup: () => Promise.resolve(),
    };
  }

  const assetDir = await mkdtemp(path.join(tmpdir(), "remotion-audio-"));
  const registeredAssetIds: string[] = [];

  try {
    const localFilePaths: string[] = [];
    const localizedSegments = await Promise.all(
      segments.map(async (segment, index) => {
        console.log("Downloading segment asset", {
          index,
          speaker: segment.speaker,
          source: segment.url,
        });

        const response = await fetch(segment.url);
        if (!response.ok || !response.body) {
          throw new Error(
            `Failed to download segment ${index} from source URL: HTTP ${response.status}`,
          );
        }

        const contentType = response.headers.get("content-type") ?? "application/octet-stream";
        const filePath = path.join(
          assetDir,
          `${String(index).padStart(2, "0")}-${randomUUID()}${getAssetExtension(
            segment.url,
            contentType,
          )}`,
        );

        await pipeline(
          Readable.fromWeb(response.body as unknown as NodeReadableStream),
          createWriteStream(filePath),
        );
        await access(filePath);
        await probeAudio(filePath);
        localFilePaths[index] = filePath;

        const assetId = randomUUID();
        registeredAssetIds.push(assetId);
        localAssetRegistry.set(assetId, { filePath, contentType });

        console.log("Segment asset ready", {
          index,
          speaker: segment.speaker,
          contentType,
          localAssetId: assetId,
        });

        return {
          ...segment,
          url: `http://127.0.0.1:${PORT}/render-assets/${assetId}`,
        };
      }),
    );

    return {
      localizedSegments,
      localFilePaths,
      cleanup: async () => {
        registeredAssetIds.forEach((assetId) => localAssetRegistry.delete(assetId));
        await rm(assetDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    registeredAssetIds.forEach((assetId) => localAssetRegistry.delete(assetId));
    await rm(assetDir, { recursive: true, force: true });
    throw error;
  }
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

type ClipManifestClip = {
  id: string;
  start: number; // seconds
  end: number; // seconds
  title: string;
  captions?: {
    start: number;
    end: number;
    text: string;
  }[];
};

type ClipManifest = {
  video: string;
  clips: ClipManifestClip[];
  brandId?: string;
    // Optional S3 key for the source video; if provided, the server
    // will download the object directly from S3 instead of expecting
    // an externally reachable HTTP URL.
    videoKey?: string;
};

async function resolveVideoUrl(raw: string): Promise<string> {
  const value = raw.trim();
  if (!value) {
    throw new Error("Manifest is missing a non-empty video field.");
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const filePath = value.startsWith("file://") ? value.replace(/^file:\/\//, "") : value;

  const assetId = randomUUID();
  localAssetRegistry.set(assetId, {
    filePath,
    contentType: "video/mp4",
  });

  return `http://127.0.0.1:${PORT}/render-assets/${assetId}`;
}

async function localizeVideoSource(options: {
  video?: string;
  videoKey?: string;
}): Promise<{
  url: string;
  cleanup: () => Promise<void>;
}> {
  const { video, videoKey } = options;

  // 1) Prefer explicit S3 key if provided
  if (videoKey) {
    if (!bucketName || !s3Client) {
      throw new Error("Cannot use videoKey without S3 bucket configuration.");
    }

    const tmpFile = path.join(tmpdir(), `remotion-video-${randomUUID()}.mp4`);

    console.log("Downloading source video from S3", {
      bucket: bucketName,
      key: videoKey,
      tmpFile,
    });

    const object = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: videoKey,
      }),
    );

    if (!object.Body) {
      throw new Error("S3 GetObject returned an empty body for videoKey.");
    }

    await pipeline(
      object.Body as unknown as Readable,
      createWriteStream(tmpFile),
    );

    const assetId = randomUUID();
    localAssetRegistry.set(assetId, {
      filePath: tmpFile,
      contentType: "video/mp4",
    });

    return {
      url: `http://127.0.0.1:${PORT}/render-assets/${assetId}`,
      cleanup: async () => {
        localAssetRegistry.delete(assetId);
        await rm(tmpFile, { force: true });
      },
    };
  }

  // 2) If we have a HTTP(S) URL, download it once and serve locally
  if (video && (video.startsWith("http://") || video.startsWith("https://"))) {
    const tmpFile = path.join(tmpdir(), `remotion-video-${randomUUID()}.mp4`);

    console.log("Downloading source video from URL", {
      src: video,
      tmpFile,
    });

    const response = await fetch(video);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download source video from ${video}: HTTP ${response.status}`);
    }

    await pipeline(
      Readable.fromWeb(response.body as unknown as NodeReadableStream),
      createWriteStream(tmpFile),
    );

    const assetId = randomUUID();
    localAssetRegistry.set(assetId, {
      filePath: tmpFile,
      contentType: "video/mp4",
    });

    return {
      url: `http://127.0.0.1:${PORT}/render-assets/${assetId}`,
      cleanup: async () => {
        localAssetRegistry.delete(assetId);
        await rm(tmpFile, { force: true });
      },
    };
  }

  // 3) Fallback: Local file path (for development)
  if (video) {
    const filePath = video.startsWith("file://") ? video.replace(/^file:\/\//, "") : video;
    console.log("Using local video file", { filePath });

    const assetId = randomUUID();
    localAssetRegistry.set(assetId, {
      filePath,
      contentType: "video/mp4",
    });

    return {
      url: `http://127.0.0.1:${PORT}/render-assets/${assetId}`,
      cleanup: async () => {
        localAssetRegistry.delete(assetId);
      },
    };
  }

  throw new Error("Either video or videoKey must be provided in the manifest.");
}

app.get("/healthz", (_req, res) => {
  res.sendStatus(200);
});

app.get("/render-assets/:assetId", (req, res) => {
  const asset = localAssetRegistry.get(req.params.assetId);
  if (!asset) {
    console.warn("render-assets: missing asset", { assetId: req.params.assetId });
    res.sendStatus(404);
    return;
  }

  console.log("render-assets: serving asset", {
    assetId: req.params.assetId,
    filePath: asset.filePath,
    contentType: asset.contentType,
  });

  res.setHeader("Content-Type", asset.contentType);
  createReadStream(asset.filePath).pipe(res);
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

app.post("/render-clips", async (req, res) => {
  const body = (req.body ?? {}) as Partial<ClipManifest>;
  let cleanupVideo: (() => Promise<void>) | null = null;

  try {
    if (!body || typeof body !== "object") {
      throw new Error("Body must be a JSON object.");
    }

    if (!Array.isArray(body.clips) || body.clips.length === 0) {
      throw new Error("`clips` must be a non-empty array.");
    }

    if (typeof body.video !== "string" && typeof body.videoKey !== "string") {
      throw new Error("Either `video` (URL or path) or `videoKey` (S3 key) must be provided.");
    }

    const localizedVideo = await localizeVideoSource({
      video: typeof body.video === "string" ? body.video : undefined,
      videoKey: typeof body.videoKey === "string" ? body.videoKey : undefined,
    });
    cleanupVideo = localizedVideo.cleanup;
    const videoUrl = localizedVideo.url;
    const brandId = typeof body.brandId === "string" ? body.brandId : undefined;

    const serveUrl = await ensureBundle();

    const results: Array<{
      id: string;
      bucket: string | null;
      key: string;
      endpoint?: string | undefined;
      location: string;
    }> = [];

    for (const clip of body.clips) {
      if (!clip || typeof clip !== "object") {
        throw new Error("Every clip must be an object.");
      }

      const { id, start, end, title } = clip;
      if (!id || typeof id !== "string") {
        throw new Error("Each clip must have an `id` string.");
      }
      if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        throw new Error(`Clip ${id} must have numeric start/end seconds with end > start.`);
      }
      if (!title || typeof title !== "string") {
        throw new Error(`Clip ${id} must have a non-empty title.`);
      }

      const captions = Array.isArray(clip.captions)
        ? clip.captions
            .filter((cue) =>
              cue && typeof cue.start === "number" && typeof cue.end === "number" && typeof cue.text === "string",
            )
            .map((cue) => ({
              start: cue.start,
              end: cue.end,
              text: cue.text,
            }))
        : [];

      const props = {
        videoUrl,
        title,
        clipId: id,
        brandId,
        startSeconds: start,
        endSeconds: end,
        captions,
      } satisfies Record<string, unknown>;

      const outputKey = composeKey(`${id}-${Date.now()}`, REMOTION_SHORT_COMPOSITION_ID);
      const tmpFile = path.join(tmpdir(), `remotion-clip-${id}-${randomUUID()}.mp4`);

      console.log("Short clip render requested", {
        composition: REMOTION_SHORT_COMPOSITION_ID,
        clipId: id,
        title,
        start,
        end,
        outputKey,
      });

      const videoConfig = await selectComposition({
        serveUrl,
        id: REMOTION_SHORT_COMPOSITION_ID,
        inputProps: props,
      });

      await renderMedia({
        serveUrl,
        composition: videoConfig,
        outputLocation: tmpFile,
        inputProps: props,
        codec: "h264",
        enforceAudioTrack: true,
        jpegQuality: 90,
        logLevel: "error",
        timeoutInMilliseconds: 120000,
        concurrency: 1,
      });

      const upload = await uploadToS3(tmpFile, outputKey);
      await rm(tmpFile, { force: true });

      results.push({
        id,
        bucket: upload.bucket ?? bucketName ?? null,
        key: upload.key,
        endpoint,
        location: upload.location,
      });
    }

    res.status(201).json({
      video: body.video,
      clips: results,
    });
  } catch (error) {
    const detail = (error as Error)?.message ?? "Unknown clip render error";
    console.error("render-clips failed", error);
    res.status(400).json({
      error: "Invalid clip render input",
      detail,
    });
  } finally {
    if (cleanupVideo) {
      try {
        await cleanupVideo();
      } catch (error) {
        console.error("Video cleanup after render-clips failed", error);
      }
    }
  }
});

app.post("/render", async (req, res) => {
  const composition = String(req.body.composition ?? REMOTION_COMPOSITION_ID);
  const requestedKey = typeof req.body.outputKey === "string" ? req.body.outputKey.trim() : undefined;
  const outputKey = composeKey(requestedKey, composition);
  const tmpFile = path.join(tmpdir(), `remotion-${randomUUID()}.mp4`);
  let cleanupLocalizedSegments: (() => Promise<void>) | null = null;

  try {
    const rawProps =
      typeof req.body.props === "object" && req.body.props !== null ? req.body.props : {};
    const normalizedSegments = normalizeSegments((rawProps as Record<string, unknown>).segments);
    const { localizedSegments, localFilePaths, cleanup } = await localizeSegments(normalizedSegments);
    cleanupLocalizedSegments = cleanup;
    const waveform = await buildWaveform(
      localFilePaths,
      normalizedSegments.map((segment) => segment.durationMs),
    );
    const props: SceneProps & Record<string, unknown> = {
      ...rawProps,
      segments: localizedSegments,
      waveform,
    };
    console.log("Render requested", {
      composition,
      propsPreview: {
        title: props?.title,
        segments: Array.isArray(props?.segments) ? props.segments.length : undefined,
        waveformBars: props.waveform?.length,
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
      concurrency: 1,
      timeoutInMilliseconds: 120000,
      onDownload: (src) => {
        console.log("Renderer downloading media", { src });
        return ({ percent, downloaded, totalSize }) => {
          if (percent === 1 || (totalSize !== null && downloaded >= totalSize)) {
            console.log("Renderer media download complete", { src, downloaded, totalSize });
          }
        };
      },
      onBrowserLog: ({ text, type }) => {
        if (type === "warning" || type === "error") {
          console.warn("Browser log", { type, text });
        }
      },
    });
    console.log("renderMedia complete", { composition, outputLocation: tmpFile });

    const upload = await uploadToS3(tmpFile, outputKey);
    console.log("uploadToS3 complete", {
      bucket: upload.bucket ?? bucketName,
      key: upload.key,
      location: upload.location,
    });

    console.log("Sending render response", {
      bucket: upload.bucket ?? bucketName,
      key: upload.key,
      endpoint,
      location: upload.location,
    });

    res.status(201).json({
      bucket: upload.bucket ?? bucketName,
      key: upload.key,
      endpoint,
      location: upload.location,
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
    const cleanupTask = cleanupRenderArtifacts({
      cleanupLocalizedSegments,
      tmpFile,
    }).then(() => {
      console.log("Render cleanup complete", { outputKey });
    });

    if (res.headersSent) {
      void cleanupTask.catch((error) => {
        console.error("Render cleanup failed after response", error);
      });
      return;
    }

    try {
      await cleanupTask;
    } catch (error) {
      console.error("Render cleanup failed before response", error);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Remotion service listening on port ${PORT}`);
});
