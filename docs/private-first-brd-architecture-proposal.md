# Private-First BRD Architecture Proposal

Version: 1.0  
Date: March 23, 2026  
Audience: Engineering Manager, Client Stakeholders, Solution Architects, Product Owners

## 1. Executive Summary

This document proposes a new architecture for Business Requirements Document (BRD) generation that is more secure, more reliable, and more aligned with how a technical architect or engineering manager would build a requirements document.

The current application generates BRDs by sending user input directly to an external AI provider and storing the returned HTML. This is simple and fast to build, but it creates three major concerns:

1. Sensitive project ideas leave the application boundary.
2. The generated BRD can contain hallucinated or weakly supported content.
3. The system currently trusts AI output and user-supplied identifiers too much.

The proposed solution is a private-first hybrid architecture:

1. Sensitive customer or product input stays inside a private inference path.
2. A local or private model performs fact extraction, requirement structuring, and BRD generation.
3. If current or market-facing information is needed, a separate retrieval sidecar fetches generic, sanitized, non-sensitive information from approved external sources.
4. The final BRD is generated only after evidence extraction, validation, and review gates.

This approach does not create absolute or mathematical security. No system can guarantee 100 percent security or 100 percent correctness. However, it materially improves confidentiality, reduces hallucination risk, and creates a more professional and defensible BRD workflow.

## 2. Problem Statement

The current BRD workflow is effective for prototyping, but it is not sufficient for sensitive or client-facing production use.

The key business concerns are:

1. Sensitive ideas, product plans, business workflows, and architecture details may be too confidential to send directly to an external model.
2. A BRD written in one pass by a general-purpose model may sound polished while still containing assumptions, invented details, or impractical requirements.
3. Client stakeholders expect requirements documentation to be traceable, structured, and technically realistic.
4. Engineering leadership needs a system that can be audited, governed, improved over time, and aligned with secure SDLC practices.

## 3. Current State Overview

### 3.1 Current User Flow

Today, the flow is approximately:

1. User uploads a file or enters text.
2. The application sends the content directly to the BRD generation API.
3. The API forwards the prompt to an external AI provider.
4. The provider returns HTML.
5. The application stores the HTML and renders it back to the user.

### 3.2 Current Strengths

1. Fast to implement.
2. Low initial operational overhead.
3. Simple end-to-end flow.
4. Good for demos and lightweight internal experimentation.

### 3.3 Current Limitations

1. Sensitive inputs are sent to an external provider.
2. The BRD is generated in a single pass with limited evidence control.
3. Current prompts are generic, which increases the chance of vague or invented requirements.
4. AI-generated HTML is rendered with insufficient validation and sanitization.
5. The current application trusts client-provided user identifiers in places where stronger identity enforcement is needed.
6. The architecture does not separate fact extraction, reasoning, document writing, and validation.
7. The system is not yet aligned with enterprise-grade controls such as data classification, row-level access policies, output validation, and auditability.

## 4. Why a Better Approach Is Needed

A strong BRD is not just a fluent document. It is a structured artifact that:

1. Captures verified business goals.
2. Separates known facts from assumptions and open questions.
3. Defines measurable functional and non-functional requirements.
4. Identifies dependencies, constraints, and risks.
5. Can be reviewed by business, product, architecture, security, QA, and engineering stakeholders.

That is how a strong technical manager or architect works in practice. They do not take raw notes and immediately produce a final document. They extract facts, clarify unknowns, validate feasibility, and only then assemble the BRD.

## 5. Proposed Future Architecture

## 5.1 Design Principle

The target architecture is `private-first`, `evidence-based`, and `policy-driven`.

This means:

1. Sensitive information should stay in a local or private inference path by default.
2. External retrieval should be optional, bounded, and sanitized.
3. Final BRD generation should depend on structured evidence, not only on a free-form prompt.
4. Every stage should have validation and security controls.

### 5.2 High-Level Architecture

```text
User Input / Uploaded File
        |
        v
Input Validation + Classification
        |
        v
Private Evidence Extraction (Ollama / private model)
        |
        +------------------------------+
        |                              |
        | if allowed and needed        |
        v                              |
Sanitized External Retrieval Sidecar   |
        |                              |
        +------------> Curated Facts --+
                       |
                       v
Requirement Structuring + Assumptions Register
                       |
                       v
BRD Writer (private model only)
                       |
                       v
Validation Layer
- schema check
- supported claims check
- section completeness
- HTML sanitization
                       |
                       v
Storage + Review + Export
```

### 5.3 Core Components

#### A. Input Validation and Classification

Purpose:

1. Validate file type, size, and text content.
2. Classify the request as public, internal, confidential, or highly sensitive.
3. Decide whether any external retrieval is allowed.

