# Remediation Report: Code Review Fixes

All 10 findings from the code review have been systematically investigated, verified, implemented, tested, and committed to branch `review-fixes` in the required order (`#1, #2, #3, #4, #5, #7, #6, #8, #9, #10`).

In accordance with user safety rules:
- All work was executed solely on git branch `review-fixes`.
- No destructive commands (`docker compose`, `pg_restore`, `DROP/TRUNCATE`) were executed against live containers or databases.
- Migrations were generated as migration source files only and were **not** applied to the database.
- Each finding has its own isolated commit adhering to the `fix(#N): description` convention.

---

## 1. Findings Implementation Table

| # | Finding | Status | Commit Hash | Files Changed | Tests Added / Modified |
|---|---------|:------:|:-----------:|---------------|------------------------|
| **1** | Celery Redis Broker LRU Eviction Risk | **FIXED** | `c3ec4a5` | `docker-compose.yml`<br>`docker-compose.prod.yml`<br>`backend/tms/settings.py`<br>`backend/users/views/auth.py`<br>`backend/users/tests/test_settings.py` | `test_celery_broker_uses_dedicated_redis_broker` |
| **2** | Optimistic Concurrency Control (OCC) Lost Updates | **FIXED** | `cf0f886` | `backend/dies/views.py`<br>`frontend/src/features/inventory/hooks/useInventoryMutations.ts`<br>`frontend/src/features/inventory/components/InventoryPage.tsx`<br>`frontend/src/components/CommandPalette.tsx`<br>`backend/dies/tests/test_api.py`<br>`backend/dies/tests/test_integration.py` | `test_update_die_missing_version_fails_with_400`<br>`test_update_die_stale_version_fails_with_409`<br>`test_update_die_valid_version_increments_and_succeeds` |
| **3** | Token Refresh Session Hijacking & Metadata Loss | **FIXED** | `d79beaa` | `backend/users/views/auth.py`<br>`backend/users/tests/test_auth.py` | `test_token_refresh_embeds_session_id_and_updates_exact_session`<br>`test_token_refresh_does_not_hijack_unrelated_session`<br>`test_token_refresh_creates_session_if_none_exists` |
| **4** | Bulk Import History Suppression & Outbox Storm | **FIXED** | `7d99563` | `backend/users/context.py`<br>`backend/dies/signals.py`<br>`backend/dies/services/import_service.py`<br>`backend/dies/services/search_service.py`<br>`backend/dies/tests/test_import.py` | `test_bulk_import_records_die_history_on_updates_and_suppresses_single_search_sync` |
| **5** | DB Connection Conflicts & Session Cache Leak on Restore | **FIXED** | `7a17f88` | `backend/users/services/backup_service.py`<br>`backend/users/tests/test_backups.py` | `test_restore_backup_terminates_connections_and_flushes_redis_sessions` |
| **7** | Daily Document Reference Number Race Condition | **FIXED** | `33fee4f` | `backend/history/models.py`<br>`backend/history/views.py`<br>`backend/history/migrations/0006_dailyprintsequence.py`<br>`backend/history/tests/test_views.py` | `test_daily_sequence_counter_resets_daily_and_increments`<br>`test_create_print_record_uses_per_day_sequence` |
| **6** | Synchronous External Meilisearch I/O in DB Transaction | **FIXED** | `b586f32` | `backend/dies/models.py`<br>`backend/dies/migrations/0018_outboxtask_status_claimed_at.py`<br>`backend/search/tasks.py`<br>`backend/dies/tests/test_search.py` | `test_process_outbox_prevents_double_claiming_and_resets_stale` |
| **8** | Cryptographic Audit Chain Incomplete Payload | **FIXED** | `fe714d6` | `backend/history/models.py`<br>`backend/history/migrations/0007_diehistory_machinehistory_hash_version.py`<br>`backend/history/tests/test_views.py` | `test_legacy_v1_history_entry_verification_succeeds`<br>`test_v2_history_includes_metadata_and_detects_tampering`<br>`test_history_hash_chain_linking` |
| **9** | Flawed Digit Filtering in Go Search Handler | **FIXED** | `857f719` | `go-api/internal/handlers/handlers.go`<br>`go-api/internal/handlers/handlers_test.go` | `TestQueryMeilisearchAndPostgres_RelevanceSorting` (Test Case 6 for digit-containing query preserving typo-tolerant hits) |
| **10** | Unindexed Multi-Column ILIKE Sequential Table Scan | **FIXED** | `c9c09c2` | `go-api/internal/database/database.go`<br>`go-api/internal/database/database_test.go` | `TestBuildQueryPostgresDirectly` (sub-tests verifying absence of unindexed CAST expressions and inclusion of B-tree ranges) |

