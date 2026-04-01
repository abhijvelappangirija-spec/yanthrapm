# Progress Tracker: Private-First BRD Architecture

Last updated: March 29, 2026  
Owner: Codex + Project Team  
Reference plan: `docs/private-first-brd-architecture-proposal.md`

## 1. Objective

Track the execution of the private-first BRD architecture plan from proposal to implementation. This file is the operational tracker for progress, decisions, blockers, and next actions.

## 2. Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[!]` Blocked / needs decision

## 3. Current Overall Status

- Overall phase: **Phases 1–5 implemented in this repository** (security, providers, evidence-first BRD, controlled retrieval, governance/audit UI and tests).
- Overall progress: `[x] Implementation complete in repo` — remaining work is **target Supabase migration application** and **enabling CI on the remote**, which are operator/deployment steps, not missing application code.
- Proposal document: `[x] Completed`
- Execution tracker: `[x] Completed`

## 4. Baseline Findings From Current Codebase

- [x] BRD generation currently sends user input directly to an external AI provider.
- [x] BRD generation is currently single-pass and prompt-driven.
- [x] AI-generated HTML is rendered with insufficient sanitization.
- [x] Current routes trust client-supplied `userId` values in multiple places.
- [x] Shared Supabase client usage needs separation between browser-safe and server-only access patterns.

## 5. Workstreams

### Workstream A: Security Foundation

- [x] Introduce authenticated identity flow for API routes
- [x] Remove trust in client-supplied `userId`
- [x] Separate client and server Supabase access patterns
- [x] Add row-level security implementation plan for `brds`, `projects`, `sprints`, and `technical_context`
- [x] Add request validation for BRD-related API routes
- [x] Add HTML sanitization before render and save
- [x] Stop returning overly detailed backend errors to clients

### Workstream B: Provider Abstraction

- [x] Refactor current AI integration into provider-based services
- [x] Introduce a private model provider interface
- [x] Introduce a routing policy layer
- [x] Keep external provider usage behind explicit policy checks
- [x] Add request-level private-processing enforcement for sensitive BRD and sprint flows
- [x] Expose provider audit details in history and review flows

### Workstream C: Evidence-First BRD Pipeline

- [x] Add input classification
- [x] Add structured evidence extraction
- [x] Add assumptions register
- [x] Add open-questions register
- [x] Generate BRD from structured evidence instead of direct prompt input
- [x] Add supported-claims validation

### Workstream D: Controlled External Retrieval

- [x] Define allowed external retrieval use cases
- [x] Define outbound sanitization rules
- [x] Add approved-source allowlist
- [x] Keep external retrieval separate from final BRD generation
- [x] Record source traceability and retrieval timestamps

### Workstream E: Quality, Review, and Governance

- [x] Add completeness checks for mandatory BRD sections
- [x] Add validation scoring
- [x] Add review-ready flags for assumptions and risks
- [x] Add audit metadata for model/provider/prompt version
- [x] Add regression tests for prompt injection and unsafe output

## 6. Phase Breakdown

### Phase 1: Security Foundation

Status: `[x] Complete in repository` — apply RLS and optional follow-on migrations in the **target** Supabase project per `docs/supabase-rls-rollout.md` (operator deployment step).

Tasks:

- [x] Proposal approved as execution baseline
- [x] Progress tracker created
- [x] Audit current auth and authorization paths
- [x] Design first secure Supabase access split
- [x] Add safe HTML handling plan
- [x] Implement first Phase 1 code slice
- [x] Move route ownership to a server-derived actor
- [x] Remove browser-side direct Supabase access from history flows
- [x] Add browser-to-server Supabase session token propagation path
- [x] Add actor introspection endpoint for auth-path verification
- [x] Draft initial Supabase RLS migration and rollout documentation
- [x] Add sign-in/sign-out UI and session lifecycle
- [x] Protect dashboard and working pages with the new auth/session wrapper
- [x] Restrict fallback actor usage to local or explicitly approved environments
- [x] Add auth and RLS rollout verification checklists
- [x] Route authenticated server requests through actor-scoped Supabase clients
- [x] Harden sprint-plan and Jira API routes with schema validation
- [x] Sanitize Jira and sprint backend error responses returned to clients

