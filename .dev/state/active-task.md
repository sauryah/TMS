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
- Cleaned frontend types, validation schema, subviews, modals, cards, and unit tests (all 106 tests passing).
- Verified TypeScript build (`tsc --noEmit`) passes with 0 errors.

## Next Steps
- Provide user with instructions to run `docker compose exec web python manage.py migrate` at their convenience.
- Await user instructions. Never `git push` autonomously.

## Blockers
- None.