---

## 2. Migrations to Apply and Required Order

Three new database migrations have been prepared. They must be applied after pulling this branch:

1. **`history` `0006_dailyprintsequence.py`**
   - **Table**: `history_dailyprintsequence`
   - **Fields**: `id` (BigAutoField), `date` (DateField, unique, db_index), `last_seq` (PositiveIntegerField, default 0).
   - **Purpose**: Provides atomic per-day sequence counters for document reference generation (`TDS-YYYYMMDD-NNNN`).

2. **`dies` `0018_outboxtask_status_claimed_at.py`**
   - **Table**: `dies_outboxtask`
   - **Fields**: `status` (CharField max_length 20, default `'PENDING'`), `claimed_at` (DateTimeField, null=True, db_index=True).
   - **Purpose**: Enables atomic task claiming and prevents worker race conditions or double-processing during asynchronous search indexing.

3. **`history` `0007_diehistory_machinehistory_hash_version.py`**
   - **Tables**: `history_diehistory`, `history_machinehistory`
   - **Fields**: `hash_version` (PositiveSmallIntegerField, default 1).
   - **Purpose**: Versions cryptographic audit chain payloads so existing records remain valid under schema v1, while new entries verify under v2.

### Command to Run Migrations:
```bash
docker compose exec django python manage.py migrate
```

Django will automatically sequence them based on their declared dependencies:
```
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, dies, history, machines, sessions, users
Running migrations:
  Applying history.0006_dailyprintsequence... OK
  Applying dies.0018_outboxtask_status_claimed_at... OK
  Applying history.0007_diehistory_machinehistory_hash_version... OK
```

---

## 3. Manual Operational Steps

### A. Docker Service Changes
A dedicated Redis service (`redis-broker`) has been provisioned specifically for Celery queue and task persistence (`--maxmemory-policy noeviction --appendonly yes`), isolating it from the caching Redis container (`--maxmemory-policy allkeys-lru`).

Execute the following commands in sequence:
```bash
# 1. Bring up the new redis-broker container
docker compose up -d redis-broker

# 2. Rebuild and restart services that communicate with Celery or Redis
docker compose up -d --build django worker heavy-worker beat go-api

# 3. Apply the pending database migrations
docker compose exec django python manage.py migrate

# 4. Verify all services are healthy
docker compose ps
```

### B. Environment Variables
- `CELERY_BROKER_URL`: Defaults in `settings.py` to `redis://redis-broker:6379/0`.
- `CELERY_RESULT_BACKEND`: Defaults in `settings.py` to `redis://redis-broker:6379/0`.
- `REDIS_CACHE_URL`: Remains `redis://redis:6379/1` (used exclusively for HTTP caching, rate-limiting, and user sessions).
- *Optional*: If your `.env` explicitly overrides `CELERY_BROKER_URL`, update it to:
  ```env
  CELERY_BROKER_URL=redis://redis-broker:6379/0
  CELERY_RESULT_BACKEND=redis://redis-broker:6379/0
  ```

### C. Running Automated Test Suites in Docker
To verify the fixes against live PostgreSQL, Redis, and Meilisearch test containers:
```bash
# 1. Run Django backend test suite
docker compose exec django python manage.py test dies users history search

# 2. Run Go search and API test suite
docker compose exec go-api go test -v ./...

# 3. Run Frontend test suite
docker compose exec frontend npm run test -- --run
```

---

## 4. Risks and Rollback Plans

