# Engineering Implementation History (changelog-dev.md)

### 2026-11-01 Platform v1.0.0 Initial Release
*   **Initial Production Release**:
    *   Synchronized application version to `1.0.0` (v1.0.0) across frontend (`frontend/package.json`, `frontend/package-lock.json`), backend (`backend/tms/settings.py`, `backend/schema.yml`), and deployment documentation (`DOCKER.md`).
    *   Consolidated and cleaned `CHANGELOG.md` to authoritatively document the initial release of Tool Management System (TMS) v1.0.0.
    *   Removed legacy static report build artifacts (`wire-drawing-tds-report.html`, `wire-drawing-tds-report.pdf`) and obsolete audit archives.
    *   Established clean Git repository history with a single root initial commit on branch `main`.
*   **Dual-Engine High-Performance Architecture**:
    *   Django 4.2 REST write path with PostgreSQL 18 transactional consistency, Redis 7 caching, and Meilisearch v1.7 fuzzy text search outbox synchronization.
    *   Go 1.22 search proxy and SSE real-time broadcast engine with atomic generation counter cache invalidation.
*   **Wire Drawing Workbench & Vector Print System**:
    *   3-mode vector print engine (`full-report` 2-page ISO/DIN TDS, `visual-pipeline` 1-page visual drafting traveler, and `data-table` 1-page schedule).
    *   High-contrast pure vector SVG pass charts for Elongation (%) and Area Reduction (%) with isolated right-gutter average pill badges.
    *   Interactive Results Table with in-place reverse solvers (`calculateDieFromElongation`, `calculateDieFromReduction`, `calculateDieFromRatio`), inline die editing, and ASTM/ISO compliance badges.
    *   3D CAD WebGL bore visualizer and client-side Rust/WebAssembly finite element stress analysis (FEA) solver.
*   **Security & Auditing**:
    *   Role-Based Access Control (`ROOT`, `ADMIN`, `OPERATOR`, `VIEWER`) with fine-grained tool authorization.
    *   Single-use SHA-256 hashed recovery backup codes MFA (`UserBackupCode`) with CLI emergency reset.
    *   Automated session eviction on privilege modification and reverse proxy client IP attribution.
    *   Unprivileged container process execution (`USER tmsuser`, UID 1001).
*   **Verification**:
    *   TypeScript: 0 compiler errors (`npx tsc --noEmit`).
    *   Vitest: 28 test suites, 98/98 unit tests passing (`npm test -- --run`).
    *   Vite production build succeeded with 0 errors.
