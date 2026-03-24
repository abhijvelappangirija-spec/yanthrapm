# Progress Tracker: Private-First BRD Architecture

Last updated: March 24, 2026  
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

- Overall phase: `Phase 2 - Provider Abstraction` (Phase 1 live rollout still pending)
- Overall progress: `[~] Started`
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

- [~] Refactor current AI integration into provider-based services
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
- [~] Add supported-claims validation

### Workstream D: Controlled External Retrieval

- [ ] Define allowed external retrieval use cases
- [ ] Define outbound sanitization rules
- [ ] Add approved-source allowlist
- [ ] Keep external retrieval separate from final BRD generation
- [ ] Record source traceability and retrieval timestamps

### Workstream E: Quality, Review, and Governance

- [ ] Add completeness checks for mandatory BRD sections
- [ ] Add validation scoring
- [ ] Add review-ready flags for assumptions and risks
- [ ] Add audit metadata for model/provider/prompt version
- [ ] Add regression tests for prompt injection and unsafe output

## 6. Phase Breakdown

### Phase 1: Security Foundation

Status: `[~] In progress`

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

Status: `[~] In progress`

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

Status: `[~] In progress`

Tasks:

- [x] Add input classification
- [x] Define structured JSON schema for extracted evidence
- [x] Implement extraction stage
- [x] Implement BRD writing stage
- [x] Implement validation stage
- [ ] Strengthen unsupported-claim detection beyond structural/evidence coverage checks

### Phase 4: Controlled Retrieval

Status: `[ ] Not started`

Tasks:

- [ ] Define retrieval policy
- [ ] Define approved sources
- [ ] Define data-loss-prevention rules
- [ ] Integrate retrieval facts into requirement package

### Phase 5: Governance and Review

Status: `[ ] Not started`

Tasks:

- [ ] Add review workflow markers
- [ ] Add scoring and audit metadata
- [ ] Add test coverage for security and quality gates

## 7. Immediate Next Actions

1. Apply and verify the Supabase RLS migration in the target Supabase environment.
2. Run the auth and RLS verification checklists against the target environment.
3. Continue Phase 3 by strengthening unsupported-claim detection beyond structural/evidence coverage checks.

## 8. Current Implementation Slice

Active slice:

1. Keep the live RLS rollout checklist ready for the target environment.
2. Keep provider routing and audit visibility stable.
3. Auto-classify sensitive inputs and keep the evidence-first BRD pipeline structurally reliable.

Reason:

The security foundation is locally complete. The provider layer now supports private-first routing and visible audit details. BRD generation now runs through input classification, structured evidence extraction, composition, and a validation fallback. The next engineering step is to strengthen unsupported-claim detection beyond the current rule-based checks.

## 9. Decisions Log

### March 23, 2026

- [x] Agreed to use the private-first BRD proposal as the active implementation plan.
- [x] Agreed to track implementation progress in `progress.md`.
- [x] First implementation slice will focus on request validation and output safety before identity refactor.

### March 24, 2026

- [x] Phase 1 moved from app-only hardening into database-security rollout work.

## 10. Blockers / Open Decisions

- [ ] Decide the target authentication approach for this application
- [ ] Decide the first private model provider target for confidential BRD generation
- [ ] Decide whether highly sensitive flows must fail closed if the private model is unavailable

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

## 12. Working Rule

Do not start advanced model-routing or retrieval work before the security foundation is in place. Fix identity, authorization, request validation, and output safety first.
