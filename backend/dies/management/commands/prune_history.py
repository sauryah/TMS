from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from history.models import DieHistory, MachineHistory

class Command(BaseCommand):
    help = 'Prune old DieHistory and MachineHistory records in chunked batches'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print the count of records that would be deleted, without actually deleting them',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=5000,
            help='Number of records to delete per transaction chunk (default: 5000 to prevent long table locks)',
        )

    def _prune_in_chunks(self, model_class, cutoff_date, batch_size=5000):
        total_deleted = 0
        while True:
            batch_pks = list(
                model_class.objects.filter(timestamp__lt=cutoff_date)
                .values_list('pk', flat=True)[:batch_size]
            )
            if not batch_pks:
                break
            deleted_count, _ = model_class.objects.filter(pk__in=batch_pks).delete()
            total_deleted += deleted_count
        return total_deleted

    def handle(self, *args, **options):
        retention_days = settings.HISTORY_RETENTION_DAYS
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        batch_size = options.get('batch_size') or 5000
        
        # Query records older than cutoff_date
        die_records = DieHistory.objects.filter(timestamp__lt=cutoff_date)
        machine_records = MachineHistory.objects.filter(timestamp__lt=cutoff_date)
        die_count = die_records.count()
        machine_count = machine_records.count()
        total_count = die_count + machine_count
        
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f"[DRY-RUN] Would prune {total_count} records older than {retention_days} days "
                f"(DieHistory: {die_count}, MachineHistory: {machine_count}). cutoff: {cutoff_date}."
            ))
        else:
            die_deleted = self._prune_in_chunks(DieHistory, cutoff_date, batch_size=batch_size)
            machine_deleted = self._prune_in_chunks(MachineHistory, cutoff_date, batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(
                f"Pruned {die_deleted + machine_deleted} records older than {retention_days} days "
                f"(DieHistory: {die_deleted}, MachineHistory: {machine_deleted})."
            ))
