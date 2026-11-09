from celery import shared_task
from django.core.management import call_command
from django.db import connection

@shared_task
def auto_prune_history():
    call_command('prune_history')
    # Summarize pending BRIN index ranges on high-volume audit tables
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT brin_summarize_new_values('die_hist_ts_brin_idx');")
            cursor.execute("SELECT brin_summarize_new_values('mach_hist_ts_brin_idx');")
    except Exception:
        # Non-fatal on SQLite / non-Postgres test runners
        pass
