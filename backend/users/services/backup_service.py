import os
import logging
import subprocess
from typing import Dict, Any, Optional
from django.conf import settings
from users.models import UserSession
from search.tasks import rebuild_search_index_task
from django.utils import timezone

logger = logging.getLogger(__name__)

class BackupService:
    @staticmethod
    def get_backup_dir() -> str:
        return '/backups'

    @staticmethod
    def list_backups() -> list:
        backup_dir = BackupService.get_backup_dir()
        if not os.path.exists(backup_dir):
            return []

        backups = []
        for filename in os.listdir(backup_dir):
            if filename.endswith('.dump'):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)
                backups.append({
                    'filename': filename,
                    'size_kb': round(stat.st_size / 1024, 2),
                    'created_at': stat.st_mtime
                })

        return sorted(backups, key=lambda x: x['created_at'], reverse=True)

    @staticmethod
    def prune_old_backups(days=14) -> None:
        backup_dir = BackupService.get_backup_dir()
        if not os.path.exists(backup_dir):
            return

        seconds_in_days = days * 24 * 60 * 60
        from django.utils import timezone
        current_time = timezone.now().timestamp()

        for f in os.listdir(backup_dir):
            if f.endswith('.dump') or f.endswith('.dump.md5') or f.endswith('.md5'):
                fp = os.path.join(backup_dir, f)
                stat = os.stat(fp)
                if (current_time - stat.st_mtime) > seconds_in_days:
                    try:
                        os.remove(fp)
                    except OSError:
                        pass

    @staticmethod
    def create_backup() -> str:
        db_name = settings.DATABASES['default']['NAME']
        db_user = settings.DATABASES['default']['USER']
        db_password = settings.DATABASES['default']['PASSWORD']
        db_host = settings.DATABASES['default']['HOST']
        db_port = settings.DATABASES['default']['PORT']

        backup_dir = BackupService.get_backup_dir()
        os.makedirs(backup_dir, exist_ok=True)

        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"tms_backup_{timestamp}.dump"
        filepath = os.path.join(backup_dir, filename)

        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        cmd = [
            'pg_dump',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-F', 'c',
            '-f', filepath,
            db_name
        ]

        try:
            subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"pg_dump failed: {e.stderr or e}")

        # Verify backup file is non-empty and valid
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            raise Exception("Backup file is empty or was not created")
        try:
            verify_cmd = [
                'pg_restore',
                '-h', db_host,
                '-p', str(db_port),
                '-U', db_user,
                '-f', '/dev/null',
                '--data-only',
                '--list',
                filepath
            ]
            result = subprocess.run(verify_cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"Backup integrity check failed: {result.stderr}")
        except FileNotFoundError:
            pass

        # Generate MD5 checksum file
        try:
            import hashlib
            hasher = hashlib.md5()
            with open(filepath, 'rb') as f_in:
                buf = f_in.read()
                hasher.update(buf)
            checksum = hasher.hexdigest()
            with open(f"{filepath}.md5", 'w') as md5_f:
                md5_f.write(f"{checksum}  {filename}\n")
        except Exception as e:
            logger.warning("Backup checksum generation failed: %s", e)

        # Stream backup to S3/MinIO if enabled
        if getattr(settings, 'S3_BACKUPS_ENABLED', False):
            try:
                import boto3
                from botocore.config import Config
                import logging

                logger = logging.getLogger(__name__)
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.S3_BACKUPS_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_BACKUPS_SECRET_KEY,
                    endpoint_url=settings.S3_BACKUPS_ENDPOINT_URL or None,
                    region_name=settings.S3_BACKUPS_REGION or 'us-east-1',
                    config=Config(signature_version='s3v4')
                )
                bucket = settings.S3_BACKUPS_BUCKET
                s3_client.upload_file(filepath, bucket, filename)
                md5_filepath = f"{filepath}.md5"
                if os.path.exists(md5_filepath):
                    s3_client.upload_file(md5_filepath, bucket, f"{filename}.md5")
                logger.info(f"Successfully streamed backup {filename} and checksum to S3 bucket {bucket}")
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to stream backup to S3/MinIO: {e}")

        BackupService.prune_old_backups()
        return filename

    @staticmethod
    def restore_backup(filepath: str, filename: str, request_user, session_data: dict = None) -> None:
        db_name = settings.DATABASES['default']['NAME']
        db_user = settings.DATABASES['default']['USER']
        db_password = settings.DATABASES['default']['PASSWORD']
        db_host = settings.DATABASES['default']['HOST']
        db_port = settings.DATABASES['default']['PORT']

        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        # Determine optimal number of parallel jobs for restore
        jobs = max(1, (os.cpu_count() or 2) - 1)

        cmd = [
            'pg_restore',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-d', db_name,
            '-j', str(jobs),
            '--clean',
            '--no-owner',
            filepath
        ]

        # Capture the restorer's active session data before restoration
        current_session_data = None
        try:
            if session_data and session_data.get('token_hash'):
                token_hash = session_data['token_hash']
                user_id = session_data.get('user_id', request_user.id if request_user else None)
                if user_id:
                    current_session = UserSession.objects.get(user_id=user_id, token_hash=token_hash)
                    current_session_data = {
                        'user_id': current_session.user_id,
                        'username': request_user.username if request_user else '',
                        'role': request_user.role if request_user else '',
                        'token_hash': current_session.token_hash,
                        'ip_address': current_session.ip_address,
                        'device': current_session.device
                    }
        except Exception:
            pass

        # Terminate other active database connections before restore to prevent conflicts and lock blocks
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = %s AND pid <> pg_backend_pid();
                """, [db_name])
            connection.close()
        except Exception as e:
            logger.warning("Terminating connections before restore failed: %s", e)

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"pg_restore failed: {e.stderr or e}")

        # Apply database migrations to ensure restored database schema matches current codebase models
        try:
            from django.core.management import call_command
            call_command('migrate', noinput=True)
        except Exception as e:
            logger.error("Migration after restore failed: %s", e)
            raise

        # Evict all restored sessions to prevent unauthorized reuse of restored sessions
        try:
            from django.contrib.sessions.models import Session
            Session.objects.all().delete()
            UserSession.objects.all().delete()
        except Exception as e:
            logger.warning("Session eviction after restore failed: %s", e)

        # Invalidate all cached sessions and tokens in Redis to prevent stale cache reuse
        try:
            import redis
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            for pattern in ["user_session:*", "verify_token:*"]:
                keys_to_delete = []
                for key in r.scan_iter(pattern):
                    keys_to_delete.append(key)
                if keys_to_delete:
                    r.delete(*keys_to_delete)
        except Exception as e:
            logger.warning("Redis session cache invalidation after restore failed: %s", e)

        # Restore the restorer's session so they stay logged in
        if current_session_data:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                restored_user = User.objects.filter(
                    id=current_session_data['user_id'],
                    username=current_session_data['username'],
                    role=current_session_data['role']
                ).first()
                if restored_user:
                    restored_session = UserSession.objects.create(
                        user_id=restored_user.id,
                        token_hash=current_session_data['token_hash'],
                        ip_address=current_session_data['ip_address'],
                        device=current_session_data['device']
                    )
                    # Re-populate cache for the restorer's active session
                    try:
                        from django.core.cache import cache
                        new_cache_key = f"user_session:{restored_user.id}:{current_session_data['token_hash']}"
                        cache_data = {
                            'ip_address': restored_session.ip_address,
                            'device': restored_session.device,
                            'created_at': restored_session.created_at.isoformat(),
                            'last_seen': restored_session.last_seen.isoformat(),
                        }
                        cache.set(new_cache_key, cache_data, timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)
                    except Exception:
                        pass
            except Exception as e:
                logger.error("Restoring restorer session after restore failed: %s", e)

        # Offload the slow Meilisearch index synchronization to Celery
        rebuild_search_index_task.delay(filename)

    @staticmethod
    def delete_backup(filepath: str) -> None:
        if os.path.exists(filepath):
            os.remove(filepath)

    @staticmethod
    def validate_filepath(filename: str) -> str:
        backup_dir = BackupService.get_backup_dir()
        # Securely validate the filepath by using os.path.realpath and os.path.commonpath
        filepath = os.path.realpath(os.path.join(backup_dir, filename))
        real_backup_dir = os.path.realpath(backup_dir)

        if os.path.commonpath([filepath, real_backup_dir]) != real_backup_dir:
            raise ValueError('Invalid filepath')

        return filepath
