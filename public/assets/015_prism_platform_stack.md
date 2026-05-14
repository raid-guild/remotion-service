# Prism Platform Stack

Working notes for the Prism platform model used by the DAOhaus maintenance workstream.

This doc summarizes the broader Prism Railway stack described in the Prism Railway Template docs and related operator notes. It is intended as a local reference for how the services fit together when using Prism as a Codex-first maintenance platform.

## High-Level Model

The Prism platform is a multi-service Railway stack for agentic operations.

At a high level:

- Codex handles operator execution.
- Prism Memory handles retrieval, knowledge, artifacts, and historical context.
- The site/API app holds durable request, task, workflow, execution, and artifact state.
- Transport adapters connect Discord or other external systems to the app/runtime flow.
- GitHub remains the source of truth for code review, merge state, and repository history.

The operational split is:

- Site/API owns durable state and orchestration.
- `codex-runtime` owns agent execution.
- `prism-memory` owns retrieval, knowledge, memory, and indexed artifacts.
- Adapters own ingress and egress with Discord or other channels.
- Trigger and cron workers own async and scheduled execution.

Template and instance operations are covered separately in [018_prism_template_instances.md](./018_prism_template_instances.md).

## Service Rundown

| Service | Role | Notes |
| --- | --- | --- |
| `app` / `web-api` | Main control plane | Stores requests, executions, linked repos, environments, workflows, skills, scripts, and artifacts. Exposes the app/admin/API surface. |
| `codex-runtime` | Agent execution service | Thin HTTP wrapper around the Codex CLI. Starts or resumes Codex sessions, manages workspaces, and returns model output to the app or adapter layer. |
| `prism-memory` | Memory and knowledge service | Handles artifacts, digests, knowledge docs, search, sources, indexing, and operational memory pipelines. |
| `discord-adapter` / transport adapter | External chat and voice bridge | Receives messages/events, forwards them into the app/runtime flow, and may capture recordings, transcripts, or delivery responses. |
| `trigger` / workflow worker | Async execution bridge | Kicks off queued executions, tasks, or workflow steps by connecting app state to runtime execution. |
| `cron` / scheduled worker | Recurring job runner | Runs scheduled maintenance, polling, summaries, proposal watchers, indexing cadence, and other recurring jobs. |
| Source / ingest workers | Optional ingestion layer | Pull docs, GitHub data, or other external source material into Prism Knowledge or Prism Memory. These may be split out when sync load should not live in the main app. |

## Codex Runtime Surface

The `codex-runtime` service is the narrow runtime boundary around the Codex CLI.

Typical endpoints:

- `GET /health`
- `GET /codex/health`
- `GET /skills`
- `POST /v1/responses`

Typical responsibilities:

- Start or resume Codex sessions with `codex exec` or `codex exec resume`.
- Persist auth and session state through `CODEX_HOME`.
- Manage target repo workspaces.
- Fetch and cache Prism/app-hosted skills.
- Return model output back to the app or adapter layer.

Expected external dependencies:

- Prism Memory API for skills and optional Prism context.
- App API for internal skill hosting and orchestration.
- GitHub token for private target repo access.
- Persistent volume, commonly mounted at `/data`, for Codex state and workspaces.

## System Flow

A normal execution flow looks like:

```text
Discord / web / external source
  -> adapter or app intake
  -> request in site/API
  -> task or workflow selected
  -> trigger worker starts execution
  -> codex-runtime runs or resumes Codex
  -> skills/scripts perform work
  -> artifacts and execution state are stored
  -> Prism Memory indexes durable outputs when appropriate
  -> GitHub stores code review and merge state
```

## Source Reference

The synced Prism docs source referenced by the running Prism system is:

- Source ID: `prism-railway-template-docs`
- Docs root: `docs`
- Indexed docs: 30
- Last synced commit: `db15330a053c94cbd9f6a310def5aa1432650a8b`
- Last synced at: `2026-05-12T15:44:09Z`

Known public artifact URL pattern:

```text
https://prism-memory-production-08e3.up.railway.app/artifacts/<artifact-id>
```

Example:

- https://prism-memory-production-08e3.up.railway.app/artifacts/20260504_205228Z-discord-voice-d44c8280

Knowledge inbox docs are not the same as public artifacts. A staged knowledge doc such as `knowledge/kb/triage/inbox/prism-railway-template-high-level-summary.md` may need an indexing/promote run before it is available through knowledge search, and it does not automatically receive an `/artifacts/...` URL.