### Phase 2: Provider Abstraction

Status: `[x] Completed`

Tasks:

- [x] Define provider interface
- [x] Refactor `lib/perplexity.ts`
- [x] Add internal routing service
- [x] Add first private-provider implementation
- [x] Add provider/model metadata capture path for generated BRDs and sprint plans
- [x] Add backward-compatible AI metadata persistence migration
- [x] Add fail-closed private-routing controls for sensitive generation requests
- [x] Expose provider/model/scope details in BRD and sprint review screens

### Phase 3: Evidence-First BRD Generation

Status: `[x] Completed`

Tasks:

- [x] Add input classification
- [x] Define structured JSON schema for extracted evidence
- [x] Implement extraction stage
- [x] Implement BRD writing stage
- [x] Implement validation stage
- [x] Strengthen unsupported-claim detection beyond structural/evidence coverage checks

### Phase 4: Controlled Retrieval

Status: `[x] Local implementation complete`

Tasks:

- [x] Define retrieval policy
- [x] Define approved sources
- [x] Define data-loss-prevention rules
- [x] Integrate retrieval facts into requirement package

### Phase 5: Governance and Review

Status: `[x] Local implementation complete` (target DB must apply migration file `202603260001_brds_governance_audit.sql` to persist snapshots)

Tasks:

- [x] Add review workflow markers
- [x] Add scoring and audit metadata
- [x] Add test coverage for security and quality gates

## 7. Deployment and operations (target environment)

These steps are **outside the repo** and use your Supabase and GitHub credentials.

1. Apply and verify the Supabase RLS migration in the target Supabase project (see `docs/supabase-rls-rollout.md`).
2. Run the auth and RLS verification checklists in that document against the target project.
3. Apply optional migrations `202603240002_phase2_ai_metadata.sql` and `202603260001_brds_governance_audit.sql` when you want AI metadata and governance/retrieval JSON on `brds` (the app degrades if columns are absent).
4. Enable GitHub Actions on the remote so `.github/workflows/ci.yml` runs `npm run verify` on push/PR.

**Before every review or release in this repo:** run `npm run verify` locally (see §12).

## 8. Current implementation status (review-ready)

**Repository status:** Ready for **code review** and **functional smoke testing** (`npm run verify` passes; see §12).

Ongoing product expectations:

1. Retrieval stays **disabled by default** (`AI_RETRIEVAL_ENABLED`); enable only with approved domains and DLP policy.
2. Production should **not** rely on fallback actors unless explicitly approved (`APP_ALLOW_FALLBACK_ACTOR`).

**Summary:** Security, provider routing, evidence-first BRD, controlled retrieval (optional pass), governance payloads, audit persistence (when DB migrations applied), UI panels, and Vitest coverage are implemented as described in prior changelog entries. Target Supabase still needs migrations applied for RLS and optional column persistence in that environment.

## 9. Decisions Log

### March 23, 2026

- [x] Agreed to use the private-first BRD proposal as the active implementation plan.
- [x] Agreed to track implementation progress in `progress.md`.
- [x] First implementation slice will focus on request validation and output safety before identity refactor.

### March 24, 2026

- [x] Phase 1 moved from app-only hardening into database-security rollout work.
- [x] Phase 2 provider abstraction was completed locally and the tracker moved to Phase 4.
- [x] Phase 3 evidence-first BRD generation was completed locally after unsupported-claim detection was added.
- [x] Phase 4 controlled retrieval started with policy, approved-source, and outbound DLP scaffolding.

### March 25, 2026

