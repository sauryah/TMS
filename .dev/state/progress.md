# Progress

## Purpose
Track implementation status across all phases.
**Why:** Enable visibility into project progress.
**Read by:** AI agents.
**Updated:** Each phase completion.

## Platform Implementation Status

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
