import csv
import logging
import openpyxl
import uuid
import redis
from typing import List, Tuple, Dict, Any, Optional
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from dies.models import Die, ImportLog
from history.models import DieHistory
from users.context import _thread_locals
from dies.services.import_service import ImportService
from dies.services.validation_service import ValidationService
from dies.services.search_service import SearchService
from dies.contracts import DIE_UPDATE_EVENT
from tms.events import broadcast_event

logger = logging.getLogger(__name__)

OLD_ID_ALIASES = {
    'old_die_id', 'old_id', 'current_die_id', 'from_die_id',
    'from_id', 'original_die_id', 'source_die_id', 'old', 'from', 'source'
}
NEW_ID_ALIASES = {
    'new_die_id', 'new_id', 'target_die_id', 'to_die_id',
    'to_id', 'destination_die_id', 'new', 'to', 'target'
}


class RenameService:
    @staticmethod
    def _extract_column_keys(headers: List[str]) -> Tuple[Optional[str], Optional[str]]:
        """Identifies the old_die_id and new_die_id column names from headers."""
        old_col = None
        new_col = None
        for h in headers:
            norm = str(h).strip().lower()
            if not old_col and norm in OLD_ID_ALIASES:
                old_col = norm
            elif not new_col and norm in NEW_ID_ALIASES:
                new_col = norm

        # Fallback for 2-column spreadsheets with arbitrary or non-standard headers
        if (not old_col or not new_col) and len(headers) == 2:
            return headers[0].strip().lower(), headers[1].strip().lower()

        return old_col, new_col

    @staticmethod
    def rename_dies(
        file_path: str,
        file_ext: str,
        user=None,
        dry_run: bool = False,
        progress_callback=None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a spreadsheet to atomically rename Die.die_id identifiers.
        Supports 2-phase collision-free renaming, cryptographic audit logging in DieHistory,
        and Meilisearch outbox batch synchronization.
        """
        _thread_locals.user = user
        _thread_locals.skip_single_search_sync = True
        _thread_locals.skip_history_logging = True

        try:
            try:
                rows = ImportService._parse_file(file_path, file_ext)
            except Exception as e:
                logger.exception("Failed to parse uploaded spreadsheet for die renaming")
                return {
                    'created': 0,
                    'updated': 0,
                    'skipped': 0,
                    'errors': [{'row': 0, 'die_id': 'N/A', 'field': 'file', 'error': f"Failed to parse file: {str(e)}"}],
                    'dry_run': dry_run,
                    'preview': []
                }

            if not rows:
                return {
                    'created': 0,
                    'updated': 0,
                    'skipped': 0,
                    'errors': [{'row': 0, 'die_id': 'N/A', 'field': 'file', 'error': "Uploaded file contains no data rows."}],
                    'dry_run': dry_run,
                    'preview': []
                }

            # Detect columns from first row
            sample_keys = list(rows[0][1].keys())
            old_col, new_col = RenameService._extract_column_keys(sample_keys)

            if not old_col or not new_col:
                return {
                    'created': 0,
                    'updated': 0,
                    'skipped': len(rows),
                    'errors': [{
                        'row': 1,
                        'die_id': 'N/A',
                        'field': 'headers',
                        'error': f"Could not identify rename columns. Found headers: {sample_keys}. Expected 'old_die_id' and 'new_die_id'."
                    }],
                    'dry_run': dry_run,
                    'preview': []
                }

            errors = []
            parsed_pairs = []
            seen_old_ids = {}
            seen_new_ids = {}

            total_rows = len(rows)

            # Phase 1: Row syntax and uniqueness validation
            for line_num, row_data in rows:
                raw_old = row_data.get(old_col)
                raw_new = row_data.get(new_col)

                if raw_old is None or str(raw_old).strip() == '':
                    errors.append({
                        'row': line_num,
                        'die_id': 'N/A',
                        'field': 'old_die_id',
                        'error': "Missing 'old_die_id'"
                    })
                    continue

                if raw_new is None or str(raw_new).strip() == '':
                    errors.append({
                        'row': line_num,
                        'die_id': str(raw_old).strip(),
                        'field': 'new_die_id',
                        'error': "Missing 'new_die_id'"
                    })
                    continue

                try:
                    old_id = ValidationService.validate_die_id(raw_old)
                except ValueError as ve:
                    errors.append({
                        'row': line_num,
                        'die_id': str(raw_old).strip(),
                        'field': 'old_die_id',
                        'error': f"Invalid old_die_id format: {str(ve)}"
                    })
                    continue

                try:
                    new_id = ValidationService.validate_die_id(raw_new)
                except ValueError as ve:
                    errors.append({
                        'row': line_num,
                        'die_id': old_id,
                        'field': 'new_die_id',
                        'error': f"Invalid new_die_id format: {str(ve)}"
                    })
                    continue

                if len(new_id) > 50:
                    errors.append({
                        'row': line_num,
                        'die_id': old_id,
                        'field': 'new_die_id',
                        'error': f"Target Die ID '{new_id}' exceeds maximum allowed length of 50 characters."
                    })
                    continue

                if old_id == new_id:
                    errors.append({
                        'row': line_num,
                        'die_id': old_id,
                        'field': 'new_die_id',
                        'error': f"Source and target Die IDs are identical ('{old_id}'). No rename necessary."
                    })
                    continue

                if old_id in seen_old_ids:
                    errors.append({
                        'row': line_num,
                        'die_id': old_id,
                        'field': 'old_die_id',
                        'error': f"Duplicate old_die_id '{old_id}' (already mapped in row {seen_old_ids[old_id]})."
                    })
                    continue
                seen_old_ids[old_id] = line_num

                if new_id in seen_new_ids:
                    errors.append({
                        'row': line_num,
                        'die_id': old_id,
                        'field': 'new_die_id',
                        'error': f"Duplicate new_die_id '{new_id}' (row {seen_new_ids[new_id]} also maps to this ID)."
                    })
                    continue
                seen_new_ids[new_id] = line_num

                parsed_pairs.append({
                    'row': line_num,
                    'old_id': old_id,
                    'new_id': new_id
                })

            # Phase 2: Database existence, collision, and smart idempotency verification
            all_old_ids = [p['old_id'] for p in parsed_pairs]
            all_new_ids = [p['new_id'] for p in parsed_pairs]

            # Pre-fetch existing dies by exact match
            existing_old = {d.die_id: d for d in Die.objects.filter(die_id__in=all_old_ids)}
            # Case-insensitive resolution fallback for dies not found via exact match
            missing_old_ids = [oid for oid in all_old_ids if oid not in existing_old]
            if missing_old_ids:
                for d in Die.objects.filter(die_id__in=missing_old_ids):
                    existing_old[d.die_id] = d

            # Pre-fetch target collision candidates
            existing_new = {d.die_id: d for d in Die.objects.filter(die_id__in=all_new_ids)}

            # Smart Idempotency: Detect dies that were ALREADY renamed from old_id to new_id
            potential_already_renamed = [
                existing_new[p['new_id']].id
                for p in parsed_pairs
                if p['old_id'] not in existing_old and p['new_id'] in existing_new
            ]
            already_renamed_set = set()
            if potential_already_renamed:
                history_qs = DieHistory.objects.filter(
                    die_id__in=potential_already_renamed,
                    field_name='die_id'
                ).values_list('die_id', 'old_value', 'new_value')
                # Store (die_id, old_value_lower, new_value_lower)
                for did, old_val, new_val in history_qs:
                    if old_val and new_val:
                        already_renamed_set.add((did, str(old_val).strip().lower(), str(new_val).strip().lower()))

            already_up_to_date_rows = set()
            for p in parsed_pairs:
                is_missing_old = p['old_id'] not in existing_old
                is_existing_new = p['new_id'] in existing_new

                # Check if this row was already renamed historically (idempotent skip)
                if is_missing_old and is_existing_new:
                    target_die = existing_new[p['new_id']]
                    key = (target_die.id, p['old_id'].strip().lower(), p['new_id'].strip().lower())
                    if key in already_renamed_set:
                        already_up_to_date_rows.add(p['row'])
                        continue

                # If missing old die
                if is_missing_old:
                    matched = Die.objects.filter(die_id__iexact=p['old_id']).first()
                    if matched:
                        existing_old[p['old_id']] = matched
                    else:
                        errors.append({
                            'row': p['row'],
                            'die_id': p['old_id'],
                            'field': 'old_die_id',
                            'error': f"Die with ID '{p['old_id']}' does not exist in inventory."
                        })

                # If target ID collides with an existing die
                if is_existing_new:
                    colliding_die = existing_new[p['new_id']]
                    # If the colliding die is not part of this batch's old_ids being renamed, it's a conflict
                    if colliding_die.die_id not in seen_old_ids:
                        errors.append({
                            'row': p['row'],
                            'die_id': p['old_id'],
                            'field': 'new_die_id',
                            'error': f"Target Die ID '{p['new_id']}' already exists in inventory (assigned to die #{colliding_die.id})."
                        })

            preview_list = []
            for p in parsed_pairs:
                if p['row'] in already_up_to_date_rows:
                    preview_list.append({
                        'row': p['row'],
                        'old_die_id': p['old_id'],
                        'new_die_id': p['new_id'],
                        'status': 'ALREADY_COMPLETED'
                    })
                else:
                    has_row_err = any(e['row'] == p['row'] for e in errors)
                    preview_list.append({
                        'row': p['row'],
                        'old_die_id': p['old_id'],
                        'new_die_id': p['new_id'],
                        'status': 'ERROR' if has_row_err else 'READY'
                    })

            active_pairs = [p for p in parsed_pairs if p['row'] not in already_up_to_date_rows]

            # If dry run or errors exist, return validation summary without committing
            if dry_run or len(errors) > 0:
                return {
                    'created': 0,
                    'updated': len(active_pairs) if len(errors) == 0 else 0,
                    'skipped': len(errors) + len(already_up_to_date_rows),
                    'already_up_to_date': len(already_up_to_date_rows),
                    'errors': sorted(errors, key=lambda x: x['row']),
                    'dry_run': dry_run,
                    'preview': preview_list,
                    'renamed': len(active_pairs) if len(errors) == 0 else 0
                }

            # If all rows were already up to date, finish cleanly
            if not active_pairs:
                return {
                    'created': 0,
                    'updated': 0,
                    'skipped': len(already_up_to_date_rows),
                    'already_up_to_date': len(already_up_to_date_rows),
                    'errors': [],
                    'dry_run': False,
                    'preview': preview_list,
                    'renamed': 0
                }

            # Phase 3: Atomic execution (2-phase swap to prevent unique constraint collisions)
            items_to_rename = [
                {
                    'die': existing_old[p['old_id']],
                    'old_id': existing_old[p['old_id']].die_id,
                    'new_id': p['new_id'],
                    'row': p['row']
                }
                for p in active_pairs
            ]

            with transaction.atomic():
                # Step 3A: Assign temporary unique identifiers to break cycles/swaps
                for idx, item in enumerate(items_to_rename):
                    die = item['die']
                    temp_token = f"__TMP_RN_{die.id}_{uuid.uuid4().hex[:8]}__"
                    Die.objects.filter(id=die.id).update(die_id=temp_token)
                    if progress_callback:
                        progress_callback(int((idx + 1) * 0.3), total_rows)

                # Step 3B: Assign final target Die IDs
                now = timezone.now()
                for idx, item in enumerate(items_to_rename):
                    die = item['die']
                    new_id = item['new_id']
                    Die.objects.filter(id=die.id).update(die_id=new_id, updated_at=now)
                    die.die_id = new_id
                    if progress_callback:
                        progress_callback(int(len(items_to_rename) * 0.3 + (idx + 1) * 0.4), total_rows)

                # Step 3C: Cryptographic audit logging in DieHistory
                for idx, item in enumerate(items_to_rename):
                    die = item['die']
                    DieHistory.objects.create(
                        die=die,
                        changed_by=user,
                        field_name='die_id',
                        old_value=item['old_id'],
                        new_value=item['new_id'],
                        ip_address=ip_address,
                        note="Bulk die ID rename"
                    )
                    if progress_callback:
                        progress_callback(int(len(items_to_rename) * 0.7 + (idx + 1) * 0.3), total_rows)

                # Step 3D: Outbox search indexing and Redis cache invalidation
                die_ids = [item['die'].id for item in items_to_rename]
                SearchService.sync_dies_batch(die_ids)
                broadcast_event(DIE_UPDATE_EVENT, {'action': 'bulk_import', 'count': len(items_to_rename)})

                try:
                    redis_url = settings.CACHES['default']['LOCATION']
                    r = redis.Redis.from_url(redis_url)
                    r.incr('search_cache_gen')
                except Exception as re_err:
                    logger.warning(f"Could not increment search_cache_gen in Redis: {re_err}")

            return {
                'created': 0,
                'updated': len(items_to_rename),
                'skipped': len(already_up_to_date_rows),
                'already_up_to_date': len(already_up_to_date_rows),
                'errors': [],
                'dry_run': False,
                'preview': preview_list,
                'renamed': len(items_to_rename)
            }

        finally:
            _thread_locals.user = None
            _thread_locals.skip_single_search_sync = False
            _thread_locals.skip_history_logging = False
