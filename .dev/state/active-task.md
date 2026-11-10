# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Die ID Search Matching Hardening (Strict Prefix Matching)
**Status:** Complete
**Started:** 2026-11-10
**Target Completion:** 2026-11-10
**Confidence:** 100%

## Task Description
Enforce strict prefix matching on Die IDs across the Go API search engine and PostgreSQL fallback query builder:
- When searching for a die number (e.g., `88001`), prevent arbitrary internal substring matches (such as `PREFIX-88001`) from matching the Die ID.
- Die IDs match only as exact (`dieID == q`, score 90) or prefix (`d.die_id ILIKE 'query%'`, score 80).
- Substring matching remains enabled for metadata attributes (`casing`, `status`, `set_name`, `machine_name`, score 70).

## Completed
- Updated `buildWhereClauses` in `go-api/internal/database/database.go` to use parameterized prefix matching (`d.die_id ILIKE $1` with `query%`) for Die IDs while keeping wildcard matching for metadata text fields.
- Updated `scoreDie` in `go-api/internal/handlers/handlers.go` to restrict Die ID matches to exact (90) and prefix (80), removing arbitrary substring matches on Die ID.
- Added test cases in `go-api/internal/handlers/handlers_test.go` and `go-api/internal/database/database_test.go`.
- Verified all Go test suites pass (100% passing).
- Verified Django backend and Vitest frontend test suites pass (111/111 Vitest, 93/93 Django).
- Rebuilt and restarted `tms-go-api:latest` container and verified live search query with prefix matching.

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
