---
name: llm-council
description: >-
  Execute a 3-stage multi-perspective deliberation and peer-review council before
  implementing high-stakes, ambiguous, or irreversible changes. Use when confidence is
  between 70% and 94%, when modifying core architecture, security/RBAC models, database
  schemas, or deterministic engineering physics, or whenever the user asks for a council review.
---

# LLM Council Protocol Skill

## Purpose
Adapt Andrej Karpathy's 3-stage LLM Council deliberation architecture for autonomous engineering within the Tool Management System (TMS).

The council eliminates single-model blindspots, confirmation bias, and superficial implementations by forcing divergent perspectives, anonymized peer critique, and a synthesized chairman consensus before high-stakes code is written.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: DIVERGENT OPINIONS                     │
│  [Architect Persona]        [Security Specialist]     [Domain/Perf]    │
│    (Proposal A)                (Proposal B)            (Proposal C)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 STAGE 2: ANONYMIZED PEER REVIEW & RANKING               │
│  - Strip model/persona identities (Proposal A, B, C)                   │
│  - Each persona critiques strengths, weaknesses, failure modes         │
│  - Each persona outputs strict format "FINAL RANKING: 1. B, 2. A, 3. C"│
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      STAGE 3: CHAIRMAN SYNTHESIS                       │
│  - Aggregate rankings & calculate consensus score                      │
│  - Synthesize hardened compromise addressing all peer critiques        │
│  - Formulate executable implementation plan                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## When to Trigger the Council

The agent MUST activate this skill when:
1. **Confidence Threshold 70%–94%**: The task is achievable but carries design choices, non-obvious trade-offs, or multiple plausible implementations.
2. **Architecture Shifts**: Changes spanning the dual-engine boundary (Django write path vs. Go search proxy / SSE pipeline).
3. **Security & RBAC Changes**: Modifying authentication, session revocation, single-use MFA codes, permission boundaries (`backend/users/permissions.py`), or secrets management.
4. **Data Model & Schema Migrations**: Modifying high-volume tables (`Die`, `History`, `User`, `Machine`) or creating non-trivial PostgreSQL indexes.
5. **Deterministic Engineering Calculations**: Modifying wire drawing algorithms, Rust/Wasm FEA stress solvers, or ISO/DIN technical data calculations.
6. **Explicit User Directive**: The user mentions "run council", "get second opinion", "review options", or asks the council to deliberate.

---

## Execution Protocol

### Stage 1: Formulate Problem & Collect Divergent Opinions

1. Formulate the core engineering question and constraints:
   - Functional requirements.
   - Architectural constraints (Postgres 18, Redis 7, Meilisearch 1.7, Django 4.2, Go 1.22, React 18).
   - Invariants (air-gap friendly, non-root execution, triple-theme support, immutable audit history).

2. Spawn 3 distinct personas using `invoke_subagent` (or internal multi-perspective reasoning):

   - **Persona 1: Systems & Infrastructure Architect**
     - *Focus*: Data integrity, atomicity, PostgreSQL locking, cache invalidation, reversibility, and TMS design patterns.
   - **Persona 2: Security & Safety Specialist**
     - *Focus*: Least privilege, RBAC boundaries, input validation, CSRF/XHR headers, non-root container safety, audit logging.
   - **Persona 3: Domain & Reliability Engineer**
     - *Focus*: Sub-millisecond performance, wire drawing physics correctness, edge case resilience, operational simplicity.

3. Each persona drafts an independent proposal answering:
   - Recommended technical solution.
   - Exact files and tables touched.
   - Trade-offs accepted and trade-offs rejected.

---

### Stage 2: Anonymized Peer Review & Ranking

1. **Anonymize the Proposals**:
   Label them neutrally:
   - `Proposal A`
   - `Proposal B`
   - `Proposal C`

   *Remove any references indicating which persona authored which proposal to eliminate confirmation bias.*

2. **Conduct Blind Peer Review**:
   Present all proposals to each reviewer persona with the prompt:
   ```text
   You are evaluating alternative engineering solutions for: [Problem Description]
   
   Proposals:
   Proposal A: [Content]
   Proposal B: [Content]
   Proposal C: [Content]
   
   Your task:
   1. Evaluate each proposal individually. List its key strengths, hidden failure modes, and edge cases.
   2. Identify any assumptions that violate TMS architecture (e.g. breaking the Go read path, bypassing transaction.atomic, skipping theme tokens).
   3. At the very end of your response, provide your final ranking in this EXACT format:
   
   FINAL RANKING:
   1. Proposal [X]
   2. Proposal [Y]
   3. Proposal [Z]
   ```

3. **Calculate Aggregate Ranking**:
   Score proposals based on average rank position across reviewers (Position 1 = 3 pts, Position 2 = 2 pts, Position 3 = 1 pt).

---

### Stage 3: Chairman Synthesis & Action Plan

The primary agent (acting as Chairman) analyzes:
- The individual proposals from Stage 1.
- The peer critiques, blind spots, and rankings from Stage 2.
- The aggregate consensus score.

The Chairman then compiles the **Council Deliberation Report**:

```markdown
### LLM Council Deliberation Report

#### Problem Statement
[Concise summary of the challenge]

#### Stage 1 Proposals (Summary)
- **Proposal A** ([Perspective]): [Summary]
- **Proposal B** ([Perspective]): [Summary]
- **Proposal C** ([Perspective]): [Summary]

#### Stage 2 Peer Review Findings
- **Consensus Points**: [What all reviewers agreed upon]
- **Critical Flaws Identified**: [Fatal flaws caught during peer review]
- **Aggregate Rankings**:
  1. Proposal [X] (Score: N)
  2. Proposal [Y] (Score: N)
  3. Proposal [Z] (Score: N)

#### Stage 3 Chairman Verdict
[Synthesized decision combining the highest-ranked proposal with mitigations for any flaws discovered during Stage 2]

#### Actionable Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

---

## TMS Specific Council Checklists

When reviewing proposals, the council must verify against TMS invariants:
- [ ] **Dual-Engine Boundary**: Write operations go to Django via PostgreSQL transactions; search and streaming go through Go API and Meilisearch.
- [ ] **Air-Gap / LAN First**: Zero third-party telemetry, self-hosted fonts, no unauthorized egress calls.
- [ ] **RBAC Guard**: Mutating operations enforce role permissions (`ROOT`, `ADMIN`, `OPERATOR`) and `X-Requested-With: XMLHttpRequest`.
- [ ] **Deterministic Engineering**: Never replace exact mathematical or physical formulas with heuristic models.
- [ ] **Triple-Theme Parity**: UI changes must support **Dark Terminal**, **Classic Slate**, and **Precision Light**.
