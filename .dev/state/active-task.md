# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Resolve CI Test Runner Environment Contamination in Settings Startup Validation
**Status:** Complete
**Started:** 2026-11-11
**Target Completion:** 2026-11-11
**Confidence:** 100%

## Task Description
Isolate `test_celery_broker_uses_dedicated_redis_broker` in `backend/users/tests/test_settings.py` from CI runner environment variables:
- In GitHub Actions CI, `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` are set to `redis://localhost:6379/1`.
- When `test_celery_broker_uses_dedicated_redis_broker` reloads `tms.settings` to verify default architectural separation (`redis-broker`), the CI environment variable overrode the default, causing an assertion failure (`AssertionError: 'redis-broker' not found in 'redis://localhost:6379/1'`).
- Pop test-runner overrides from `os.environ` prior to reloading `settings` so default architecture is verified cleanly across local Docker and CI runners.

## Completed
- Isolated `test_celery_broker_uses_dedicated_redis_broker` in [`backend/users/tests/test_settings.py`](file:///D:/TMS/backend/users/tests/test_settings.py).
- Verified full Django test suite passes: 232/232 tests passing cleanly in 69.8s.
- Verified test passes when `CELERY_BROKER_URL` is set in the runner environment.

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
