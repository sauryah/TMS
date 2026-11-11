# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Implement Server-Enforced Session Lock & Cookie Revocation (LLM Council Synthesis)
**Status:** Complete
**Started:** 2026-11-12
**Target Completion:** 2026-11-12
**Confidence:** 100%

## Task Description
Implement server-side session lock enforcement to close the security window where HTTP-only `tms_access_token` cookies remain active on the server while the frontend is locked:
1. Backend Service:
   - Implemented `SessionService.lock_session(user, token_hash)`, `unlock_session(user, token_hash)`, and `is_session_locked(user_id, token_hash)`.
   - Added `SESSION_LOCKED` and `SESSION_UNLOCKED` actions to `UserActivityLog.ACTION_CHOICES` and applied migration `0007_alter_useractivitylog_action.py`.
2. Authentication Guard:
   - Updated `CustomJWTAuthentication` in `backend/users/authentication.py` to check `SessionService.check_locked()`. Rejects requests made while locked with 401 (`code: "session_locked"`) while permitting `/auth/lock` and `/auth/logout`.
3. API Endpoint:
   - Created `LockView` (`POST /api/v1/auth/lock/` and legacy `/api/auth/lock/`) with `X-Requested-With` CSRF check.
   - Deletes Redis `verify_token:{token_hash}` to immediately block Go API read cache.
   - Deletes `tms_access_token` and `tms_refresh_token` cookies in the response.
   - Records `UserActivityLog(action='SESSION_LOCKED')`.
4. Frontend Integration:
   - Dispatches `POST /api/v1/auth/lock/` in `SessionTimeoutManager.tsx` upon idle timeout or manual lock.
   - Updated `logout()` in `AuthContext.tsx` to notify `/api/v1/auth/logout/` with cookies even when `token` in state is null.
   - Allowlisted `/auth/lock` and `/auth/logout` in `useApi.ts`.
5. Verification:
   - Added 5 integration tests in `users.tests.test_auth.SessionLockTests` and 1 frontend test in `SessionTimeoutManager.test.tsx`.
   - Verified 100% pass across all 237 Django tests (237/237), all 8 Go API packages, and all 29 Vitest frontend suites (111/111).

## Completed
- Completed 3-Stage LLM Council Deliberation and synthesized Proposal C.
- Backend implementation in `session_service.py`, `authentication.py`, `auth.py`, `models.py`, `urls.py`, and migration `0007_alter_useractivitylog_action.py`.
- Frontend implementation in `SessionTimeoutManager.tsx`, `AuthContext.tsx`, and `useApi.ts`.
- Full test suites passed across all stacks with zero errors or regressions.
- Documentation synchronized across `.dev/modules/`, `.dev/architecture/`, `.dev/state/`, and `.dev/audits/`.

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