Example policy:

1. `Highly sensitive`: no external calls allowed.
2. `Confidential`: only approved sanitized retrieval allowed.
3. `Internal`: limited external retrieval allowed.
4. `Public`: external retrieval allowed with normal policy controls.

#### B. Private Evidence Extraction

Purpose:

1. Convert user input into structured facts.
2. Extract business goals, actors, workflows, assumptions, constraints, and unknowns.
3. Produce machine-readable JSON rather than directly writing a BRD.

This stage should answer:

1. What is explicitly stated by the user?
2. What is missing?
3. What appears to be assumed rather than confirmed?
4. What risks or ambiguities must be surfaced before writing the document?

#### C. External Retrieval Sidecar

Purpose:

1. Fetch fresh information when the BRD needs latest standards, regulatory concepts, market terminology, or current technical patterns.
2. Keep the retrieval path separate from the sensitive-generation path.

Important rule:

The external retrieval sidecar must never receive raw sensitive user content. It should only receive generic, pre-approved queries generated through strict templates or safe query builders.

Examples of allowed external retrieval:

1. Current OWASP application security guidance.
2. Current cloud service terminology.
3. Industry-standard compliance expectations.
4. Generic integration best practices for common platforms.

Examples of disallowed external retrieval:

1. Client project name plus business strategy.
2. Internal workflow descriptions.
3. Proprietary product design concepts.
4. Sensitive internal architecture details.

#### D. Requirement Structuring Layer

Purpose:

1. Merge local evidence and allowed external facts.
2. Create a normalized requirement package.
3. Distinguish between:
   - confirmed requirements
   - inferred assumptions
   - open questions
   - recommended controls
   - risks and dependencies

This is the stage where the system starts to behave more like an architect and less like a generic content generator.

#### E. BRD Writer

Purpose:

1. Generate the final BRD from structured evidence only.
2. Follow a fixed template with business and technical rigor.
3. Avoid unsupported claims.

Recommended mandatory sections:

1. Executive Summary
2. Business Context and Problem Statement
3. Objectives and Success Criteria
4. Scope and Out-of-Scope
5. Stakeholders and User Roles
6. Functional Requirements
7. Non-Functional Requirements
8. Data, Integration, and Reporting Requirements
9. Security and Compliance Considerations
10. Assumptions, Dependencies, and Constraints
11. Risks and Open Questions
12. Delivery Considerations and Acceptance Criteria

#### F. Validation Layer

Purpose:

1. Verify output structure.
2. Detect missing sections.
3. Identify statements not grounded in extracted evidence.
4. Sanitize HTML before render or storage.
5. Reject or regenerate low-confidence results.

This layer is essential. It prevents the system from trusting a fluent answer just because it sounds professional.

## 6. How the New Plan Works End to End

### 6.1 Step-by-Step Workflow

1. User enters text or uploads a file.
2. The application validates and classifies the input.
3. Sensitive input goes to the private model path only.
4. The private model performs evidence extraction into structured JSON.
5. If the workflow needs current general information and policy allows it, a sanitized retrieval sidecar fetches current facts from approved sources.
6. The system merges local evidence and retrieved facts into a structured requirement package.
7. A private BRD writer model creates the first BRD draft from structured inputs.
8. A validator checks schema, completeness, traceability, and unsupported claims.
9. The output is sanitized for safe rendering and saved with audit metadata.
10. User reviews the BRD, updates open questions, and exports the final version.

### 6.2 What Makes This More Secure

1. Sensitive content remains in a private inference boundary.
2. External retrieval is separated from direct BRD writing.
3. External queries are generic and sanitized.
4. The system can disable all external retrieval for highly sensitive work.
5. Stored content is protected by stronger identity, authorization, and row-level access control.

### 6.3 What Makes This More Accurate

1. Facts are extracted before writing.
2. Unknowns are explicitly captured instead of silently invented.
3. Current information is retrieved through controlled sources rather than guessed by the model.
4. The final BRD is validated against structure and evidence.
5. Assumptions are labeled so reviewers can challenge them.

## 7. Old vs New Architecture

| Area | Current Architecture | Proposed Architecture |
|---|---|---|
| Input handling | User input goes directly into BRD prompt | Input is validated, classified, and structured first |
| Sensitive data | Sent to external AI provider | Kept in private inference path by default |
| Use of latest information | Model may guess or rely on stale training | Retrieved through controlled external sidecar when policy allows |
| BRD generation | Single-pass content generation | Multi-stage evidence extraction, structuring, writing, validation |
| Hallucination control | Prompt-only | Evidence-first with supported-claims validation |
| Output safety | Raw HTML returned and rendered | Sanitized and validated before storage and rendering |
| Identity and data access | Weak ownership controls in current flow | Authenticated identity, row-level access control, auditability |
| Enterprise readiness | Prototype-friendly | Production-oriented and governance-ready |

