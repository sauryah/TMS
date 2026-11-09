# Engineering Implementation History (changelog-dev.md)

### 2026-11-10 Session Lifecycle, Network Resiliency & Ledger Maintenance (LLM Council Implementation)
*   **Automated Housekeeping & Celery Beat Scheduling**:
    *   Registered `expire_sessions_task` in `backend/users/tasks.py` and scheduled `auto-expire-sessions-periodic` in `backend/tms/settings.py` (`CELERY_BEAT_SCHEDULE`) to run every 15 minutes, actively purging dead sessions and evicting Redis cache keys without waiting for subsequent user HTTP calls.
    *   Added automated BRIN index page summarization (`SELECT brin_summarize_new_values('die_hist_ts_brin_idx')` and `'mach_hist_ts_brin_idx'`) in `backend/history/tasks.py` to keep audit index ranges synchronized after pruning.
    *   Exposed `session_idle_timeout_minutes` and `session_absolute_timeout_hours` via unauthenticated `ServerInfoView` (`AllowAny`) and login response payloads in `backend/users/views/auth.py`.
    *   Added unit tests `test_expire_sessions_celery_task` and `test_server_info_view_unauthenticated_and_contains_session_config` in `backend/users/tests/test_auth.py`.
*   **SSE Industrial Network Resiliency**:
    *   Hardened `frontend/src/hooks/useRealtimeSync.ts` by removing the 5-attempt reconnection cutoff (`MAX_RECONNECT_ATTEMPTS`), transitioning to continuous exponential backoff (capped at 30s with random jitter) and automatic state query invalidation upon network re-establishment.
*   **Client Session Continuity & Form Preservation UX**:
    *   Refactored `frontend/src/components/SessionTimeoutManager.tsx` to dynamically ingest server timeout policies via `/api/v1/server-info/`.
    *   Integrated cross-tab user activity synchronization via `BroadcastChannel('tms_activity_sync')` with debounced fallback to `localStorage` storage events, preventing secondary browser tabs from prematurely logging operators out.
    *   Implemented in-place Lock Screen modal ("SESSION LOCKED") protecting shop-floor form inputs from being cleared on idle timeouts, offering password re-authentication with brute-force lockout safeguards.
    *   Added 10-minute advance warning banner for 12-hour absolute session expiration.
    *   Updated and expanded frontend unit tests in `SessionTimeoutManager.test.tsx` (108/108 Vitest tests passing).

### 2026-11-10 PostgreSQL Audit History Scaling & BRIN Indexing
*   **Database & Retention Optimization (LLM Council Proposal C)**:
    *   Added `'django.contrib.postgres'` to `INSTALLED_APPS` in `backend/tms/settings.py`.
    *   Optimized `DieHistory` and `MachineHistory` indexes in `backend/history/models.py` with PostgreSQL `BrinIndex(fields=['timestamp'], pages_per_range=128)` for ultra-compact date filtering on 1M+ rows.
    *   Added composite index `(die, -id)` to optimize $O(1)$ select_for_update cryptographic parent hash queries, and `(die, -timestamp)` for timeline lookups.
    *   Generated and applied migration `backend/history/migrations/0009_optimize_history_brin_and_composite_indexes.py`.
    *   Fixed `timestamp` field precision from `auto_now_add=True` to `default=timezone.now` so Django's `pre_save` does not overwrite the timestamp used in the cryptographic SHA-256 hash calculation, ensuring 100% hash verification pass.
    *   Hardened `prune_history.py` management command with batch chunking (`--batch-size 5000`) to eliminate table lock contention and transaction log spikes during history maintenance.
    *   Added unit test `test_prune_history_chunked_batches` in `backend/dies/tests/test_prune_history.py` and updated `backend/dies/tests/test_import.py`.

### 2026-11-10 LLM Council Engineering Protocol & Workspace Skill
*   **Operating System & Deliberation Architecture Integration**:
    *   Created `.agents/skills/llm-council/SKILL.md` workspace skill adapting Karpathy's 3-stage council (Divergent Opinions -> Anonymized Peer Review -> Chairman Synthesis) for autonomous pair-programming.
    *   Documented official engineering protocol in `.dev/processes/llm-council-protocol.md` defining triggers (Confidence 70%–94%, structural architecture, security/RBAC, schema migrations, deterministic wire drawing physics).
    *   Updated `AGENTS.md` Confidence Thresholds and Review Loops to mandate LLM Council deliberation as a pre-implementation gate for high-stakes modifications.
    *   Updated `.dev/processes/engineering-workflow.md` and `.dev/processes/review-process.md` adding Gate 0 (LLM Council Deliberation) to review gates and approval matrices.

### 2026-11-09 Shell Script Executable Permissions
*   **Permission Hardening for Automation Scripts**:
    *   Set executable permissions (`+x` / mode `100755`) on `setup.sh` and shell utilities in `scripts/` (`build-wasm.sh`, `client-install-template.sh`, `dependency-auditor.sh`, `env-doctor.sh`, `generate-certs.sh`, `sync-meili.sh`, `uninstall-certs.sh`, `verify-backup-integrity.sh`) enabling direct execution without manual permission adjustments.

### 2026-11-07 Platform v1.1.0 Release
*   **Application Version Synchronization**:
    *   Synchronized application version to `1.1.0` (v1.1.0) across frontend (`frontend/package.json`), backend (`backend/tms/settings.py`, `backend/schema.yml`), documentation (`README.md`, `CHANGELOG.md`, `DOCKER.md`, `docker-compose.ghcr.yml`), and MCP server (`scripts/tms_mcp_server.py`).
    *   Updated `CHANGELOG.md` with release notes detailing de-rackification, UI theme symmetry, contact modal, and architecture sysinfo modal.

