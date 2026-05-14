# Prism Memory And Knowledge Systems

Working notes for the Prism Memory and Knowledge split.

The clean distinction is:

```text
Memory = time-based operational record
Knowledge = curated retrievable docs
```

## Prism Memory

Prism Memory is for things that happened.

Examples:

- Meeting transcripts.
- Meeting summaries.
- Discord or community activity.
- Daily and weekly digests.
- Runtime outputs.
- Task outputs.
- Published artifacts.
- Participant and activity views over time.

Memory is event-oriented and historical. It should preserve operational context, evidence, and outputs so future agents and maintainers can answer questions like:

- What happened?
- Who participated?
- What was decided?
- What changed since the last summary?
- What artifact did this execution produce?
- What source material was used?

## Prism Knowledge

Prism Knowledge is for curated retrievable docs.

Examples:

- Platform docs.
- SOPs.
- Runbooks.
- Architecture notes.
- Source docs synced from a repo.
- Maintainer guidance.
- Stable summaries promoted out of inbox/triage.

Knowledge is reference-oriented. It should help future agents and maintainers answer questions like:

- How is this system supposed to work?
- What is the current runbook?
- Which services exist?
- What does this source repository document?
- What should an operator read before taking action?

## Artifacts

Artifacts are durable outputs and evidence created by execution.

They can sit between memory and knowledge:

- A meeting transcript is an artifact and may be indexed as memory.
- A generated report is an artifact and may become a knowledge source after review.
- A summary produced by Codex may start as an artifact, then be promoted into curated knowledge.

Known public artifact URL pattern:

```text
https://prism-memory-production-08e3.up.railway.app/artifacts/<artifact-id>
```

Knowledge docs are not automatically public artifacts. A staged knowledge inbox document may be searchable only after indexing/promote runs, and it may not have an artifact URL unless it was created or published as an artifact.

## Source Syncs

Knowledge sources can sync a docs folder from a repository.

Example source:

| Field | Value |
| --- | --- |
| Source ID | `prism-railway-template-docs` |
| Repo | `superprismio/prism-railway-template` |
| Branch | `main` |
| Docs root | `docs` |
| Status | `synced` |
| Indexed docs | 30 |
| Last synced commit | `db15330a053c94cbd9f6a310def5aa1432650a8b` |
| Last synced at | `2026-05-12T15:44:09Z` |

That source documents the Prism Railway Template as a multi-service, Codex-first platform. It is organized around architecture, features, operations, template authoring, and archive material.

## Operational Guidance

Use Memory when the system needs the record of what happened.

Use Knowledge when the system needs curated instructions, reference material, or stable context.

Use Artifacts when an execution produced something that should be addressable, reviewable, or linked from a request/workflow.

Promotion path:

```text
raw event / execution
  -> artifact
  -> memory index for historical retrieval
  -> curated knowledge doc if the content becomes stable reference material
```
