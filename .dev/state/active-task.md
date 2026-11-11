# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Implement Dedicated Bulk Die Rename Tool (2-column mapping: old_die_id -> new_die_id)
**Status:** Complete
**Started:** 2026-11-11
**Target Completion:** 2026-11-11
**Confidence:** 100%

## Task Description
Implement a production-grade, collision-safe Bulk Die Rename tool:
- Backend:
  - Create `RenameService` (`backend/dies/services/rename_service.py`) handling CSV/XLSX parsing, format validation, 2-phase collision-free renaming, cryptographic audit logging in `DieHistory`, batch outbox Meilisearch syncing, and dry-run preview.
  - Add API endpoints in `backend/dies/views.py`:
    - `POST /api/v1/import/rename/` (with dry-run support)
    - `GET /api/v1/import/rename-template/` (Excel template download)
  - Add Celery background task `rename_dies_task` in `backend/dies/tasks.py`.
  - Add route mappings in `backend/tms/urls.py`.
- Frontend:
  - Add mode toggle in `frontend/src/pages/ImportPage.tsx` supporting "01 Master Catalog Ingestion" and "02 Bulk ID Rename".
  - Wire template download, file upload, dry-run modal, and error reporting for renames.
  - Comply with triple-theme tokens (Terminal, Classic Slate, Precision Light).
- Testing & Verification:
  - Unit and integration tests in `backend/dies/tests/test_rename.py` (8/8 pass).
  - Full suite verification: Django (231/231 passing in 65.9s), Vitest frontend (111/111 passing in 24.5s), Go API (100% passing), Vite build (15.58s, 0 errors).

## Completed
- Completed LLM Council deliberation artifact (`llm-council-bulk-die-rename.md`).
- Implemented `RenameService` in `backend/dies/services/rename_service.py`.
- Implemented `RenameDiesView` and `RenameTemplateView` in `backend/dies/views.py`.
- Implemented `rename_dies_task` in `backend/dies/tasks.py`.
- Added URL endpoints in `backend/tms/urls.py`.
- Integrated mode switcher, rename template download, and dry-run preview in `frontend/src/pages/ImportPage.tsx`.
- Added unit tests in `backend/dies/tests/test_rename.py`.
- Verified all test suites (Django, Go, Vitest) and Vite production build pass cleanly.

## Next Steps
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