- [x] Separated Perplexity web retrieval from BRD evidence extraction and HTML composition using `disable_search` on those calls.
- [x] Added a dedicated controlled retrieval pass for BRD (templated sanitized query, `search_domain_filter`, JSON facts, citation URLs filtered to approved domains) merged into the composition requirement package.
- [x] Exposed `retrievalExecution` on BRD API responses; sprint Perplexity calls respect retrieval policy for `disable_search`.
- [x] Documented default no-web Perplexity behavior in `.env.example` when retrieval is disabled.

### March 26, 2026

- [x] Added BRD governance payload (`validation`, `reviewMarkers`, `promptPackageVersion`) from all BRD providers and returned it from generate-BRD APIs with `promptPackageVersion` on `ai` metadata.
- [x] Surfaced controlled retrieval and governance summaries in the BRD Generator UI and the sprint-plan page for upload-generated BRDs.
- [x] Extended `AiAuditSummary` with prompt package version display.
- [x] Added Vitest (`npm test`) with tests for HTML sanitization (script/iframe stripping) and retrieval preflight blocking of sensitive queries.
- [x] Revalidated with `npm run test`, `npm run lint`, `npm run build`, and `npx tsc --noEmit`.

### March 27, 2026

- [x] Added `supabase/migrations/202603260001_brds_governance_audit.sql` for optional `brd_governance`, `brd_retrieval_execution`, and `ai_prompt_package_version` on `brds`.
- [x] Implemented `executeWithOptionalBrdInsertAudit` and `buildBrdInsertAuditExtension` so BRD inserts degrade across AI-only and base payloads when columns are missing.
- [x] Wired `/api/generate-brd` to persist audit snapshots when possible and return `auditSnapshotSaved`.
- [x] Upgraded `/api/brds` list reads with `executeReadWithOptionalBrdListColumns` and `auditSnapshotAvailable` in the JSON response.
- [x] Extended `parseOptionalAiMetadata` to accept optional `promptPackageVersion` for save flows.
- [x] Added Vitest coverage for `buildBrdReviewMarkers` and inline event-handler stripping in HTML sanitization.
- [x] Added GitHub Actions workflow `.github/workflows/ci.yml` for lint, test, TypeScript, and build.
- [x] Documented optional migrations in `docs/supabase-rls-rollout.md`.
- [x] Revalidated with `npm run test`, `npm run lint`, `npm run build`, and `npx tsc --noEmit`.

### March 28, 2026

- [x] Aligned `/api/save-brd` with generate-BRD persistence using `executeWithOptionalBrdInsertAudit`, validated optional `governance` and `retrievalExecution` bodies (`lib/ai/client-audit-payload.ts`), and returned `auditSnapshotSaved`.
- [x] Sprint-plan “Save to Database” for upload-generated BRDs now forwards governance and retrieval snapshots when saving.
- [x] History page shows `ai_prompt_package_version` and stored governance score/workflow hint when columns are present.
- [x] Added `npm run verify` and switched CI to run it as a single gate; added Vitest coverage for client audit payloads.
- [x] Revalidated with `npm run verify`.

## 10. Resolved product decisions (as implemented)

Aligned with the codebase for **review**; future product changes (e.g. different IdP) would be a new initiative.

- [x] **Authentication approach:** **Supabase Auth** for end users; `fetchWithAuth` forwards sessions to APIs; **server-only** `resolveRequestActor` and actor-scoped Supabase clients; **no** client-supplied `userId`. Entry points: `/auth`, `/api/auth/actor`, `lib/auth/request-actor.ts`, `components/auth/RequireAppAccess.tsx`.
- [x] **Private model provider for confidential flows:** Default **`AI_PRIVATE_PROVIDER=ollama`** (see `lib/ai/provider-policy.ts`); **`dummy`** allowed for tests; **Perplexity cannot** be configured as the private provider. Ollama models per task via `OLLAMA_BRD_MODEL`, `OLLAMA_SPRINT_MODEL`, or `OLLAMA_MODEL`.
- [x] **Fail-closed sensitive flows:** When routing requires private processing (`requirePrivateProcessing` or `AI_PRIVATE_TASKS`), **`buildAiMetadata` in `lib/ai/service.ts` returns 503** if the private provider is not configured. Optional **`AI_EXTERNAL_DISABLED`** blocks external providers. Tasks can be listed in **`AI_PRIVATE_TASKS`** for fail-closed routing to the private provider.

