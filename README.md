# Dark Factory Remotion Service

Railway-ready Remotion render worker for the Dark Factory stack. Provides:

- Remotion Studio for layout iteration
- A render service for long-form scenes
- A clip rendering pipeline that cuts shorts from a single source video

## Local development

### Studio preview

Use Remotion Studio to iterate on compositions (e.g. `DarkFactoryShortClip`):

```bash
npx remotion studio
```

This serves the editor UI (by default on port 3000) and uses the compositions defined in `src/Root.tsx`.

### Render service

The render service exposes HTTP endpoints for server-side rendering. Run it locally with a filesystem output target:

```bash
REMOTION_LOCAL_OUTPUT_DIR=./renders/remotion npm start
```

By default the service listens on `PORT` (env, defaults to `3000`). In development it’s often convenient to run it on a different port from Studio, for example:

```bash
PORT=4000 REMOTION_LOCAL_OUTPUT_DIR=./renders/remotion npm start
```

Rendered MP4s will appear under `renders/remotion/`.

## Clip manifests

The service can render multiple short clips from a single source video using a JSON manifest. See `dta-local-clip-manifest.json` for an example used during development.

Manifest shape:

```jsonc
{
  "video": "/absolute/or/relative/path/to/source.mp4" ,
  "brandId": "raidguild",            // optional, passed through to the ShortScene brand config
  "authorHandle": "@0xjustice",      // optional, shown under the clip title
  "avatarUrl": "/assets/avatar.png",  // optional, replaces the default hero image when present
  "transcriptPath": "/path/to/transcript.json", // optional, see Captions section
  "clips": [
    {
      "id": "coordination-not-sufficient", // used as clipId and in output filename
      "start": 537.2,       // seconds in source video
      "end": 561.5,         // seconds in source video
      "title": "Digital Twin Agents" // title shown in the ShortScene composition
    }
  ]
}
```

Instead of `video`, you can also supply `videoKey` (an S3 key) when the worker is configured with S3 credentials.

## Synchronous clip rendering

The original (synchronous) endpoint blocks until all clips are rendered and uploaded. This is convenient for local CLI use, but not ideal behind proxies with short timeouts.

```bash
curl -X POST "http://localhost:4000/render-clips" \
  -H 'content-type: application/json' \
  --data-binary @dta-local-clip-manifest.json
```

Response shape:

```jsonc
{
  "video": "...",          // echo of manifest video/videoKey
  "clips": [
    {
      "id": "coordination-not-sufficient",
      "bucket": null,      // or S3 bucket name
      "key": "remotion/coordination-not-sufficient-...mp4",
      "endpoint": "...",  // S3 endpoint when configured
      "location": "..."    // absolute path (local) or S3 object key
    }
  ]
}
```

## Asynchronous clip rendering (Railway-friendly)

For environments like Railway where a single HTTP request cannot stay open for long-running work, use the async job API.

### 1. Start a job

```bash
curl -X POST "http://localhost:4000/render-clips-async" \
  -H 'content-type: application/json' \
  --data-binary @dta-local-clip-manifest.json
```

Example response:

```jsonc
{
  "jobId": "c1f0...",
  "status": "pending",         // "pending" | "running" | "completed" | "failed"
  "createdAt": "2026-04-01T18:40:00.000Z",
  "inputSummary": {
    "video": "/path/to/source.mp4",
    "videoKey": null,
    "clipCount": 10
  }
}
```

The server immediately returns `202 Accepted` while the clips render in the background.

### 2. Poll job status

```bash
curl "http://localhost:4000/render-clips-async/<jobId>"
```

Example completed job:

```jsonc
{
  "id": "c1f0...",
  "status": "completed",
  "createdAt": "...",
  "updatedAt": "...",
  "inputSummary": { "video": "...", "videoKey": null, "clipCount": 10 },
  "result": {
    "video": "...",
    "clips": [
      { "id": "coordination-not-sufficient", "bucket": null, "key": "...", "location": "..." }
    ]
  }
}
```

If the job fails, `status` will be `"failed"` and the record will include an `error` string.

## Captions

Short clips can include captions in two ways:

1. **Explicit per-clip captions in the manifest**

   Each clip can define a `captions` array with times relative to the clip start:

   ```jsonc
   {
     "id": "example",
     "start": 0,
     "end": 10,
     "title": "Digital Twin Agents",
     "captions": [
       { "start": 0.2, "end": 1.4, "text": "First line" },
       { "start": 1.4, "end": 3.0, "text": "Second line" }
     ]
   }
   ```

