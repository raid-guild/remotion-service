# Prism Template And Instance Pattern

Working notes for how the Prism Railway Template turns into a running Prism instance.

This doc pulls in the template/instance operating model from the local `../prism-railway-template` repo. It is meant to complement the platform stack notes in [015_prism_platform_stack.md](./015_prism_platform_stack.md).

## Core Pattern

The Prism Railway Template repo is source code plus service configuration for repeatable Prism deployments.

The pattern is:

```text
template repo
  -> clean Railway source project
  -> generated Railway template
  -> deployed Prism instance
  -> instance-specific secrets, auth, volumes, Discord config, target repos, and cron schedules
```

The template should stay free of runtime state:

- No local env files.
- No generated builds.
- No service volume contents.
- No target repo credentials.
- No machine-specific local app paths or ports.

Each deployed instance gets its own Railway project, secrets, volumes, Codex auth, Discord credentials, and target app records.

## Template Authoring Flow

Recommended template authoring flow:

1. Keep the repo public and free of runtime data.
2. Create a clean Railway project for the template source.
3. Add one Railway service per deployable service.
4. Configure root directories, public networking, health checks, volumes, variables, and cron services in that source project.
5. Smoke-test the source project.
6. Generate the Railway template from that source project.
7. Deploy the generated template into a fresh project and run post-deploy checks.

This means the repo is not the whole template by itself. Railway service configuration, volume attachment, networking, and template variable setup are part of the source project that generates the reusable template.

## Template Services

| Railway service | Source directory | Instance state |
| --- | --- | --- |
| `site` | `services/site` | Persistent `/data` volume for SQLite/runtime state. |
| `prism-memory` | `services/prism-memory` | Persistent `/data` volume for memory, knowledge, and runtime space data. |
| `discord-adapter` | `services/source-adapter` | Persistent `/data` volume for checkpoints, recordings, and recovery state. |
| `codex-runtime` | `services/codex-runtime` | Persistent `/data` volume for Codex auth and target workspaces. |
| `discord-sync-cron` | `services/prism-trigger` | No volume. Calls the Discord adapter `/sync` endpoint. |
| `memory-cron` | `services/prism-trigger` | No volume. Calls Prism Memory `/ops/memory/run`. |
| `knowledge-cron` | `services/prism-trigger` | No volume. Calls Prism Memory `/ops/knowledge/run`. |

Some repo docs still mention a transitional split with a separate `api` service. The current direction is that `site` owns the app API and SQLite-backed runtime state. If an instance still has a separate `api`, treat that as a migration state and check the instance's actual Railway services before changing env vars or runbooks.

## Instance Bring-Up

After deploying the template into a new Railway project:

1. Link the Railway CLI to the new project and environment.
2. Run site bootstrap/migrations for admin, catalog, and target state.
3. Confirm service health for `site`, `prism-memory`, `discord-adapter`, and `codex-runtime`.
4. SSH into `codex-runtime` and complete one-time Codex device auth with `CODEX_HOME` on the mounted volume.
5. Configure Discord credentials on `discord-adapter`.
6. Run a dry Discord sync before enabling recurring sync.
7. Configure cron schedules manually if the Railway template created cron services without schedules.
8. Add optional voice transcription credentials if voice capture is enabled.
9. Add optional target repo GitHub credentials if Codex needs private repo clone or push access.

Do not share raw bootstrap output publicly. Railway command output can include service environment variables.

## Required Runtime State

State that must survive redeploys:

| Service | Durable state |
| --- | --- |
| `site` | App database, admin/runtime state, target records, custom skills/workflows, request artifacts. |
| `prism-memory` | Memory data, knowledge data, active Prism space config, indexes, digest/memory outputs. |
| `discord-adapter` | Sync checkpoints, voice recordings, recovery data. |
| `codex-runtime` | Codex auth, session state, target workspaces. |

Codex auth is intentionally manual because the device-auth flow writes account auth into the mounted `CODEX_HOME`, usually `/data/codex`.

## Variable Pattern

Use Railway reference variables for service-to-service URLs and shared secrets wherever possible. This gives the Railway canvas visible service edges and avoids manual copying of internal URLs.

Common examples:

