# Prism Site/API Model

Working notes for the Prism site/API service model.

The site/API is the orchestration layer and system of record for the Prism platform. It owns the user-facing and machine-facing state that lets adapters, runtimes, workflows, and memory services coordinate without treating any one chat message or runtime process as the source of truth.

## Core Responsibility

The site/API owns:

- User-facing state.
- Execution state.
- Links between repos, environments, requests, workflows, tasks, skills, scripts, and artifacts.
- Internal APIs used by adapters, runtime services, and workers.
- Operator visibility into what happened, what is running, and what needs review.

In one line:

```text
site/API = control plane
```

## Object Model

### Requests

A request is an intake object.

It usually means someone asked for something, or the system detected something worth handling.

Requests should carry:

- Intent.
- Status.
- Context.
- Linked target app, repo, or environment.
- Approval state or human gates.
- Links to tasks, workflows, executions, and artifacts created from the request.

Design rule:

```text
Keep requests about intent.
```

### Tasks

A task is a runnable unit.

Tasks are useful for scheduled or triggerable work such as:

- Polling.
- Maintenance checks.
- Proposal watchers.
- Daily or weekly summaries.
- Sync jobs.
- One-step utility runs.

A task can run logic directly, or it can kick off a workflow when the work needs multiple coordinated steps.

Design rule:

```text
Keep tasks narrow and runnable.
```

### Skills And Scripts

Skills are reusable capabilities the agent/runtime can call. Scripts are the concrete implementation pieces behind some of those capabilities.

Good skill/script boundaries are narrow and composable:

- Create issue.
- Inspect repo.
- Summarize source.
- Publish content.
- Check proposal state.
- Generate maintenance report.
- Sync source docs.

Skills should describe reusable capability. Scripts should hold concrete execution details.

Design rule:

```text
Keep skills composable and scripts implementation-focused.
```

### Workflows

A workflow is a multi-step process definition.

Workflows chain steps such as:

```text
intake -> analyze -> draft -> review -> publish
```

Common workflow traits:

- Multiple steps.
- Optional human gates.
- Links to runtime executions.
- Links to produced artifacts.
- Status that survives across retries and pauses.

Workflows are where process should be encoded. A workflow should not be just a long one-off prompt if the process needs reliable state, review, or repeatability.

Design rule:

```text
Keep workflows about process.
```

### Artifacts

Artifacts are durable outputs and evidence.

Examples:

- Meeting summaries.
- Voice transcripts.
- Generated docs.
- Reports.
- Run outputs.
- Review notes.
- Digest files.
- Published summaries.

Artifacts are what the system keeps after execution. They can be linked from requests, executions, workflows, and Prism Memory indexes.

Design rule:

```text
Keep artifacts about outputs.
```

## Relationship Between Objects

The normal chain is:

```text
Something creates a request
  -> the app decides whether to run a task or workflow
  -> the workflow calls skills/scripts
  -> runtime execution produces outputs
  -> outputs are stored as artifacts
  -> Prism Memory indexes/searches durable context where appropriate
```

Short form:

| Object | Purpose |
| --- | --- |
| Request | Intake and intent |
| Task | Runnable or scheduled unit |
| Skill/script | Reusable capability and implementation |
| Workflow | Orchestrated process |
| Artifact | Persisted output or evidence |

The main design rule is: keep requests about intent, workflows about process, and artifacts about outputs. That separation makes the system easier to inspect, retry, index, and hand off.
