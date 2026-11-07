# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Full Removal of Warehouse Racks and Shelves Across Backend and Frontend
**Status:** Complete
**Started:** 2026-11-07
**Target Completion:** 2026-11-07
**Confidence:** 100%

## Task Description
Remove warehouse rack and shelf storage concepts entirely from the platform per user directive ("we dont need RACKS CAN WE REMOVE THEM"):
- Backend: Removed `Rack` model, `Die.rack` and `Die.shelf_number` fields, indexes, serializers, viewsets, admin, signals, sync_search mappings, import/export location logic, and operator permission sets. Generated migrations `dies.0019_remove_die_rack_shelf` and `machines.0003_delete_rack`.
- Frontend: Removed rack view mode, bulk rack relocation toolbar, create/edit modal rack/shelf dropdowns, detail page warehouse mapping card, and updated die cards and unit test fixtures.
- Safety: Preserved history audit records, hand-crafted migrations without touching running production database, preserved deprecated files as inert placeholders.

## Completed
- Handcrafted migrations `dies.0019_remove_die_rack_shelf` and `machines.0003_delete_rack`.
- Cleaned backend models, serializers, views, admin, signals, search tasks, and tests.
- Removed legacy `Rack` imports and fixtures from all backend test suites (`test_integration`, `test_models`, `test_query_count`, `test_search`, `test_services`, `test_signals`).
- Fixed `@patch` target in `users/tests/test_backups.py` to target `users.services.backup_service.rebuild_search_index_task.delay`.
- Added `'version'` to allowed fields for `OPERATOR` PATCH in `backend/users/permissions.py`, fixing `test_operator_rbac_boundaries`.
- Cleaned frontend types, validation schema, subviews, modals, cards, and unit tests (all 106 tests passing).
- Updated footer attribution across `Footer.tsx` and `AboutModal.tsx`, added interactive `ContactModal` with 1-click email copy, and separated static developer attribution from architecture system info.
- Verified TypeScript build (`tsc --noEmit`) passes with 0 errors.

## Next Steps
- User pushes commit to GitHub to trigger CI verification.
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