## 11. Change Log

### March 23, 2026

- [x] Created architecture proposal documents in `docs/`
- [x] Created execution tracker in `progress.md`
- [x] Added shared request-validation helpers
- [x] Added conservative HTML sanitization utility
- [x] Applied BRD route validation and BRD/story HTML sanitization

### March 24, 2026

- [x] Restored missing dummy generator exports used by BRD and sprint routes
- [x] Fixed PDF parsing regex compatibility for the current TypeScript target
- [x] Cleared repo lint blockers in project and file-upload pages
- [x] Wrapped `useSearchParams` pages in Suspense-safe boundaries
- [x] Marked query-string API routes as dynamic where required for production build
- [x] Verified `npm run lint`, `npx tsc --noEmit`, and `npm run build`
- [x] Added service-connectivity error classification for Supabase and Perplexity failures
- [x] Allowed BRD generation to succeed even when Supabase save fails temporarily
- [x] Changed BRD and project listing routes to degrade gracefully during storage outages
- [x] Split Supabase access into browser-safe and server-only clients
- [x] Added server-side actor resolution with environment fallback and future auth hook points
- [x] Removed client-supplied `userId` from BRD, project, sprint, and technical-context flows
- [x] Scoped project, BRD, sprint, and technical-context routes by the server-derived actor
- [x] Added a server-side sprints listing route and routed the history page through APIs
- [x] Revalidated the repo with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Added a Supabase RLS migration covering `brds`, `projects`, `sprints`, and `technical_context`
- [x] Added RLS rollout notes and updated setup documentation for `SUPABASE_SERVICE_ROLE_KEY`
- [x] Added client-side authenticated fetch helper to forward Supabase session tokens to app APIs
- [x] Expanded server actor resolution to accept bearer tokens and Supabase-style auth cookies
- [x] Added `/api/auth/actor` for auth-path verification
- [x] Added a client-side auth provider and protected-page access wrapper
- [x] Added a dedicated `/auth` page with sign-in and sign-up flows
- [x] Routed dashboard, project, BRD, sprint, history, and stories pages through the auth/session guard
- [x] Revalidated the auth UI slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Restricted fallback actor usage to non-production by default unless `APP_ALLOW_FALLBACK_ACTOR=true` is set explicitly
- [x] Added explicit auth and production rollout checks for fallback actors and RLS verification
- [x] Revalidated the fallback-policy slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Switched end-user server routes to actor-scoped Supabase clients so authenticated requests can honor RLS
- [x] Revalidated the actor-scoped Supabase client slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Added validated payload parsers for sprint-plan and Jira ticket creation routes
- [x] Removed raw backend exception text from Jira and sprint-plan client responses
- [x] Revalidated the final local Phase 1 hardening slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Added AI provider interfaces, routing policy, and provider-based generation service wrappers
- [x] Switched BRD and sprint generation routes to the provider service layer
- [x] Added shared prompt builders and sprint-plan parsing for multi-provider reuse
- [x] Added an Ollama provider behind the routing layer for private/local inference
- [x] Revalidated the initial private-provider slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Documented provider-routing environment controls for Perplexity and Ollama
- [x] Added provider/model routing metadata to generation responses and persistence paths
- [x] Added a backward-compatible AI metadata migration for `brds` and `sprints`
- [x] Updated the uploaded-BRD save flow to forward AI metadata when available
- [x] Revalidated the AI metadata slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Added request-level `requirePrivateProcessing` support for BRD and sprint flows
- [x] Added `AI_PRIVATE_PROVIDER` and `AI_PRIVATE_TASKS` policy controls for fail-closed private routing
- [x] Revalidated the private-routing slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit --incremental false`
- [x] Added reusable AI audit summary UI for BRD review, sprint review, and history flows
- [x] Added backward-compatible BRD history reads with optional AI metadata columns
- [x] Revalidated the audit-visibility slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit --incremental false`
- [x] Added a structured BRD evidence schema and parser for evidence-first generation
- [x] Switched Perplexity, Ollama, and dummy BRD generation to extract evidence before composing HTML
- [x] Updated BRD prompt definitions to separate evidence extraction from BRD writing
- [x] Revalidated the evidence-first BRD slice with `npm run lint`, `npm run build`, and a temporary `.next`-free TypeScript check
- [x] Added BRD validation against required sections and evidence coverage with deterministic fallback rendering
- [x] Revalidated the BRD validation slice with `npm run lint`, `npm run build`, and a temporary `.next`-free TypeScript check
- [x] Added server-side input classification that auto-enforces private routing for restricted content patterns
- [x] Revalidated the input-classification slice with `npm run lint`, `npm run build`, and a temporary `.next`-free TypeScript check
- [x] Added `.env.example` as the canonical local environment reference and updated setup docs
- [x] Added unsupported-claim detection that checks generated BRD section claims against extracted evidence before accepting model output
- [x] Updated BRD validation to fall back when unsupported or ungrounded claims are detected
- [x] Revalidated the stronger claim-validation slice with `npm run lint`, `npm run build`, and a source-only TypeScript check
- [x] Added controlled retrieval policy resolution with approved-domain and use-case allowlists
- [x] Added outbound retrieval-query sanitization and blocking rules for sensitive patterns
- [x] Exposed retrieval policy decisions in BRD and sprint-generation API responses
- [x] Revalidated the initial controlled-retrieval slice with `npm run lint`, `npm run build`, and a source-only TypeScript check
- [x] Revalidated the separated-retrieval and traceability slice with `npm run lint`, `npm run build`, and `npx tsc --noEmit`
- [x] Shipped Phase 5 local slice: governance API + UI, prompt package version, Vitest regression tests
- [x] Shipped optional Supabase persistence for governance/retrieval snapshots, expanded tests, and CI workflow scaffolding
- [x] Extended manual BRD save path and history UI for the same audit snapshots; added `npm run verify`

