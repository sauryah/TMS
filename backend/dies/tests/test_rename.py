import io
import openpyxl
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from dies.models import Die, RoundDie, FlatDie, OutboxTask
from history.models import DieHistory
from dies.services.rename_service import RenameService

User = get_user_model()


class BulkDieRenameTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='adminuser',
            password='AdminPassword123!',
            role='ADMIN'
        )
        self.operator = User.objects.create_user(
            username='operatoruser',
            password='OperatorPassword123!',
            role='OPERATOR'
        )
        self.client.force_authenticate(user=self.admin)

        # Create sample dies
        self.die_round = Die.objects.create(
            die_id='TEST-DIE-ROUND-01',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            remarks='Original round die'
        )
        RoundDie.objects.create(
            die=self.die_round,
            punched_size=Decimal('1.013'),
            current_size=Decimal('1.013')
        )

        self.die_flat = Die.objects.create(
            die_id='TEST-DIE-FLAT-01',
            die_type='FLAT',
            casing='30x15',
            status='AVAILABLE',
            remarks='Original flat die'
        )
        FlatDie.objects.create(
            die=self.die_flat,
            punched_width=Decimal('12.500'),
            current_width=Decimal('12.500'),
            punched_thickness=Decimal('1.250'),
            current_thickness=Decimal('1.250'),
            radius=Decimal('0.500')
        )

    def _create_excel_file(self, rows, sheet_name="Die Renames"):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name
        for r in rows:
            ws.append(r)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf

    def _create_csv_file(self, content):
        buf = io.BytesIO(content.encode('utf-8'))
        buf.seek(0)
        return buf

    def test_rename_template_download(self):
        response = self.client.get('/api/v1/import/rename-template/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        wb = openpyxl.load_workbook(io.BytesIO(response.content))
        self.assertIn("Die Renames", wb.sheetnames)
        self.assertIn("Instructions", wb.sheetnames)

    def test_rename_dies_success(self):
        csv_data = "old_die_id,new_die_id\nTEST-DIE-ROUND-01,TEST-DIE-ROUND-RENAMED\nTEST-DIE-FLAT-01,TEST-DIE-FLAT-RENAMED\n"
        csv_file = self._create_csv_file(csv_data)
        csv_file.name = "rename.csv"

        response = self.client.post(
            '/api/v1/import/rename/',
            {'file': csv_file},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # In test mode, celery task ran eagerly. Verify DB state:
        self.assertFalse(Die.objects.filter(die_id='TEST-DIE-ROUND-01').exists())
        self.assertFalse(Die.objects.filter(die_id='TEST-DIE-FLAT-01').exists())

        die_r = Die.objects.get(die_id='TEST-DIE-ROUND-RENAMED')
        self.assertEqual(die_r.id, self.die_round.id)
        self.assertEqual(die_r.rounddie.punched_size, Decimal('1.013'))

        die_f = Die.objects.get(die_id='TEST-DIE-FLAT-RENAMED')
        self.assertEqual(die_f.id, self.die_flat.id)
        self.assertEqual(die_f.flatdie.punched_width, Decimal('12.500'))

        # Verify DieHistory audit logging and cryptographic hash chaining
        histories = list(DieHistory.objects.filter(die=die_r, field_name='die_id'))
        self.assertEqual(len(histories), 1)
        h = histories[0]
        self.assertEqual(h.old_value, 'TEST-DIE-ROUND-01')
        self.assertEqual(h.new_value, 'TEST-DIE-ROUND-RENAMED')
        self.assertEqual(h.changed_by, self.admin)
        self.assertTrue(h.verify_hash())

        # Verify Outbox task generated for Meilisearch sync
        self.assertTrue(OutboxTask.objects.filter(task_type='SYNC_DIE').exists())

    def test_rename_dies_dry_run_does_not_commit(self):
        csv_data = "old_die_id,new_die_id\nTEST-DIE-ROUND-01,TEST-DIE-ROUND-RENAMED\n"
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(csv_data.encode('utf-8'))
            temp_path = f.name

        try:
            result = RenameService.rename_dies(temp_path, '.csv', user=self.admin, dry_run=True)
            self.assertTrue(result['dry_run'])
            self.assertEqual(result['updated'], 1)
            self.assertEqual(len(result['errors']), 0)

            # Verify database was NOT changed
            self.assertTrue(Die.objects.filter(die_id='TEST-DIE-ROUND-01').exists())
            self.assertFalse(Die.objects.filter(die_id='TEST-DIE-ROUND-RENAMED').exists())
            self.assertEqual(DieHistory.objects.count(), 0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rename_cyclical_swap(self):
        """Tests that swapping DIE_A -> DIE_B and DIE_B -> DIE_A succeeds via 2-phase update."""
        die_a = Die.objects.create(die_id='DIE_ALPHA', die_type='ROUND', casing='25x10')
        RoundDie.objects.create(die=die_a, punched_size=Decimal('1.000'), current_size=Decimal('1.000'))

        die_b = Die.objects.create(die_id='DIE_BETA', die_type='ROUND', casing='25x10')
        RoundDie.objects.create(die=die_b, punched_size=Decimal('2.000'), current_size=Decimal('2.000'))

        csv_data = "old_die_id,new_die_id\nDIE_ALPHA,DIE_BETA\nDIE_BETA,DIE_ALPHA\n"
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(csv_data.encode('utf-8'))
            temp_path = f.name

        try:
            result = RenameService.rename_dies(temp_path, '.csv', user=self.admin)
            self.assertEqual(result['updated'], 2)
            self.assertEqual(len(result['errors']), 0)

            die_a.refresh_from_db()
            die_b.refresh_from_db()

            self.assertEqual(die_a.die_id, 'DIE_BETA')
            self.assertEqual(die_a.rounddie.punched_size, Decimal('1.000'))

            self.assertEqual(die_b.die_id, 'DIE_ALPHA')
            self.assertEqual(die_b.rounddie.punched_size, Decimal('2.000'))
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rename_target_collision_rejected(self):
        """Tests that attempting to rename to an existing die that is not being renamed is rejected."""
        Die.objects.create(die_id='DIE_EXISTING_OCCUPIED', die_type='ROUND', casing='25x10')

        csv_data = "old_die_id,new_die_id\nTEST-DIE-ROUND-01,DIE_EXISTING_OCCUPIED\n"
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(csv_data.encode('utf-8'))
            temp_path = f.name

        try:
            result = RenameService.rename_dies(temp_path, '.csv', user=self.admin)
            self.assertEqual(result['updated'], 0)
            self.assertEqual(len(result['errors']), 1)
            self.assertIn("already exists in inventory", result['errors'][0]['error'])

            # Die untouched
            self.assertTrue(Die.objects.filter(die_id='TEST-DIE-ROUND-01').exists())
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rename_nonexistent_die_rejected(self):
        csv_data = "old_die_id,new_die_id\nDOES_NOT_EXIST,NEW_DIE_NAME\n"
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(csv_data.encode('utf-8'))
            temp_path = f.name

        try:
            result = RenameService.rename_dies(temp_path, '.csv', user=self.admin)
            self.assertEqual(result['updated'], 0)
            self.assertEqual(len(result['errors']), 1)
            self.assertIn("does not exist in inventory", result['errors'][0]['error'])
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rename_duplicate_ids_in_sheet_rejected(self):
        csv_data = "old_die_id,new_die_id\nTEST-DIE-ROUND-01,TARGET_1\nTEST-DIE-ROUND-01,TARGET_2\n"
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(csv_data.encode('utf-8'))
            temp_path = f.name

        try:
            result = RenameService.rename_dies(temp_path, '.csv', user=self.admin)
            self.assertEqual(len(result['errors']), 1)
            self.assertIn("Duplicate old_die_id", result['errors'][0]['error'])
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rename_already_completed_dies_skipped_gracefully(self):
        """
        Tests Smart Idempotency: When dies in the spreadsheet were already renamed historically,
        they are safely recognized as ALREADY UP-TO-DATE (skipped) with zero errors,
        allowing remaining unrenamed dies in the batch to proceed.
        """
        # Set up die that was already renamed historically from LEGACY-SERIES-A01 to POSITION-A01
        die_already = Die.objects.create(die_id='POSITION-A01', die_type='ROUND', casing='25x10')
        RoundDie.objects.create(die=die_already, punched_size=Decimal('1.000'), current_size=Decimal('1.000'))
        DieHistory.objects.create(
            die=die_already,
            field_name='die_id',
            old_value='LEGACY-SERIES-A01',
            new_value='POSITION-A01',
            changed_by=self.admin
        )

        # Set up die that still needs to be renamed
        die_pending = Die.objects.create(die_id='LEGACY-SERIES-A19', die_type='ROUND', casing='25x10')
        RoundDie.objects.create(die=die_pending, punched_size=Decimal('1.500'), current_size=Decimal('1.500'))

        csv_data = "old_die_id,new_die_id\nLEGACY-SERIES-A01,POSITION-A01\nLEGACY-SERIES-A19,POSITION-A19\n"
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(csv_data.encode('utf-8'))
            temp_path = f.name

        try:
            # 1. Verify dry run recognizes already-completed dies
            dry_result = RenameService.rename_dies(temp_path, '.csv', user=self.admin, dry_run=True)
            self.assertEqual(len(dry_result['errors']), 0)
            self.assertEqual(dry_result['already_up_to_date'], 1)
            self.assertEqual(dry_result['updated'], 1)
            self.assertEqual(dry_result['preview'][0]['status'], 'ALREADY_COMPLETED')
            self.assertEqual(dry_result['preview'][1]['status'], 'READY')

            # 2. Verify commit executes rename on pending die while skipping already-done die
            exec_result = RenameService.rename_dies(temp_path, '.csv', user=self.admin, dry_run=False)
            self.assertEqual(len(exec_result['errors']), 0)
            self.assertEqual(exec_result['already_up_to_date'], 1)
            self.assertEqual(exec_result['updated'], 1)

            # Assert database state
            self.assertTrue(Die.objects.filter(die_id='POSITION-A01').exists())
            self.assertTrue(Die.objects.filter(die_id='POSITION-A19').exists())
            self.assertFalse(Die.objects.filter(die_id='LEGACY-SERIES-A19').exists())
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rename_permissions(self):
        self.client.force_authenticate(user=self.operator)
        csv_data = "old_die_id,new_die_id\nTEST-DIE-ROUND-01,TEST-DIE-ROUND-RENAMED\n"
        csv_file = self._create_csv_file(csv_data)
        csv_file.name = "rename.csv"

        response = self.client.post('/api/v1/import/rename/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.logout()
        csv_file.seek(0)
        response = self.client.post('/api/v1/import/rename/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
