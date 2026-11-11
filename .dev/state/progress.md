# Progress

## Purpose
Track implementation status across all phases.
**Why:** Enable visibility into project progress.
**Read by:** AI agents.
**Updated:** Each phase completion.

## Platform Implementation Status

### Bulk Die Rename Smart Idempotency & Audit Recovery ✅
**Status:** Complete  
**Date:** 2026-11-11  

**Completed:**
- **Smart Idempotency in RenameService**: Enabled historical audit checking in `RenameService` (`backend/dies/services/rename_service.py`). When spreadsheet rows contain dies that were already renamed historically (e.g. `LEGACY-SERIES-A01` -> `POSITION-A01`), the engine automatically recognizes them as `ALREADY_COMPLETED` with zero errors.
- **Graceful Partial Batch Processing**: Allows batches with mixed already-renamed and unrenamed dies to safely process the remaining dies without manual spreadsheet pruning.
- **Frontend Up-to-Date Visualization**: Updated `ImportPage.tsx` with `ALREADY UP-TO-DATE` badges in the dry-run simulation modal and completion toasts.
- **Test Suite Verification**: Added unit test in `test_rename.py` (9/9 passing), full Django suite (231/231 passing in 65s), Vitest frontend suite (111/111 passing), and Vite production build verified.

### Dedicated Bulk Die Rename Tool (2-Column Mapping old_die_id -> new_die_id) ✅
**Status:** Complete  
**Date:** 2026-11-11  

**Completed:**
- **2-Phase Collision-Free Renaming Service**: Created `RenameService` in `backend/dies/services/rename_service.py` to handle 2-phase transactional die ID updates inside `transaction.atomic()`, preventing PostgreSQL unique constraint collisions during cyclical or swap renames (`A <-> B`).
- **Cryptographic Audit Log & Dual-Engine Consistency**: Preserved `hash_version=2` SHA-256 chain verification in `DieHistory`, enqueued HMAC-signed `OutboxTask`s for Meilisearch index synchronization, incremented Redis `search_cache_gen` for $O(1)$ search cache busting, and broadcast SSE `DIE_UPDATE_EVENT`.
- **API Endpoints & Celery Task Worker**: Created `RenameDiesView` (`POST /api/v1/import/rename/`), `RenameTemplateView` (`GET /api/v1/import/rename-template/`), and `rename_dies_task` background Celery worker with `IsAdminOrRoot` access control and Redis `import_status` tracking.
- **Frontend Mode Selector & UI Integration**: Enhanced `frontend/src/pages/ImportPage.tsx` with tabbed mode switching ("01 Master Catalog Ingestion" vs "02 Bulk ID Rename"), dedicated Excel template download, dry-run simulation preview, and error report downloads.
- **Full Suite Verification**: Verified with 8 unit tests in `dies.tests.test_rename` (8/8 pass), full Django test suite (231/231 pass in 65.9s), Vitest frontend suite (111/111 pass in 24.5s), Vite production build (0 errors), and Go API suite (100% pass).

### CI Test Stability & Backup Restore Mock Isolation ✅
**Status:** Complete  
**Date:** 2026-11-11  

**Completed:**
- **Database Connection Termination Isolation**: Refactored `BackupService.terminate_database_connections` in `backend/users/services/backup_service.py` into a discrete static method.
- **Elimination of Test Memory Leak / SIGKILL**: Fixed `backend/users/tests/test_backups.py` where patching `django.db.connection.cursor` caused Django's query compiler to enter an infinite `fetchmany` loop during ORM session cleanup, triggering a Linux OOM SIGKILL after 4m 29s in CI.
- **Full Suite Verification**: Verified that all 223 Django tests pass cleanly in 66s (`Ran 223 tests: OK`), Go API tests pass 100%, and Vitest frontend tests pass (111/111).

### Die ID Search Relevance Defense-in-Depth & Meilisearch Typo Disabling ✅
**Status:** Complete  
**Date:** 2026-11-10  

**Completed:**
- **Meilisearch Typo Disabling on Die ID**: Configured `typoTolerance.disableOnAttributes = ["die_id"]` across initialization (`backend/search/meili.py`), task worker (`backend/search/tasks.py`), and management commands (`backend/dies/management/commands/sync_search.py`). Prevents sequential tooling serial numbers from matching unrelated dies within 1-2 character edit distances.
- **Go API Digit Query Relevance Pruning**: Restored strict digit-containing query filtering in `go-api/internal/handlers/handlers.go` (`QueryMeilisearchAndPostgres`), pruning low-relevance baseline candidates (`score <= 50`).
- **Accurate Result Pagination**: Synchronized total match reporting to return `len(filtered)` for digit queries, preventing mismatched search result headers.
- **Cache Refresh**: Incremented `search_cache_gen` to 3 in Redis to invalidate stale search entries.
- **Test Verification**: Added regression tests in `handlers_test.go` and verified 100% pass across Go (100%), Django (93/93), and Vitest (111/111). Live query for specific tooling serial verified to return exactly 1 record (`total: 1`).