### March 29, 2026

- [x] Marked overall implementation **complete in repo**; Phase 1 status **complete in repository** (deployment to target Supabase remains operator-owned).
- [x] Closed former open decisions (§10) with **resolved** outcomes matching the implemented auth, Ollama private provider, and fail-closed private routing behavior.
- [x] Added **§12 Code review and working verification** for reviewers; reframed §7 as deployment/operations only.
- [x] Re-ran `npm run verify` successfully for the review pass.

## 12. Code review and working verification

Use this checklist before merging or demoing.

1. **Automated gate:** Run `npm run verify` (lint, Vitest, `tsc --noEmit`, production build). CI runs the same when Actions are enabled on the remote.
2. **Auth and actor:** Sign in via `/auth`; confirm protected routes load; confirm `/api/auth/actor` reflects the session; confirm API calls use `fetchWithAuth` where applicable.
3. **BRD flow:** Generate a BRD (text and optional upload); confirm governance and retrieval panels match expectations; with governance migration applied, confirm save returns `auditSnapshotSaved` where applicable.
4. **Private routing:** With Ollama configured for private tasks, confirm sensitive flows route to the private provider; with private provider unavailable, confirm fail-closed behavior (503) for routes that require private processing.
5. **Target database:** For persistence and RLS in a shared environment, follow `docs/supabase-rls-rollout.md` and apply migrations in the target project (not required for local-only UI review).

## 13. Working Rule

Do not start advanced model-routing or retrieval work before the security foundation is in place. Fix identity, authorization, request validation, and output safety first.