```text
site.NEXT_PUBLIC_API_BASE_URL=https://${{site.RAILWAY_PUBLIC_DOMAIN}}
site.API_INTERNAL_BASE_URL=http://${{site.RAILWAY_PRIVATE_DOMAIN}}:${{site.PORT}}
discord-adapter.APP_API_BASE_URL=http://${{site.RAILWAY_PRIVATE_DOMAIN}}:${{site.PORT}}
discord-adapter.CODEX_RUNTIME_BASE_URL=http://${{codex-runtime.RAILWAY_PRIVATE_DOMAIN}}:${{codex-runtime.PORT}}
discord-adapter.PRISM_API_BASE=https://${{prism-memory.RAILWAY_PUBLIC_DOMAIN}}
codex-runtime.APP_API_BASE_URL=http://${{site.RAILWAY_PRIVATE_DOMAIN}}:${{site.PORT}}
codex-runtime.PRISM_API_BASE=http://${{prism-memory.RAILWAY_PRIVATE_DOMAIN}}:${{prism-memory.PORT}}
memory-cron.PRISM_API_BASE=https://${{prism-memory.RAILWAY_PUBLIC_DOMAIN}}
knowledge-cron.PRISM_API_BASE=https://${{prism-memory.RAILWAY_PUBLIC_DOMAIN}}
```

Template-required user inputs commonly include:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- Voice transcription URL/key if voice transcription is enabled.
- `TARGET_REPO_GITHUB_TOKEN` if private target repositories need clone/push access.

Template-generated secrets commonly include:

- `SESSION_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `PRISM_API_KEY`
- `SOURCE_ADAPTER_TOKEN`

## Cron Schedule Pattern

Template instances may create cron services without recurring schedules. Treat schedules as a post-deploy Railway setting.

Suggested starting cadence:

| Service | Suggested schedule | Purpose |
| --- | --- | --- |
| `memory-cron` | Hourly | Processes inbox items, digests, memory, and seed outputs. |
| `knowledge-cron` | Daily | Promotes, validates, and indexes knowledge docs. |
| `discord-sync-cron` | Every 15-60 minutes after Discord setup | Pulls Discord message history through `discord-adapter /sync`. |

Keep `discord-sync-cron` disabled until Discord credentials, permissions, and at least one dry sync are verified.

## Agent API Split

Prism instances have two API surfaces:

- `/admin/*`: browser/admin UI routes that require an authenticated admin session.
- `/agent/*`: internal service-token routes for Codex Runtime, task-runner, source-adapter, and other machine callers.

Runtime agents should not call `/admin/*` with `x-service-token`. A `401` from an admin route usually means the wrong surface was used, not that the operation is unavailable.

Agents should prefer:

```text
PRISM_AGENT_API_BASE_URL
PRISM_AGENT_SERVICE_TOKEN
```

Fallback service env names:

```text
APP_API_BASE_URL
APP_API_SERVICE_TOKEN
```

Send service auth as:

```text
x-service-token: <token>
```

Common `/agent/*` surfaces include:

- Tasks.
- Skills.
- Workflows.
- Requests.
- Request artifacts.
- External refs.
- Branding and instance settings.
- Agent sessions.

Durable Prism-managed custom content should be written through the site API:

- Custom skills through `/agent/skills`.
- Custom workflows through `/agent/workflows`.
- Workflow outputs through request artifact routes.
- External records such as GitHub PRs, Discord messages, Railway deployments, and publishing targets through external refs.

Codex Runtime can create temporary local files during a run, but durable Prism instance content belongs in the site/API service.

## Local Development Boundary

Local development should use concrete loopback URLs, not Railway template references.

Examples:

```text
API_INTERNAL_BASE_URL=http://127.0.0.1:3100
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3100
APP_API_BASE_URL=http://127.0.0.1:3100
CODEX_RUNTIME_BASE_URL=http://127.0.0.1:3030
PRISM_API_BASE=http://127.0.0.1:8788
```

Do not commit machine-specific local target app data into shared target bootstrap manifests. Local paths, ports, and dev commands should remain operator-local or be created manually in a local admin/API instance.

Shared target bootstrap data should only include stable shared environments such as staging and production.

## Known Template Gaps

- Railway CLI volume creation has been unreliable in smoke testing; attach volumes in the template source project.
- Codex device auth remains manual because it writes auth into the mounted `CODEX_HOME`.
- Target app GitHub/Railway tokens remain operator-provided.
- Some planning docs still reference the old `site` plus `api` split; check current instance topology before applying older runbooks.