### Die ID Search Prefix Matching Hardening ✅
**Status:** Complete  
**Date:** 2026-11-10  

**Completed:**
- **Strict Prefix Matching on Die ID**: Updated `buildWhereClauses` in `go-api/internal/database/database.go` and `scoreDie` in `go-api/internal/handlers/handlers.go` so that Die ID queries match only as exact (score 90) or prefix (`d.die_id ILIKE 'query%'`, score 80). Internal substring matches on Die ID (such as `88001` matching `PREFIX-88001`) are filtered out.
- **Metadata Wildcard Preservation**: Wildcard substring matching remains active for textual metadata fields (`casing`, `status`, `set_name`, `machine_name`, score 70).
- **Test Suite Verification**: Added unit tests in `handlers_test.go` and `database_test.go` covering numeric prefix matching and substring exclusion. All Go, Django (93/93), and Vitest (111/111) test suites pass. Rebuilt and verified against live Docker `go-api` service.

### Session Lifecycle, Network Resiliency & Ledger Maintenance ✅
**Status:** Complete  
**Date:** 2026-11-10  

**Completed:**
- **Automated Session Eviction**: Scheduled Celery Beat task `auto-expire-sessions-periodic` running every 15 minutes to clean dead sessions and Redis keys.
- **BRIN Maintenance**: Nightly `brin_summarize_new_values` for high-volume audit tables (`die_hist_ts_brin_idx`, `mach_hist_ts_brin_idx`).
- **Dynamic Configuration**: Server exposes `session_idle_timeout_minutes` and `session_absolute_timeout_hours` via `ServerInfoView` and login payload.
- **SSE Network Resiliency**: Converted SSE reconnection in `useRealtimeSync.ts` to infinite backoff with full query refresh upon reconnect.
- **Cross-Tab Activity Synchronization**: Synchronized user interactions across browser tabs using `BroadcastChannel` and storage events.
- **Shopfloor Form Preservation (Lock Screen)**: In-place modal re-authentication preventing loss of unsaved form data upon idle timeouts.
- **Absolute Session Warnings**: 10-minute advance banner for 12-hour shift expirations.

### Platform Release v1.1.0 ✅
**Status:** Complete  
**Date:** 2026-11-07  

**Completed:**
- **De-Rackification**: Removed physical warehouse rack and shelf tracking from database models, API endpoints, and frontend user interfaces, refocusing asset management directly on shopfloor machines and tool sets.
- **UI Modernization & Contact Integration**: Integrated dedicated developer contact modal with 1-click clipboard copy, isolated architecture specifications modal, and symmetrical contrast enhancements across Dark Terminal and Precision Light themes.
- **RBAC & Concurrency Hardening**: Added optimistic lock version token authorization for Operator relocation actions.
- **Dependency & CI Parity**: Declared `celery[redis]` transport extras and added Meilisearch service container healthcheck to CI workflows.

### Platform Release v1.0.0 ✅
**Status:** Complete  
**Date:** 2026-11-01  

**Completed:**
- **Core Architecture**: Dual-engine Django 4.2 REST API write path + Go 1.22 search proxy & SSE real-time broadcast engine with PostgreSQL 18, Redis 7, and Meilisearch v1.7.
- **Die Inventory Management**: Full physical tracking (racks/shelves pre-v1.1.0; machine line allocations in v1.1.0+), Round and Flat die support, and physical recount audits.
- **Wire Drawing Workbench**: 3-mode ISO/DIN vector TDS reporting engine (`full-report`, `visual-pipeline`, `data-table`), interactive in-place reverse solvers (`calculateDieFromElongation`), 4-pass-per-row schematic pipeline, 3D WebGL bore visualizer, and Rust/Wasm FEA stress solver.
- **Security & RBAC**: Role-based access control (`ROOT`, `ADMIN`, `OPERATOR`, `VIEWER`), single-use recovery backup codes MFA (`UserBackupCode`), session eviction on role modifications, and non-root process execution (`USER tmsuser`, UID 1001).
- **Design System & Typography**: Triple-theme system (Dark Terminal, Classic Slate, Precision Light), 100% self-hosted WOFF2 fonts, and zero tracking.

## Phase Completion Summary
- **Core Architecture & Infrastructure:** 100% complete
- **Die Inventory & Machine Allocation Tracking:** 100% complete
- **Wire Drawing Workbench & Vector Print Reporting:** 100% complete
- **Security, Authentication & Auditing:** 100% complete
- **Platform Release v1.0.0:** 100% complete

## Next Actions
1. Maintain test coverage and zero-regression policy across all stacks.
2. Production deployment and monitoring.
