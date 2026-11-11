# Engineering Implementation History (changelog-dev.md)

### 2026-11-11 Frontend CI ESLint & Static Analysis Hygiene
*   **Static Analysis & Linting Pass**:
    *   Resolved all 22 ESLint violations (5 errors, 17 warnings) failing CI's `Frontend Tests (Vitest + tsc + lint)` gate.
    *   **Empty Blocks (`no-empty`)**: Added explanatory non-fatal storage comments to empty catch blocks in [`frontend/src/components/SessionTimeoutManager.tsx`](file:///D:/TMS/frontend/src/components/SessionTimeoutManager.tsx).
    *   **Hook Exhaustive Dependencies (`react-hooks/exhaustive-deps`)**: Added `setToken` to dependency array in `SessionTimeoutManager.tsx` and `queryClient` in [`frontend/src/hooks/useRealtimeSync.ts`](file:///D:/TMS/frontend/src/hooks/useRealtimeSync.ts).
    *   **Unused Variables (`@typescript-eslint/no-unused-vars`)**: Removed unused imports and unreferenced parameters in [`frontend/src/features/inventory/components/CreateDieModal.tsx`](file:///D:/TMS/frontend/src/features/inventory/components/CreateDieModal.tsx), [`frontend/src/features/inventory/components/DieDetailPage.tsx`](file:///D:/TMS/frontend/src/features/inventory/components/DieDetailPage.tsx), [`frontend/src/features/inventory/components/InventoryPage.tsx`](file:///D:/TMS/frontend/src/features/inventory/components/InventoryPage.tsx), [`frontend/src/features/inventory/components/InventorySubViews.tsx`](file:///D:/TMS/frontend/src/features/inventory/components/InventorySubViews.tsx), [`frontend/src/features/inventory/components/RackLayoutGrid.tsx`](file:///D:/TMS/frontend/src/features/inventory/components/RackLayoutGrid.tsx), and [`frontend/src/pages/SettingsPage.tsx`](file:///D:/TMS/frontend/src/pages/SettingsPage.tsx).
    *   **Verification**: `npm run lint` (0 errors, 0 warnings), `tsc --noEmit` (0 errors), Vitest (111/111 passing), Vite build (0 errors).

### 2026-11-11 CI Settings Startup Validation Isolation
*   **Test Runner Environment Contamination Fix**:
    *   Updated `test_celery_broker_uses_dedicated_redis_broker` in [`backend/users/tests/test_settings.py`](file:///D:/TMS/backend/users/tests/test_settings.py) to remove test runner environment overrides (`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_CACHE_URL`) from `os.environ` prior to reloading `tms.settings`.
    *   Eliminated GitHub Actions failure (`AssertionError: 'redis-broker' not found in 'redis://localhost:6379/1'`) occurring because the CI runner explicitly set `CELERY_BROKER_URL: 'redis://localhost:6379/1'` in the job environment, which overrode the default architectural setting (`redis-broker:6379/0`).
    *   Verified full Django test suite passes: 232/232 tests passing cleanly in 69.8s.

### 2026-11-11 Bulk Die Rename Smart Idempotency & Audit Recovery
*   **Smart Idempotency Engine in RenameService**:
    *   Enhanced [`backend/dies/services/rename_service.py`](file:///D:/TMS/backend/dies/services/rename_service.py) with historical rename awareness. When a row's `old_die_id` is missing from inventory and `new_die_id` exists, the service performs a bulk query against [`DieHistory`](file:///D:/TMS/backend/history/models.py) to check if the target die was already renamed from `old_die_id` historically.
    *   Rows already renamed are marked as `ALREADY_COMPLETED` / `already_up_to_date` with 0 validation errors, preventing completed dies from blocking remaining pending renames.
    *   Enhanced [`frontend/src/pages/ImportPage.tsx`](file:///D:/TMS/frontend/src/pages/ImportPage.tsx) to display **ALREADY UP-TO-DATE** indicators in both the dry-run simulation modal and final results banner.
    *   Added regression test `test_rename_already_completed_dies_skipped_gracefully` in [`backend/dies/tests/test_rename.py`](file:///D:/TMS/backend/dies/tests/test_rename.py) (9/9 tests pass).

### 2026-11-11 Dedicated Bulk Die Rename Tool (LLM Council Consensus)
*   **Collision-Safe 2-Phase Renaming Engine**:
    *   Created `RenameService` in [`backend/dies/services/rename_service.py`](file:///D:/TMS/backend/dies/services/rename_service.py) supporting CSV and XLSX 2-column mapping ingestion (`old_die_id` -> `new_die_id`).
    *   Implemented 2-phase transactional renaming inside `transaction.atomic()`: Phase 1 assigns unique temporary identifiers (`__TMP_RN_{id}_{uuid}__`) to prevent PostgreSQL unique constraint violations during cyclical renames or swaps (`DIE_A <-> DIE_B`); Phase 2 applies final target IDs.
    *   Pre-validates formatting (`ValidationService.validate_die_id`), maximum 50 character limits, file-internal duplicates, inventory existence, and target collision with unaffected dies.
    *   Includes dry-run validation simulation (`dry_run=True`) reporting exact preview rows and error summaries without committing changes.
*   **Cryptographic Audit Logging & Dual-Engine Sync**:
    *   Generates `DieHistory` entries with `field_name='die_id'`, `old_value=old_id`, `new_value=new_id`, attributed to the authenticated user and client IP address, preserving `hash_version=2` SHA-256 cryptographic chain verification.
    *   Enqueues HMAC-signed `OutboxTask`s (`SearchService.sync_dies_batch`) for Meilisearch index synchronization.
    *   Increments Redis atomic 64-bit generation counter (`search_cache_gen`) to invalidate cached search queries in $O(1)$ time.
    *   Broadcasts SSE `DIE_UPDATE_EVENT` notifying connected frontends to rebuild views.
*   **API Endpoints & Background Celery Worker**:
    *   Implemented `RenameDiesView` (`POST /api/v1/import/rename/` and `/api/import/rename/`) and `RenameTemplateView` (`GET /api/v1/import/rename-template/` and `/api/import/rename-template/`) in [`backend/dies/views.py`](file:///D:/TMS/backend/dies/views.py).
    *   Implemented `rename_dies_task` Celery task in [`backend/dies/tasks.py`](file:///D:/TMS/backend/dies/tasks.py) tracking background progress in Redis `import_status` key for `/api/go/import-status` polling.
    *   Restricted endpoints to `IsAdminOrRoot` permission classes with 10MB payload limit.
*   **Unified UI Integration & Triple-Theme Compliance**:
    *   Enhanced [`frontend/src/pages/ImportPage.tsx`](file:///D:/TMS/frontend/src/pages/ImportPage.tsx) with tabbed mode switching between "01 Master Catalog Ingestion" and "02 Bulk ID Rename".
    *   Added dedicated template download (`tms_die_rename_template.xlsx`), dry-run preview modal with "TO RENAME" metrics, error report CSV downloads, and dynamic step guides.
    *   Complied with monospace Dark Terminal, Classic Slate, and Precision Light tokens.
*   **Verification**:
    *   Added comprehensive test suite in [`backend/dies/tests/test_rename.py`](file:///D:/TMS/backend/dies/tests/test_rename.py) (8/8 tests pass).
    *   Full test suites pass: Django (231/231 tests in 65.9s), Vitest frontend (111/111 tests in 24.5s), and Go API (100% pass). Production Vite build verified.

### 2026-11-11 CI Test Stability & Backup Restore Mock Isolation
*   **Database Connection Termination Isolation**:
    *   Extracted `terminate_database_connections(db_name: str)` in [`backend/users/services/backup_service.py`](file:///D:/TMS/backend/users/services/backup_service.py) as an isolated static method on `BackupService`.
    *   Resolved infinite `fetchmany` loop in [`backend/users/tests/test_backups.py`](file:///D:/TMS/backend/users/tests/test_backups.py) where patching `django.db.connection.cursor` poisoned subsequent Django ORM calls (`Session.objects.all().delete()`, `UserSession.objects.all().delete()`), causing a memory exhaustion process SIGKILL in CI (`Backend Tests (Django)` failed after 4m 29s).
    *   Separated testing: `test_terminate_database_connections` tests the SQL cursor and connection closure directly, while `test_restore_backup_terminates_connections_and_flushes_redis_sessions` mocks `BackupService.terminate_database_connections` without interfering with Django's test runner database connection.
    *   Verified full Django test suite passes: 223/223 tests passing (`Ran 223 tests in 66.853s: OK`).

### 2026-11-10 Die ID Search Relevance Defense-in-Depth & Meilisearch Typo Disabling (LLM Council)
*   **Meilisearch Typo Disabling on Die ID**:
    *   Configured `'disableOnAttributes': ['die_id']` inside `typoTolerance` settings across [`backend/search/meili.py`](file:///D:/TMS/backend/search/meili.py), [`backend/search/tasks.py`](file:///D:/TMS/backend/search/tasks.py), and [`backend/dies/management/commands/sync_search.py`](file:///D:/TMS/backend/dies/management/commands/sync_search.py). Prevents sequential tooling serial numbers from matching unrelated dies within 1-2 edit distances (resolving queries with sequential serial numbers matching tens of unrelated serials).
    *   Updated test harness index setup in [`backend/dies/tests/test_search.py`](file:///D:/TMS/backend/dies/tests/test_search.py) and [`backend/dies/tests/test_import.py`](file:///D:/TMS/backend/dies/tests/test_import.py) to match production settings.
*   **Go Search API Digit Query Relevance Pruning**:
    *   Restored strict digit-containing query filtering in [`go-api/internal/handlers/handlers.go`](file:///D:/TMS/go-api/internal/handlers/handlers.go) (`QueryMeilisearchAndPostgres`): when `hasDigits == true`, candidates scoring `<= 50` (baseline fuzzy hits) are dropped from the result set.
    *   Updated pagination `totalCount` to report `len(filtered)` when digit filtering is active, preventing mismatched total counters in search result banners.
    *   Updated [`go-api/internal/handlers/handlers_test.go`](file:///D:/TMS/go-api/internal/handlers/handlers_test.go) with explicit regression tests asserting that specific serial query returns 1 match and discards adjacent serial numbers.
*   **Cache & Verification**:
    *   Incremented `search_cache_gen` to 3 in Redis via Django shell.
    *   Rebuilt and restarted `tms-go-api:latest` container.
    *   Verified live Go API search returns exactly 1 result for specific tooling serial queries.
    *   Ran test suites: Go (100% pass), Django (93/93 pass), Vitest (111/111 pass).

### 2026-11-10 Die ID Search Prefix Matching Hardening
*   **Die ID Strict Prefix Matching**:
    *   Hardened PostgreSQL query builder in [`go-api/internal/database/database.go`](file:///D:/TMS/go-api/internal/database/database.go#L139-L225) (`buildWhereClauses`): switched `d.die_id` filtering from arbitrary wildcard `ILIKE '%query%'` to strict starts-with prefix matching `d.die_id ILIKE 'query%'`.
    *   Preserved metadata attribute wildcard search (`d.casing`, `d.status`, `s.name`, `m.name`) using `%query%`.
    *   Updated relevance scoring engine in [`go-api/internal/handlers/handlers.go`](file:///D:/TMS/go-api/internal/handlers/handlers.go#L580-L594) (`scoreDie`): removed substring matching on `die_id` from score 70 so only exact matches (score 90) and prefix matches (score 80) score for Die ID. Internal substrings (such as query `88001` matching `PREFIX-88001`) are excluded.
    *   Added test cases in [`go-api/internal/database/database_test.go`](file:///D:/TMS/go-api/internal/database/database_test.go) and [`go-api/internal/handlers/handlers_test.go`](file:///D:/TMS/go-api/internal/handlers/handlers_test.go).
    *   Verified full test suite passes (Go tests 100%, Django 93/93, Vitest 111/111).
    *   Rebuilt and verified live `tms-go-api:latest` container with prefix matching.

### 2026-11-10 Cryptographic Server-Enforced Lock Boundary & Complete Documentation De-Rackification
*   **Cryptographic Server-Side Lock Boundary (LLM Council Proposal B)**:
    *   Hardened `frontend/src/components/SessionTimeoutManager.tsx` with token eviction upon lock (`localStorage.removeItem('tms_token')` and `setToken(null)`). Any API request dispatched while locked returns `HTTP 401 Unauthorized` directly from Django and Go, preventing client DevTools bypass.
    *   Updated `displayUsername` caching in `localStorage.setItem('tms_locked_username', ...)` so user identity persists on the locked modal across reloads and tab events while the token itself is erased.
    *   Updated `ProtectedRoute` in `frontend/src/App.tsx` (`!token && !isLocked`) to maintain active form DOM mounting beneath the lock modal, while instantly kicking users to `/login` if `tms_is_locked` is removed.
    *   Updated cross-tab broadcast synchronization (`BroadcastChannel` & `storage` events) to evict tokens on remote lock and restore newly authenticated tokens on remote unlock.
    *   Added Vitest unit test in `SessionTimeoutManager.test.tsx` testing token eviction on lock, fresh token restoration on unlock, and remote storage lock/unlock synchronization (111/111 passing).
*   **Exhaustive Documentation De-Rackification**:
    *   Purged all legacy warehouse rack and shelf references across `.dev/modules/backend.md`, `.dev/modules/frontend.md`, `.dev/architecture/api.md`, `.dev/modules/dies.md`, `.dev/architecture/database.md`, `.dev/architecture/coding-standards.md`, `.dev/business/project.md`, `.dev/business/roadmap.md`, `.dev/state/progress.md`, `PROJECT.md`, and `CHANGELOG.md`.
    *   Verified 100% zero discrepancies across documentation and production implementations.

### 2026-11-10 Security Hardening, Lock Screen MFA & Documentation Hygiene (LLM Council Audit)
*   **Lock Screen Security & Persistent State**:
    *   Hardened `SessionTimeoutManager.tsx` to persist `tms_is_locked` in `localStorage`, preventing lock screen bypass upon browser reload or in secondary tabs.
    *   Added multi-tab broadcast synchronization (`LOCK_SESSION` and `UNLOCK_SESSION`) via `BroadcastChannel` and storage event listeners.
    *   Added Two-Factor Authentication (MFA) backup code verification step to the lock screen unlock flow (`/api/v1/auth/backup-codes/verify/`), closing the vulnerability where MFA-enabled accounts could bypass 2FA on unlock.
    *   Added request blocking in `useApi.ts` preventing background or foreground API dispatching while the session is locked.
*   **SSE Invalidation & BRIN Exception Logging**:
    *   Updated `useRealtimeSync.ts` to invalidate all queries (`queryClient.invalidateQueries()`) upon network reconnection, preventing stale data for sets, backups, and inventory recount records.
    *   Hardened `auto_prune_history` in `backend/history/tasks.py` with `connection.vendor == 'postgresql'` check and explicit exception logging via `logger.warning`.
    *   Updated absolute expiration banner text in `SessionTimeoutManager.tsx` to dynamically interpolate active configured timeout hours.
*   **Documentation Parity & Goal Alignment**:
    *   Purged legacy warehouse rack and shelf references across `README.md`, `PROJECT.md`, `.dev/modules/machines.md`, `.dev/architecture/api.md`, and `.dev/architecture/database.md`.
    *   Synchronized `.dev/state/current-goal.md` target date (2026-11-10), updated `.dev/audits/latest.md` for v1.1.0 release verification, and updated `.dev/metrics/metrics.md`.
    *   Added 2 new frontend unit tests in `SessionTimeoutManager.test.tsx` (110/110 passing).

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
