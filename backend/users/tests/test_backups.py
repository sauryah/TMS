import os
import hashlib
import subprocess
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from users.models import UserSession

User = get_user_model()

class BackupTests(APITestCase):
    def setUp(self):
        # Create a root user and a regular user
        self.root_user = User.objects.create_user(
            username='root_test',
            password='root_password_123',
            email='root@tms.local',
            role='ROOT'
        )
        self.regular_user = User.objects.create_user(
            username='regular_test',
            password='regular_password_123',
            email='regular@tms.local',
            role='REGULAR'
        )

        # Generate tokens
        self.root_token = str(AccessToken.for_user(self.root_user))
        self.regular_token = str(AccessToken.for_user(self.regular_user))

        # Create corresponding UserSessions so CustomJWTAuthentication validates them
        root_token_hash = hashlib.sha256(self.root_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.root_user,
            token_hash=root_token_hash,
            ip_address='127.0.0.1',
            device='test-device'
        )

        regular_token_hash = hashlib.sha256(self.regular_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.regular_user,
            token_hash=regular_token_hash,
            ip_address='127.0.0.1',
            device='test-device'
        )

        # URL for restore backup action
        self.restore_url = '/api/v1/backups/restore/'

    def test_restore_unauthenticated_fails(self):
        response = self.client.post(self.restore_url, {'filename': 'backup.dump'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_restore_non_root_fails(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.post(self.restore_url, {'filename': 'backup.dump'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('os.path.exists')
    @patch('users.tasks.restore_backup_task.delay')
    def test_restore_success(self, mock_delay, mock_exists):
        # Mock file checks
        mock_exists.return_value = True

        mock_task = MagicMock()
        mock_task.id = 'test-task-uuid'
        mock_delay.return_value = mock_task

        # Perform the request as root
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        response = self.client.post(self.restore_url, {'filename': 'backup.dump'})

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data, {'status': 'pending', 'task_id': 'test-task-uuid'})

        # Verify the Celery task was scheduled asynchronously
        mock_delay.assert_called_once()

    @patch('subprocess.run')
    @patch('os.path.getsize')
    @patch('os.path.exists')
    @patch('users.services.backup_service.BackupService.list_backups')
    def test_verify_backup_restorability_task_success(self, mock_list, mock_exists, mock_getsize, mock_run):
        from users.tasks import verify_backup_restorability_task

        mock_list.return_value = [{'filename': 'tms_backup_test.dump', 'size_kb': 1024, 'created_at': 1700000000}]
        mock_exists.return_value = True
        mock_getsize.return_value = 1048576
        mock_run.return_value = MagicMock(returncode=0)

        result = verify_backup_restorability_task()
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['filename'], 'tms_backup_test.dump')

    @patch('subprocess.run')
    @patch('django.core.management.call_command')
    @patch('users.services.backup_service.rebuild_search_index_task.delay')
    @patch('redis.Redis.from_url')
    @patch('django.db.connection.cursor')
    def test_restore_backup_terminates_connections_and_flushes_redis_sessions(
        self, mock_cursor, mock_redis_from_url, mock_rebuild_task, mock_migrate, mock_run
    ):
        from users.services.backup_service import BackupService

        # Setup mock cursor to record SQL statements
        cursor_instance = MagicMock()
        mock_cursor.return_value.__enter__.return_value = cursor_instance

        # Setup mock redis to record scanned and deleted keys
        redis_mock = MagicMock()
        mock_redis_from_url.return_value = redis_mock
        redis_mock.scan_iter.side_effect = lambda pattern: [
            f"user_session:1:hash123",
            f"user_session:2:hash456"
        ] if "user_session" in pattern else [
            f"verify_token:tok123"
        ]

        mock_run.return_value = MagicMock(returncode=0)

        session_payload = {
            'user_id': self.root_user.id,
            'token_hash': hashlib.sha256(self.root_token.encode('utf-8')).hexdigest()
        }

        BackupService.restore_backup(
            filepath='/tmp/test.dump',
            filename='test.dump',
            request_user=self.root_user,
            session_data=session_payload
        )

        # 1. Verify connection termination SQL was called
        cursor_instance.execute.assert_called()
        call_sql = cursor_instance.execute.call_args[0][0]
        self.assertIn("pg_terminate_backend", call_sql)

        # 2. Verify pg_restore subprocess was called
        mock_run.assert_called_once()
        cmd_called = mock_run.call_args[0][0]
        self.assertEqual(cmd_called[0], 'pg_restore')
        self.assertIn('--clean', cmd_called)

        # 3. Verify Redis keys for sessions and tokens were scanned and deleted
        self.assertTrue(redis_mock.delete.called)
        deleted_keys = []
        for call in redis_mock.delete.call_args_list:
            deleted_keys.extend(call[0])
        self.assertIn("user_session:1:hash123", deleted_keys)
        self.assertIn("verify_token:tok123", deleted_keys)

        # 4. Verify search index rebuild task was enqueued
        mock_rebuild_task.assert_called_once_with('test.dump')

