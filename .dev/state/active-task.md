# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** PostgreSQL Audit History Optimization (BRIN Indexing & Chunked Pruning)
**Status:** Complete
**Started:** 2026-11-10
**Target Completion:** 2026-11-10
**Confidence:** 100%

## Task Description
Implement LLM Council Proposal C for scaling PostgreSQL die audit history past 1,000,000 records:
- Add `BrinIndex` on `timestamp` for `DieHistory` and `MachineHistory` with `pages_per_range=128`.
- Add composite B-tree indexes on `(die, -id)` and `(die, -timestamp)` for $O(1)$ cryptographic chain parent seek and timeline rendering.
- Generate and apply migration `0009_optimize_history_brin_and_composite_indexes`.
- Fix timestamp auto_now_add overwrite bug ensuring 100% cryptographic SHA-256 hash verification.
- Implement chunked batch pruning in `prune_history.py` (default 5000 per transaction) and add regression unit tests.

## Completed
- Added `'django.contrib.postgres'` to `INSTALLED_APPS` in `settings.py`.
- Replaced bloated B-trees with `BrinIndex` and added composite indexes in `history/models.py`.
- Generated and executed migration `history.0009_optimize_history_brin_and_composite_indexes`.
- Fixed timestamp `default=timezone.now` in `DieHistory` and `MachineHistory`.
- Hardened `prune_history.py` with chunked batch deletion and added test in `test_prune_history.py`.
- Verified all history and dies tests pass against PostgreSQL 18 container.
- Updated `changelog-dev.md` and `active-task.md`.

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