2. **Auto-derived from a transcript (Whisper style)**

   If the manifest has a `transcriptPath` pointing at a JSON file with a top-level `segments` array, the server will auto-generate caption cues for clips that don’t already define `captions`.

   Expected transcript shape (Whisper-like):

   ```jsonc
   {
     "segments": [
       { "start": 537.20, "end": 544.00, "text": "And what I've seen is that..." },
       { "start": 544.00, "end": 552.00, "text": "Coordination is necessary, but not sufficient..." }
     ]
   }
   ```

   For each clip, the server:

   - Slices segments whose absolute `start`/`end` overlap the clip’s `[start, end]` window.
   - Converts them into clip-relative `start`/`end` seconds.
   - Drops very short fragments (less than ~0.5s) to avoid “flashing” captions at the clip boundaries.

The `ShortScene` composition animates captions word-by-word and uses `captions` passed via props.

## Long-form scene rendering

The main scene composition (`REMOTION_COMPOSITION_ID`, currently `DarkFactoryScene`) is rendered via the `/render` endpoint.

### Synchronous scene render

```bash
curl -X POST "http://localhost:4000/render" \
  -H 'content-type: application/json' \
  -d '{"composition":"DarkFactoryScene","props":{...}}'
```

Request body:

- `composition?: string` – optional; defaults to `REMOTION_COMPOSITION_ID` when omitted.
- `outputKey?: string` – optional suggested output key; falls back to an auto-generated one.
- `props?: object` – props for the scene. For `DarkFactoryScene`, this usually includes:
  - `title?: string`
  - `accent?: string`
  - `segments?: { speaker: string; url: string; durationMs: number; color?: string }[]`

Response:

```jsonc
{
  "bucket": null,             // or S3 bucket name
  "key": "remotion/daily-brief-...mp4",
  "endpoint": "...",         // S3 endpoint when configured
  "location": "...",          // absolute path (local) or S3 object key
  "url": "...",               // public/CDN URL when REMOTION_STORAGE_PUBLIC_BASE_URL is set
  "proxyUrl": "..."           // service proxy URL for private/local outputs
}
```

### Asynchronous scene render (Railway-friendly)

Use the async API to avoid long-lived HTTP connections when rendering full scenes.

1. **Start a job**

```bash
curl -X POST "http://localhost:4000/render-async" \
  -H 'content-type: application/json' \
  -d '{"composition":"DarkFactoryScene","props":{...}}'
```

Example response:

```jsonc
{
  "jobId": "b7e1...",
  "status": "pending",          // "pending" | "running" | "completed" | "failed"
  "createdAt": "2026-04-01T18:50:00.000Z",
  "inputSummary": {
    "composition": "DarkFactoryScene",
    "hasSegments": true
  }
}
```

2. **Poll job status**

```bash
curl "http://localhost:4000/render-async/<jobId>"
```

On success:

```jsonc
{
  "id": "b7e1...",
  "status": "completed",
  "createdAt": "...",
  "updatedAt": "...",
  "inputSummary": { "composition": "DarkFactoryScene", "hasSegments": true },
  "result": {
    "bucket": null,
    "key": "remotion/daily-brief-...mp4",
    "endpoint": "...",
    "location": "...",
    "url": "...",
    "proxyUrl": "..."
  }
}
```

If something fails, `status` will be `"failed"` and an `error` string will be present.

## Railway notes

- Prefer the async `/render-clips-async` and `/render-async` APIs instead of the synchronous `/render-clips` and `/render` when running on Railway, to avoid proxy timeouts on long renders.
- Configure your S3 bucket and region via `PAPERCLIP_STORAGE_S3_*` or `REMOTION_STORAGE_S3_*` env vars as needed, or use `REMOTION_LOCAL_OUTPUT_DIR` for local filesystem output.
- Set `REMOTION_STORAGE_PUBLIC_BASE_URL` or `PAPERCLIP_STORAGE_PUBLIC_BASE_URL` when the bucket/CDN is public; render responses will include `url`.
- Set `REMOTION_SERVICE_PUBLIC_URL` to the deployed service origin; render responses will include `proxyUrl` values like `/render-outputs/<key>` that stream private S3/local outputs through the service.
