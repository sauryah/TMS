# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Prevention Architecture & CI Parity Rules Documentation
**Status:** Complete
**Started:** 2026-11-05
**Target Completion:** 2026-11-05
**Confidence:** 100%

## Task Description
Document permanent architectural and workflow rules in `AGENTS.md`, `engineering-workflow.md`, and `review-process.md` to prevent future dependency mismatches and CI environment parity drift.

## Completed
- Added `Dependency & CI Parity Rules` to `AGENTS.md` requiring explicit driver extras, `pip check` validation, and CI infrastructure parity.
- Updated `engineering-workflow.md` Phases 3 (Review) and 5 (Verify) to enforce transitive dependency checks and infrastructure trinity (PostgreSQL, Redis, Meilisearch) verification.
- Updated `review-process.md` Gates 1 and 2 with `pip check` and CI service parity checklist items.
- Configured `celery[redis]==5.6.3` in `backend/requirements.txt` to statically lock driver compatibility at installation time.

## Next Steps
- Push changes to remote repository.

## Blockers
- None.
