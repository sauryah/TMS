# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Resolve CI Django Test Hang & OOM in Backup Restore Connection Termination
**Status:** Complete
**Started:** 2026-11-11
**Target Completion:** 2026-11-11
**Confidence:** 100%

## Task Description
Fix CI pipeline failure in `Backend Tests (Django)` job (failed after 4m 29s run):
- In `backend/users/tests/test_backups.py`, `test_restore_backup_terminates_connections_and_flushes_redis_sessions` patched `django.db.connection.cursor` at the function level.
- When `BackupService.restore_backup` executed ORM queries (`Session.objects.all().delete()`, `UserSession.objects.all().delete()`), Django's query compiler iterated on the mock cursor (`while rows = cursor.fetchmany()`). Since `bool(MagicMock())` evaluates to `True`, it entered an infinite loop allocating mock objects until process SIGKILL (OOM).
- Isolate connection termination into `BackupService.terminate_database_connections` and mock termination separately from ORM execution.

## Completed
- Extracted `BackupService.terminate_database_connections` in `backend/users/services/backup_service.py`.
- Updated `backend/users/tests/test_backups.py`:
  - Added isolated unit test `test_terminate_database_connections` mocking `connection.cursor` and `connection.close`.
  - Refactored `test_restore_backup_terminates_connections_and_flushes_redis_sessions` to patch `BackupService.terminate_database_connections` without polluting the Django ORM connection.
- Verified test suite: `users.tests.test_backups` executes 6/6 tests in 1.1s (was killed previously).
- Verified full Django test suite: all 223 tests pass cleanly in 66s (`Ran 223 tests: OK`).
- Verified Vitest frontend suite (111/111 passing) and Go API suite (100% passing).

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