### 2026-11-07 Full Removal of Warehouse Racks and Shelves
*   **Backend Database & API De-Rackification**:
    *   Removed `Die.rack` foreign key, `Die.shelf_number`, and composite index `die_rack_shelf_idx` in `backend/dies/models.py`.
    *   Removed `Rack` model from `backend/machines/models.py`.
    *   Created sequential Django migrations `backend/dies/migrations/0019_remove_die_rack_shelf.py` and `backend/machines/migrations/0003_delete_rack.py`.
    *   Removed `RackViewSet` router registration from `backend/tms/urls.py` and deprecated serializers/views into inert placeholders.
    *   Cleaned Django admin registrations, audit signals, Meilisearch index sync tasks, location validation services, and CSV/XLSX import processors.
    *   Updated and fixed backend tests across `dies` (`test_integration`, `test_models`, `test_query_count`, `test_search`, `test_services`, `test_signals`), removing obsolete `Rack` fixtures and imports.
    *   Corrected `@patch` target in `users/tests/test_backups.py` to point directly to `users.services.backup_service.rebuild_search_index_task.delay`.
    *   Permitted `'version'` field in `IsAdminOrRootOrOperatorRelocate` in `backend/users/permissions.py` so operator PATCH requests pass concurrency control validation.
*   **Frontend UI & State De-Rackification**:
    *   Removed `Rack` view mode toggle and `moveDieLocationMutation` from `InventoryPage`, `useInventoryState`, `useInventoryMutations`, and `InventorySubViews`.
    *   Removed bulk rack relocation toolbar from `InventoryPage`.
    *   Removed rack and shelf inputs and validation from `CreateDieModal` and `DieDetailPage`.
    *   Refactored `DieDetailPage` dashboard cards to promote Production Line Assignment to Card 03, removing the legacy Warehouse Mapping section.
    *   Updated `RoundDieCard`, `FlatDieCard`, `DieCard`, and `DashboardPage` to display machine and set assignments without rack/shelf dependencies.
    *   Updated unit tests (`DieCard.test.tsx`, `RoundDieCard.test.tsx`, `FlatDieCard.test.tsx`, `InventoryPage.test.tsx`) with 106/106 tests passing.
    *   Updated footer attribution across `Footer.tsx` and `AboutModal.tsx`, added interactive `ContactModal` with 1-click email copy, and refactored `AboutModal` into a dedicated architecture and security runtime specification modal.

### 2026-11-05 Strict Remote Push Policy Standards
*   **Operating System & Workflow Push Policy**:
    *   Updated `AGENTS.md` Decision Rules and Git & Commit Rules to explicitly forbid autonomous execution of `git push`, requiring explicit user authorization for all remote operations.
    *   Updated `engineering-workflow.md` Step 7 (Complete) and Escalation Triggers, `definition-of-done.md`, and `git-workflow.md` to establish local-only commit workflows unless specifically instructed by the user.

### 2026-11-05 Prevention Architecture & CI Parity Rules Documentation
*   **Engineering Operating System Standards**:
    *   Added `Dependency & CI Parity Rules` to `AGENTS.md` and updated `Review Loops` to enforce `pip check` and infrastructure trinity testing (Postgres, Redis, Meilisearch).
    *   Updated `engineering-workflow.md` and `review-process.md` with explicit gates for driver extras verification and CI service container parity.
    *   Updated `backend/requirements.txt` to specify `celery[redis]==5.6.3` to guarantee package installer resolution verifies transport drivers.

### 2026-11-05 CI Meilisearch Service Container Configuration
*   **CI Test Gate Meilisearch Service Container**:
    *   Configured `meilisearch: getmeili/meilisearch:v1.7` service container with port 7700 mapping and healthcheck in `.github/workflows/docker-publish.yml` under `test-backend`.
    *   Resolves CI failure in `Backend Tests (Django)` where search indexing and healthcheck tests failed with `Connection refused` on `http://localhost:7700`.

### 2026-11-05 Redis Package Version Alignment for Celery Transport
*   **Celery Redis Transport Dependency Resolution**:
    *   Upgraded `redis` from `5.0.1` to `6.4.0` in `backend/requirements.txt` to eliminate Kombu 5.7+ `VersionMismatch` error (`Redis transport requires redis-py versions 6.1.0 or later. You have 5.0.1`).
    *   Updated `users/tests/test_settings.py` to patch `tms.testing.IS_TESTING` in `SettingsStartupValidationTest` so production credential guards can be tested without interference from test harness flags.
    *   Rebuilt `tms-backend:latest` Docker image and verified healthy operation across all Celery containers (`tms-worker-1`, `tms-heavy-worker-1`, `tms-beat-1`).
    *   Verified all 226 backend unit tests pass (`Ran 226 tests in 59.143s: OK`).

### 2026-11-02 Documentation Badge Standardization
*   **README Header Badge Standardization**:
    *   Replaced external dynamic GitHub API and Docker Hub shields.io badges that returned "repo not found" and "no releases" due to private/unreleased endpoints.
    *   Configured static badges: Version (`v1.0.0`), License (`Proprietary`, neutral slate), Deployment (`Docker Compose`), Platform (`LAN / Self-Hosted`), and Architecture (`Dual-Engine`).
    *   Corrected formatting syntax in the client installer documentation section.

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