## 8. Advantages of the New Design

### 8.1 Security Advantages

1. Significant reduction in sensitive data exposure to third-party AI services.
2. Better control over which information can leave the system.
3. Easier policy enforcement for confidential projects.
4. Stronger auditability and access control.
5. Better foundation for compliance and client assurance.

### 8.2 BRD Quality Advantages

1. More realistic and practical BRDs.
2. Clear distinction between facts, assumptions, and open questions.
3. Better non-functional requirements and security requirements.
4. More architect-like output with scope, dependencies, and constraints.
5. Lower hallucination rate due to evidence-first generation.

### 8.3 Delivery Advantages

1. More repeatable output quality.
2. Easier to evolve prompts and models without changing the full workflow.
3. Better fit for phased product maturity.
4. Better alignment with future features such as sprint planning, approval workflows, and compliance templates.

## 9. Disadvantages and Tradeoffs

No serious architecture discussion is complete without acknowledging tradeoffs.

### 9.1 Technical Tradeoffs

1. More components mean more engineering effort.
2. Local inference requires infrastructure planning and model operations.
3. The pipeline is more complex than a direct API call.
4. The system needs careful policy and validator design.

### 9.2 Operational Tradeoffs

1. Private inference may need GPU resources for acceptable latency.
2. Local models may produce weaker prose than top hosted frontier models.
3. Model selection, performance tuning, and observability become internal responsibilities.
4. External retrieval requires governance, source allowlists, and monitoring.

### 9.3 Business Tradeoffs

1. Higher initial implementation cost.
2. Longer time to reach the first production-grade version.
3. More disciplined review process, which can slow purely ad hoc document generation.

## 10. Feasibility Assessment

### 10.1 Technical Feasibility

Rating: High

Reasoning:

1. The current application already has clear API boundaries.
2. The BRD generation path can be refactored into provider-based stages.
3. Local inference via Ollama is technically achievable.
4. The system can evolve incrementally rather than through a full rewrite.

### 10.2 Security Feasibility

Rating: High

Reasoning:

1. Private inference is achievable with local or private-hosted models.
2. Supabase security can be improved with authenticated identity and row-level security.
3. Output sanitization and request validation are standard engineering controls.

### 10.3 Operational Feasibility

Rating: Medium

Reasoning:

1. Requires infrastructure decisions for model hosting.
2. Requires monitoring, alerting, audit logging, and model lifecycle management.
3. Depends on response-time expectations and available hardware.

### 10.4 Cost Feasibility

Rating: Medium to High

Reasoning:

1. External API usage may decrease for sensitive workflows.
2. Local inference may increase infrastructure cost.
3. Over time, policy-based routing can reduce unnecessary external AI spend.
4. The stronger architecture can be justified if client confidentiality is a real commercial requirement.

## 11. Recommended Working Model

The recommended working model is not fully local and not fully external. It is controlled hybrid with private-first defaults.

### 11.1 Default Policy

1. All customer or project-specific input starts in the private path.
2. External retrieval is disabled unless explicitly allowed by classification policy.
3. Final BRD generation happens only in the private path.
4. External retrieval contributes generic facts, not final wording.

### 11.2 Decision Policy

Use the following logic:

1. If the project is confidential or strategic, do not send raw text outside the private environment.
2. If the BRD needs current industry references, retrieve them through sanitized generic lookups only.
3. If current knowledge is not required, remain fully private.
4. If the local model is unavailable for a confidential request, fail closed rather than falling back to an external provider.

## 12. Implementation Plan

### Phase 1: Security Foundation

Objectives:

1. Introduce proper user authentication.
2. Enforce row-level access control.
3. Split public and server-only data clients.
4. Sanitize and validate model output before render and save.

Expected deliverables:

1. Stronger Supabase access model.
2. Safer BRD rendering path.
3. Reduced data exposure risk.

### Phase 2: Provider Abstraction

Objectives:

1. Refactor BRD generation into provider-independent services.
2. Add a private model provider interface.
3. Keep external provider usage behind an explicit routing layer.

Expected deliverables:

1. Clean architecture for model routing.
2. Easier transition from current provider to hybrid routing.

### Phase 3: Evidence-First BRD Pipeline

Objectives:

1. Extract facts, constraints, and unknowns into structured JSON.
2. Introduce assumptions register and open questions list.
3. Generate BRD only from structured requirement packages.

Expected deliverables:

1. Reduced hallucination.
2. Better BRD consistency and traceability.

### Phase 4: Controlled External Retrieval

Objectives:

1. Add retrieval sidecar for approved generic queries.
2. Restrict domains and source types.
3. Add outbound sanitization and policy enforcement.

Expected deliverables:

1. Better freshness without exposing sensitive input.
2. Cleaner separation between private reasoning and public retrieval.

### Phase 5: Review and Governance

Objectives:

1. Add validation scoring and quality gates.
2. Track assumptions, unsupported claims, and missing sections.
3. Introduce optional manager or architect review checkpoints.

Expected deliverables:

1. Auditability.
2. Quality metrics.
3. Stronger client confidence.

## 13. How We Are Going to Work

### 13.1 Delivery Approach

1. Start with security and control improvements before changing model behavior.
2. Refactor the AI integration into staged services.
3. Introduce private inference first.
4. Add evidence extraction and validation.
5. Add controlled retrieval only after the private path is stable.

### 13.2 Team Responsibilities

Suggested ownership:

1. Product or Business Analyst:
   - define target BRD template
   - identify required output sections
   - review assumptions and business scope

2. Engineering Lead or Architect:
   - define data-classification policy
   - design private inference and routing rules
   - own technical validation criteria

3. Backend Engineer:
   - implement provider router
   - build validators and secure APIs
   - integrate secure storage and audit logic

4. Security or Platform Engineer:
   - define outbound controls
   - enforce access policies
   - monitor logs, secrets, and infra posture

5. QA:
   - validate edge cases
   - test prompt injection resistance
   - verify unsupported claims and output quality gates

### 13.3 Expected Workflow for a BRD Request

1. User submits source material.
2. System classifies sensitivity.
3. Private extractor builds evidence package.
4. System requests generic latest information only if policy allows and only if the document needs it.
5. Private writer generates BRD.
6. Validator flags issues.
7. Reviewer approves or sends back questions.
8. Final BRD is stored and exported.

## 14. Key Risks and Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| Indirect data leakage | Sensitive ideas may leak through poorly sanitized external queries | Use fixed query templates, outbound DLP checks, and no raw text forwarding |
| Overconfidence in local model | Private model may still hallucinate | Use evidence-first generation and review gates |
| Operational overhead | Local inference and retrieval policy add complexity | Deliver in phases and instrument early |
| Performance issues | Local inference may be slower | Use model sizing, batching, caching, and async workflows |
| False sense of security | Team may assume hybrid means perfect confidentiality | Define explicit limits and fail-closed policies |
| Weak source quality | External retrieval may bring stale or low-quality content | Restrict sources and record citations with retrieval date |

## 15. Success Criteria

The project should be considered successful if it achieves the following:

1. Sensitive BRD inputs remain within the private inference path by default.
2. Unauthorized users cannot read or modify other users' BRDs.
3. Generated BRDs consistently include scope, constraints, risks, and measurable success criteria.
4. Unsupported claims are flagged before final storage.
5. Current or latest information is added only through controlled retrieval with source traceability.
6. The final document quality is closer to an architect-reviewed draft than a generic AI summary.

## 16. Recommendation

The recommended direction is to move from direct external BRD generation to a private-first hybrid BRD architecture.

This is the best balance for the current product because it:

1. materially improves confidentiality,
2. increases trust in the BRD output,
3. supports current-information use cases safely,
4. creates a realistic path to enterprise readiness,
5. and aligns with how serious technical documentation should be produced.

The recommended immediate next step is to implement Phase 1 and Phase 2 first:

1. security foundation,
2. provider abstraction,
3. and output sanitization.

Once that baseline is complete, the evidence-first BRD pipeline can be introduced with much lower risk.

## 17. Appendix: Impact on Current Codebase

The following areas of the current project are likely to change:

1. `lib/perplexity.ts`
   - refactor into provider router and staged generation services

2. `app/api/generate-brd/route.ts`
   - change from direct generation to orchestrated pipeline entrypoint

3. `app/api/generate-brd-from-file/route.ts`
   - add classification, extraction, and validation flow

4. `lib/supabase.ts`
   - separate server-only and client-safe Supabase usage

5. `components/BRDViewer.tsx`
   - sanitize rendered HTML and consume validated output

6. authentication and storage layer
   - replace hardcoded identity patterns with real user identity and row-level controls

## 18. Final Note

This proposal is designed to improve security and quality substantially, not to claim impossible perfection.

The right target is:

1. stronger protection of sensitive ideas,
2. lower hallucination,
3. more practical and reviewable BRDs,
4. and a system that a manager, architect, and client can trust more than a direct one-shot AI output flow.