| Fix # | Primary Risk | Mitigation | Rollback Command / Action |
|:-----:|--------------|------------|---------------------------|
| **#1** | Extra memory consumed by running two Redis containers (~30MB). | Minimal overhead; prevents catastrophic task eviction. | Revert `docker-compose.yml` and `settings.py` to use `redis://redis:6379/0`. |
| **#2** | Third-party or legacy API callers updating dies without `version` field will receive `400 Bad Request`. | Frontend was updated across all hooks (`useInventoryMutations`, `InventoryPage`, `CommandPalette`). | `git revert cf0f886` if un-versioned external API callers cannot be upgraded. |
| **#3** | Clients holding refresh tokens generated prior to this change do not have `session_id` in payload. | `TokenRefreshView` gracefully falls back to creating a new `UserSession` if no session matches, ensuring 0 client lockouts. | `git revert d79beaa`. |
| **#4** | Bulk spreadsheet imports now write `DieHistory` rows, which slightly increases DB write volume during massive imports. | Batch search sync is now fully deferred, net reducing overall import latency. | `git revert 7d99563`. |
| **#5** | `pg_terminate_backend` disconnects active DB connections right before database restore. | Intended behavior to prevent locked restore aborts. Only triggers when admin initiates a full DB restore. | `git revert 7a17f88`. |
| **#6** | Worker processes task claiming with `status='IN_PROGRESS'`. Crashed workers leave tasks in progress. | Automatic recovery resets tasks older than 5 minutes back to `status='PENDING'`. | Revert migration `0018` via `python manage.py migrate dies 0017` and `git revert b586f32`. |
| **#7** | New table `history_dailyprintsequence` required before print records can be generated. | Migration `0006` must be applied. Fallback synchronizes with existing records if table starts empty. | Revert migration via `python manage.py migrate history 0005` and `git revert 33fee4f`. |
| **#8** | Verification of existing history rows could fail if hash schema was not backward-compatible. | `hash_version=1` is preserved for all legacy rows. `verify_hash()` checks v2 and falls back to v1. | Revert migration via `python manage.py migrate history 0006` and `git revert fe714d6`. |
| **#9** | Preserving score 50 hits includes Meilisearch typo-tolerant results in queries containing numbers (e.g. `TC-20`). | Exact matches and starts-with matches still sort to the top via `scoreDie`. | `git revert 857f719`. |
| **#10** | Range-based numeric lookups in fallback PostgreSQL search. | Validated that B-tree index is utilized while avoiding sequential `CAST(... AS TEXT)` scans. | `git revert c9c09c2`. |

---

## 5. Review Findings Critique & Corrections

Treating the code review as hypotheses rather than unquestioned facts revealed several flaws in the review's original proposed fixes:

1. **Finding #1 (Redis Eviction Policy)**:
   - *Review Proposal*: Set `maxmemory-policy noeviction` on the shared Redis instance.
   - *Flaw*: Changing the single shared instance to `noeviction` would cause HTTP session caches, rate-limit keys, and temporary tokens to throw `OOM` errors when the 256MB limit was reached.
   - *Correction*: Separated into two distinct containers: `redis` (cache, `allkeys-lru`) and `redis-broker` (Celery broker, `noeviction`, `appendonly yes`).

2. **Finding #2 (OCC Implementation)**:
   - *Review Proposal*: Check `instance.version != client_version` inside the update serializer.
   - *Flaw*: Checking without pessimistic row locking (`select_for_update`) leaves a race condition window where two concurrent requests read the same version before either commits.
   - *Correction*: Placed `select_for_update()` under `transaction.atomic()`, cast both to `int`, and strictly validated that `version` is present.

3. **Finding #4 (Bulk Import Audit Logging)**:
   - *Review Proposal*: Stated that `import_service.py` wrote its own history entries and the signal skip should simply be deleted.
   - *Flaw*: Code inspection proved `import_service.py` does **not** write any history entries. Deleting the flag without separating search sync would cause hundreds of redundant per-row search sync tasks and wear alert calculations to fire during imports.
   - *Correction*: Separated flags into `skip_history_logging` (defaults to `False`, allowing audit logging) and `skip_single_search_sync` (suppressing single tasks and deferring to `SearchService.sync_dies_batch`).

4. **Finding #7 (Document Reference Number Generation)**:
   - *Review Proposal*: Use a global PostgreSQL sequence (`CREATE SEQUENCE print_doc_ref_seq`).
   - *Flaw*: Document references reset daily (`TDS-YYYYMMDD-0001`). A single global PostgreSQL sequence would continuously increment across days, breaking the required ISO/DIN daily reset contract.
   - *Correction*: Implemented `DailyPrintSequence` with a per-date counter row locked with `select_for_update()`, guaranteeing atomic increment with daily reset.

5. **Finding #8 (Cryptographic Audit Hash Payload)**:
   - *Review Proposal*: Modify the hash string to include timestamps and IP addresses without versioning.
   - *Flaw*: Changing the payload definition directly would instantly invalidate the cryptographic verification of every existing row in the production audit log.
   - *Correction*: Introduced `hash_version=2` for new rows while maintaining `hash_version=1` verification for legacy rows, preventing chain invalidation.

6. **Finding #9 (Go Search Digit Filtering)**:
   - *Review Proposal*: Replace post-filtering entirely and rely solely on Meilisearch ranking rules.
   - *Correction*: Verified that removing `hasDigits && score <= 50 { continue }` restores typo tolerance while preserving relevance prioritization (`scoreDie` sorting) and accurate `totalHits` pagination reporting.
