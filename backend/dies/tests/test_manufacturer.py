import hashlib
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from users.models import User, UserSession
from dies.models import Die, RoundDie, Manufacturer
from dies.services.import_service import ImportService
from history.models import DieHistory


class ManufacturerTests(APITestCase):
    def setUp(self):
        # Create root user
        self.root_user = User.objects.create_superuser(
            username='rootadmin',
            password='password123',
            email='root@tms.local',
            role='ROOT'
        )
        self.root_token = str(AccessToken.for_user(self.root_user))
        UserSession.objects.create(
            user=self.root_user,
            token_hash=hashlib.sha256(self.root_token.encode('utf-8')).hexdigest()
        )

        # Create operator user (read-only for manufacturers)
        self.op_user = User.objects.create_user(
            username='operator1',
            password='password123',
            email='op@tms.local',
            role='OPERATOR'
        )
        self.op_token = str(AccessToken.for_user(self.op_user))
        UserSession.objects.create(
            user=self.op_user,
            token_hash=hashlib.sha256(self.op_token.encode('utf-8')).hexdigest()
        )

    def test_manufacturer_crud_and_rbac(self):
        # Unauthenticated request fails
        self.client.credentials()
        res = self.client.get('/api/v1/manufacturers/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Operator can list
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.op_token}')
        res = self.client.get('/api/v1/manufacturers/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Operator cannot create
        res = self.client.post('/api/v1/manufacturers/', {'name': 'Apex Dies'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin/Root can create
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        res = self.client.post('/api/v1/manufacturers/', {
            'name': 'Apex Dies Ltd',
            'contact_person': 'John Doe',
            'email': 'john@apexdies.com',
            'phone': '555-0199',
            'notes': 'Preferred vendor'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        m_id = res.data['id']
        self.assertEqual(res.data['name'], 'Apex Dies Ltd')

        # Admin can update
        res = self.client.patch(f'/api/v1/manufacturers/{m_id}/', {'notes': 'Updated notes'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['notes'], 'Updated notes')

    def test_die_manufacturer_relation_and_history(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        vendor = Manufacturer.objects.create(name='Precision Tooling')

        # Create die with manufacturer
        res = self.client.post('/api/v1/dies/', {
            'die_id': 'R-MANUF-1',
            'die_type': 'ROUND',
            'casing': '25x10',
            'status': 'AVAILABLE',
            'manufacturer': vendor.id,
            'punched_size': '3.500',
            'current_size': '3.500',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['manufacturer'], vendor.id)
        self.assertEqual(res.data['manufacturer_name'], 'Precision Tooling')

        die = Die.objects.get(die_id='R-MANUF-1')
        self.assertEqual(die.manufacturer, vendor)

        # Update manufacturer
        vendor2 = Manufacturer.objects.create(name='Apex Tooling')
        res = self.client.patch(f'/api/v1/dies/{die.die_id}/', {
            'manufacturer': vendor2.id,
            'version': die.version
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['manufacturer_name'], 'Apex Tooling')

        # Verify DieHistory has recorded human-readable manufacturer name
        history_entry = DieHistory.objects.filter(die=die, field_name='manufacturer').order_by('-id').first()
        self.assertIsNotNone(history_entry)
        self.assertEqual(history_entry.old_value, 'Precision Tooling')
        self.assertEqual(history_entry.new_value, 'Apex Tooling')

    def test_manufacturer_set_null_on_delete(self):
        vendor = Manufacturer.objects.create(name='Disposable Vendor')
        die = Die.objects.create(
            die_id='R-MANUF-DEL',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            manufacturer=vendor
        )
        RoundDie.objects.create(die=die, punched_size=Decimal('2.000'), current_size=Decimal('2.000'))

        # Delete the manufacturer
        vendor.delete()

        # Die still exists, manufacturer is now None
        die.refresh_from_db()
        self.assertIsNone(die.manufacturer)

    def test_bulk_import_with_manufacturer(self):
        sets_by_id = {}
        sets_by_name = {}
        manufacturers_by_name = {}

        row_1 = {
            'die_id': 'R-IMP-1',
            'die_type': 'ROUND',
            'casing': '25x10',
            'status': 'AVAILABLE',
            'manufacturer': 'New Vendor Co',
            'punched_size': 2.5,
            'current_size': 2.5
        }

        die_id, is_created = ImportService._process_row(
            row_1, sets_by_id, sets_by_name, manufacturers_by_name=manufacturers_by_name
        )
        self.assertTrue(is_created)
        die = Die.objects.get(id=die_id)
        self.assertIsNotNone(die.manufacturer)
        self.assertEqual(die.manufacturer.name, 'New Vendor Co')

        # Second row with same manufacturer (different case)
        row_2 = {
            'die_id': 'R-IMP-2',
            'die_type': 'ROUND',
            'casing': '25x10',
            'status': 'AVAILABLE',
            'manufacturer': 'new vendor co',
            'punched_size': 2.6,
            'current_size': 2.6
        }

        die_id_2, is_created_2 = ImportService._process_row(
            row_2, sets_by_id, sets_by_name, manufacturers_by_name=manufacturers_by_name
        )
        self.assertTrue(is_created_2)
        die_2 = Die.objects.get(id=die_id_2)
        self.assertEqual(die_2.manufacturer, die.manufacturer)
        self.assertEqual(Manufacturer.objects.count(), 1)
