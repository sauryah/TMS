# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Session Lifecycle, Network Resiliency & Ledger Maintenance (LLM Council Implementation)
**Status:** Complete
**Started:** 2026-11-10
**Target Completion:** 2026-11-10
**Confidence:** 100%

## Task Description
Implement the synthesized plan from the LLM Council deliberation:
- **Milestone 1:** Celery Beat scheduled task for `expire_sessions` every 15m; BRIN index range summarization in `backend/history/tasks.py`; dynamic timeout configuration exposed via `ServerInfoView` and login payload.
- **Milestone 2:** SSE industrial network resilience in `useRealtimeSync.ts` (indefinite exponential backoff capped at 30s with jitter, query invalidation on reconnect).
- **Milestone 3:** Client-side cross-tab activity sync (`BroadcastChannel` + `storage`), dynamic frontend idle/absolute limits, 10-minute absolute warning banner, and in-place Lock Screen modal preserving form drafts with password unlock.

## Completed
- Registered `expire_sessions_task` in `backend/users/tasks.py` and scheduled `auto-expire-sessions-periodic` in `backend/tms/settings.py` (`CELERY_BEAT_SCHEDULE`).
- Added `SELECT brin_summarize_new_values` for `die_hist_ts_brin_idx` and `mach_hist_ts_brin_idx` in `backend/history/tasks.py`.
- Updated `ServerInfoView` (`AllowAny`) and `issue_user_login_tokens` in `backend/users/views/auth.py` to return session timeout configurations.
- Added backend unit tests in `backend/users/tests/test_auth.py` (all 48 tests passing).
- Removed 5-attempt disconnect limit in `frontend/src/hooks/useRealtimeSync.ts`, implementing continuous backoff and post-reconnection query invalidation.
- Enhanced `frontend/src/components/SessionTimeoutManager.tsx` with dynamic config, cross-tab synchronization, 10-minute shift warning, and in-place Lock Screen re-authentication.
- Updated and expanded frontend unit tests in `SessionTimeoutManager.test.tsx` (108/108 passing; clean Vite build).
- Rebuilt and verified all 11 Docker Compose service containers running healthy.
- Updated `changelog-dev.md`, `active-task.md`, and `progress.md`.

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
