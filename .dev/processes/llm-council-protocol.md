# LLM Council Engineering Protocol

## Purpose
Define the standard operating protocol for multi-perspective deliberation and peer review across AI agents and engineers working on TMS.
**Why:** Prevent confirmation bias, eliminate single-agent blindspots, and ensure optimal architecture decisions before touching code.
**Read by:** AI agents, engineers.
**Updated:** When decision frameworks change.

---

## Background & Philosophy
Adapted from Andrej Karpathy's `llm-council` architecture, the TMS Council Protocol replaces impulsive single-turn implementations with a structured 3-stage deliberation cycle:
1. **Divergent Opinions**: Explore multiple distinct technical angles in parallel.
2. **Anonymized Peer Review & Blind Ranking**: Strip model/persona identities so proposals are judged purely on technical merit, failure modes, and edge cases.
3. **Chairman Synthesis**: A designated Chairman synthesizes the debate into a single, cohesive, battle-hardened implementation plan.

---

## When to Invoke the Council

The Council Protocol is automatically invoked under the following criteria:

| Trigger Condition | Scope / Examples | Action |
| :--- | :--- | :--- |
| **Confidence 70%–94%** | Non-trivial refactors, ambiguous trade-offs, multiple valid patterns | Full 3-Stage Deliberation |
| **Structural Architecture** | Dual-engine boundary (Django/Go), caching invalidation, SSE streams | Full 3-Stage Deliberation |
| **Security & RBAC** | Auth flows, MFA tokens, session revocation, permissions | Full 3-Stage Deliberation |
| **Schema Migrations** | Modifications to `Die`, `History`, `User`, or composite indexes | Full 3-Stage Deliberation |
| **Deterministic Math & FEA** | Wire drawing physics, Siebel forces, Rust/Wasm solver | Full 3-Stage Deliberation |
| **Explicit Request** | User prompts: "run council", "evaluate options", "review trade-offs" | Full 3-Stage Deliberation |

Tasks with **Confidence ≥95%** (standard bug fixes, following established patterns) do not require full council deliberation and proceed directly to implementation. Tasks with **Confidence <70%** stop immediately and escalate to the human user.

---

## Protocol Execution Workflow

### Stage 1: Divergent Opinions
The primary agent or orchestrator dispatches 3 specialized personas:

1. **Systems & Infrastructure Architect**:
   - Focuses on relational consistency (PostgreSQL 18), lock contention, transaction boundaries, and cache coherence (Redis 7 + Meilisearch).
2. **Security & Safety Specialist**:
   - Focuses on attack surface, role-based access control (`backend/users/permissions.py`), HMAC signing, CSRF/XHR headers, and non-root execution.
3. **Domain & Performance Engineer**:
   - Focuses on sub-millisecond read latency, wire drawing precision math, client-side Wasm performance, UI responsiveness, and code simplicity.

Each persona produces an independent proposal containing:
- High-level architecture.
- Affected files, schemas, and endpoints.
- Concrete trade-offs accepted vs. rejected.

---

### Stage 2: Anonymized Peer Review & Blind Ranking
Proposals are stripped of author/persona labels and neutrally renamed:
- `Proposal A`
- `Proposal B`
- `Proposal C`

Each reviewer persona receives all proposals blindly and performs two steps:
1. **Critical Review**: Uncovers hidden edge cases, failure modes, concurrency issues, or violations of TMS guidelines.
2. **Strict Formatted Ranking**: Concludes with the mandatory ranking syntax:
   ```text
   FINAL RANKING:
   1. Proposal [X]
   2. Proposal [Y]
   3. Proposal [Z]
   ```

Aggregate rankings are calculated by Borda count or positional scoring (1st = 3 pts, 2nd = 2 pts, 3rd = 1 pt).

---

### Stage 3: Chairman Synthesis
The Chairman reviews:
- Original proposals from Stage 1.
- Peer critiques and discovered edge cases from Stage 2.
- Aggregate positional rankings.

The Chairman formulates a **Council Deliberation Summary**:
1. **Consensus Points**: What all reviewers agreed upon.
2. **Mitigated Flaws**: How the winning proposal is modified to address valid criticisms from other reviewers.
3. **Final Implementation Plan**: Concrete, step-by-step instructions for the implementation phase.

---

## TMS Architectural Invariants
All proposals and reviews must adhere to TMS core principles:
1. **Dual-Engine Split**: Mutating write paths go through Django ORM and PostgreSQL transactions. Search and read queries route through the Go API.
2. **Air-Gap First**: Zero external telemetry, no remote script tags, self-hosted WOFF2 fonts.
3. **Defense in Depth**: Mutating cookie APIs require `X-Requested-With: XMLHttpRequest`. Celery tasks sign payloads with HMAC-SHA256.
4. **Theme Parity**: Frontend components must render correctly across **Dark Terminal**, **Classic Slate**, and **Precision Light**.
5. **No Blind Code Generation**: Code is written only after the synthesis plan is complete.
