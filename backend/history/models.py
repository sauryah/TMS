from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.postgres.indexes import BrinIndex

class DieHistory(models.Model):
    die        = models.ForeignKey('dies.Die', on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, db_index=True)
    timestamp  = models.DateTimeField(default=timezone.now)
    field_name = models.CharField(max_length=50)
    old_value  = models.TextField()
    new_value  = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    note       = models.TextField(blank=True)
    prev_hash  = models.CharField(max_length=64, blank=True, null=True)
    hash       = models.CharField(max_length=64, blank=True, null=True)
    hash_version = models.PositiveSmallIntegerField(default=2)

    class Meta:
        ordering = ['-timestamp']
        indexes  = [
            # High-performance seek for parent hash during cryptographic save lock
            models.Index(fields=['die', '-id'], name='die_hist_chain_idx'),
            # Primary lookup for die-specific history timeline
            models.Index(fields=['die', '-timestamp'], name='die_hist_lookup_idx'),
            # Ultra-compact block range index for time-window audit reporting (1M+ rows)
            BrinIndex(fields=['timestamp'], name='die_hist_ts_brin_idx', pages_per_range=128),
            models.Index(fields=['die', 'field_name', 'timestamp'], name='history_die_die_id_64fa37_idx'),
        ]

    def compute_hash(self, prev_hash=None, version=None):
        import hashlib
        p_hash = prev_hash if prev_hash is not None else (self.prev_hash or "0" * 64)
        ver = version if version is not None else getattr(self, 'hash_version', 2)
        if ver == 1:
            payload = f"{p_hash}:{self.die_id}:{self.changed_by_id or ''}:{self.field_name}:{self.old_value}:{self.new_value}"
        else:
            ts_str = self.timestamp.isoformat() if self.timestamp else ''
            payload = f"v2:{p_hash}:{self.die_id}:{self.changed_by_id or ''}:{self.field_name}:{self.old_value}:{self.new_value}:{ts_str}:{self.ip_address or ''}:{self.note or ''}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()

    def verify_hash(self):
        if not self.hash:
            return False
        ver = getattr(self, 'hash_version', 2)
        if self.hash == self.compute_hash(version=ver):
            return True
        if ver != 1 and self.hash == self.compute_hash(version=1):
            return True
        return False

    def save(self, *args, **kwargs):
        if not self.hash:
            from django.utils import timezone
            from django.db import connection, transaction

            if not self.timestamp:
                self.timestamp = timezone.now()

            if connection.in_atomic_block:
                last_record = DieHistory.objects.select_for_update().filter(die=self.die).order_by('-id').first()
            else:
                with transaction.atomic():
                    last_record = DieHistory.objects.select_for_update().filter(die=self.die).order_by('-id').first()

            p_hash = last_record.hash if (last_record and last_record.hash) else "0" * 64
            self.prev_hash = p_hash
            self.hash_version = 2
            self.hash = self.compute_hash(prev_hash=p_hash, version=2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"History: {self.die.die_id} - {self.field_name}"


class MachineHistory(models.Model):
    ENTITY_CHOICES = [
        ('MACHINE', 'Machine'),
        ('SET', 'Set'),
        ('CATEGORY', 'Category'),
        ('RACK', 'Rack'),
    ]
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('UPDATED', 'Updated'),
        ('DELETED', 'Deleted'),
    ]

    entity_type = models.CharField(max_length=10, choices=ENTITY_CHOICES)
    entity_id   = models.IntegerField()
    entity_name = models.CharField(max_length=100)
    action      = models.CharField(max_length=10, choices=ACTION_CHOICES)
    field_name  = models.CharField(max_length=50, null=True, blank=True)
    old_value   = models.TextField(null=True, blank=True)
    new_value   = models.TextField(null=True, blank=True)
    changed_by  = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, db_index=True)
    timestamp   = models.DateTimeField(default=timezone.now)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    prev_hash   = models.CharField(max_length=64, blank=True, null=True)
    hash        = models.CharField(max_length=64, blank=True, null=True)
    hash_version = models.PositiveSmallIntegerField(default=2)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            # High-performance seek for parent hash during cryptographic save lock
            models.Index(fields=['entity_type', 'entity_id', '-id'], name='mach_hist_chain_idx'),
            # Primary lookup for entity-specific history timeline
            models.Index(fields=['entity_type', 'entity_id', '-timestamp'], name='mach_hist_lookup_idx'),
            # Ultra-compact block range index for time-window audit reporting (1M+ rows)
            BrinIndex(fields=['timestamp'], name='mach_hist_ts_brin_idx', pages_per_range=128),
        ]

    def compute_hash(self, prev_hash=None, version=None):
        import hashlib
        p_hash = prev_hash if prev_hash is not None else (self.prev_hash or "0" * 64)
        ver = version if version is not None else getattr(self, 'hash_version', 2)
        if ver == 1:
            payload = f"{p_hash}:{self.entity_type}:{self.entity_id}:{self.action}:{self.field_name or ''}:{self.old_value or ''}:{self.new_value or ''}:{self.changed_by_id or ''}"
        else:
            ts_str = self.timestamp.isoformat() if self.timestamp else ''
            payload = f"v2:{p_hash}:{self.entity_type}:{self.entity_id}:{self.action}:{self.field_name or ''}:{self.old_value or ''}:{self.new_value or ''}:{self.changed_by_id or ''}:{ts_str}:{self.ip_address or ''}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()

    def verify_hash(self):
        if not self.hash:
            return False
        ver = getattr(self, 'hash_version', 2)
        if self.hash == self.compute_hash(version=ver):
            return True
        if ver != 1 and self.hash == self.compute_hash(version=1):
            return True
        return False

    def save(self, *args, **kwargs):
        if not self.hash:
            from django.utils import timezone
            from django.db import connection, transaction

            if not self.timestamp:
                self.timestamp = timezone.now()

            if connection.in_atomic_block:
                last_record = MachineHistory.objects.select_for_update().filter(
                    entity_type=self.entity_type, entity_id=self.entity_id
                ).order_by('-id').first()
            else:
                with transaction.atomic():
                    last_record = MachineHistory.objects.select_for_update().filter(
                        entity_type=self.entity_type, entity_id=self.entity_id
                    ).order_by('-id').first()

            p_hash = last_record.hash if (last_record and last_record.hash) else "0" * 64
            self.prev_hash = p_hash
            self.hash_version = 2
            self.hash = self.compute_hash(prev_hash=p_hash, version=2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"MachineHistory: {self.entity_type} {self.entity_name} - {self.action}"


class PrintRecord(models.Model):
    doc_type = models.CharField(max_length=50, default='WIRE_DRAWING_TDS', db_index=True)
    doc_ref = models.CharField(max_length=64, unique=True, db_index=True)
    work_order = models.CharField(max_length=100, db_index=True)
    machine_name = models.CharField(max_length=100, blank=True)
    material_profile = models.CharField(max_length=100, blank=True, default='Standard Wire Drawing')
    quality_status = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    inlet_size = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True)
    finish_size = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True)
    total_passes = models.PositiveSmallIntegerField(default=0)
    overall_reduction = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_elongation = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dies = models.JSONField(default=list, blank=True)
    passes_data = models.JSONField(default=list, blank=True)
    printed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='print_records')
    username = models.CharField(max_length=150)
    user_role = models.CharField(max_length=50)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['doc_type', 'created_at']),
            models.Index(fields=['work_order', 'created_at']),
        ]

    def __str__(self):
        return f"PrintRecord: {self.doc_ref} ({self.work_order}) by {self.username}"


class DailyPrintSequence(models.Model):
    date = models.DateField(unique=True, db_index=True)
    last_seq = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['date'], name='history_dai_date_69bc50_idx'),
        ]

    def __str__(self):
        return f"DailyPrintSequence {self.date}: {self.last_seq}"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

@receiver(post_save, sender=DieHistory)
@receiver(post_delete, sender=DieHistory)
def clear_dashboard_history_cache(sender, instance, **kwargs):
    try:
        cache.incr("dashboard_history_version")
    except Exception:
        cache.set("dashboard_history_version", 1)
    cache.delete("dashboard_history_status_cache")
    cache.delete("dashboard_history_recent_cache")
