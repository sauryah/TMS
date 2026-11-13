import hashlib
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from django.core.cache import cache

from users.models import User, UserSession
from dies.models import Die, RoundDie, FlatDie, Manufacturer
from machines.models import MachineCategory, Machine, Set


class AnalyticsSummaryTests(APITestCase):
    def setUp(self):
        cache.clear()
        # Create standard operator user
        self.user = User.objects.create_user(
            username='operator1',
            password='password123',
            email='op@tms.local',
            role='OPERATOR'
        )
        self.token = str(AccessToken.for_user(self.user))
        UserSession.objects.create(
            user=self.user,
            token_hash=hashlib.sha256(self.token.encode('utf-8')).hexdigest()
        )

        # Create machine structure & sets
        self.cat = MachineCategory.objects.create(name='Wire Drawing Category')
        self.machine = Machine.objects.create(category=self.cat, name='Machine Alpha')
        self.set1 = Set.objects.create(machine=self.machine, name='Set 01', order=1)
        self.set2 = Set.objects.create(machine=self.machine, name='Set 02', order=2)

        # Create manufacturers
        self.mfg_asahi = Manufacturer.objects.create(name='Asahi Diamond')
        self.mfg_sandvik = Manufacturer.objects.create(name='Sandvik Coromant')
        self.mfg_empty = Manufacturer.objects.create(name='Zero Dies Vendor')

        # Create Round Dies for Asahi (2 dies)
        d1 = Die.objects.create(die_id='D-RD-001', die_type='ROUND', casing='STEEL', status='AVAILABLE', manufacturer=self.mfg_asahi, current_set=self.set1)
        RoundDie.objects.create(die=d1, punched_size=Decimal('0.500'), current_size=Decimal('0.500'))

        d2 = Die.objects.create(die_id='D-RD-002', die_type='ROUND', casing='STEEL', status='RUNNING', manufacturer=self.mfg_asahi, current_set=self.set1)
        RoundDie.objects.create(die=d2, punched_size=Decimal('0.450'), current_size=Decimal('0.452'))

        # Create Flat Die for Asahi (1 die)
        d3 = Die.objects.create(die_id='D-FL-001', die_type='FLAT', casing='STEEL', status='AVAILABLE', manufacturer=self.mfg_asahi)
        FlatDie.objects.create(die=d3, punched_width=Decimal('2.000'), punched_thickness=Decimal('0.500'), current_width=Decimal('2.000'), current_thickness=Decimal('0.500'), radius=Decimal('0.050'))

        # Create Round Die for Sandvik (1 die)
        d4 = Die.objects.create(die_id='D-RD-003', die_type='ROUND', casing='CARBIDE', status='AVAILABLE', manufacturer=self.mfg_sandvik, current_set=self.set2)
        RoundDie.objects.create(die=d4, punched_size=Decimal('0.300'), current_size=Decimal('0.300'))

        # Create Unassigned Flat Die (1 die with no manufacturer, no set)
        d5 = Die.objects.create(die_id='D-FL-002', die_type='FLAT', casing='STEEL', status='AVAILABLE', manufacturer=None, current_set=None)
        FlatDie.objects.create(die=d5, punched_width=Decimal('3.000'), punched_thickness=Decimal('1.000'), current_width=Decimal('3.000'), current_thickness=Decimal('1.000'), radius=Decimal('0.100'))

    def test_analytics_summary_requires_authentication(self):
        self.client.credentials()
        res = self.client.get('/api/v1/analytics/summary/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_analytics_summary_calculation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get('/api/v1/analytics/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()

        # Total counts: 5 dies total (3 Round, 2 Flat)
        self.assertEqual(data['total_dies'], 5)
        self.assertEqual(data['round_dies'], 3)
        self.assertEqual(data['flat_dies'], 2)
        self.assertEqual(data['total_sets'], 2)
        self.assertEqual(data['total_manufacturers'], 3)

        # Sets summary: 3 dies in sets (d1, d2, d4), 2 dies in storage (d3, d5)
        sets_summary = data['sets_summary']
        self.assertEqual(sets_summary['total_sets'], 2)
        self.assertEqual(sets_summary['dies_in_sets'], 3)
        self.assertEqual(sets_summary['dies_in_storage'], 2)

        # Manufacturers breakdown
        mfgs = {m['name']: m for m in data['manufacturers']}
        self.assertIn('Asahi Diamond', mfgs)
        self.assertIn('Sandvik Coromant', mfgs)
        self.assertIn('Unassigned', mfgs)
        self.assertIn('Zero Dies Vendor', mfgs)

        # Asahi: 3 dies total (2 Round, 1 Flat) -> 60.0%
        asahi = mfgs['Asahi Diamond']
        self.assertEqual(asahi['total_dies'], 3)
        self.assertEqual(asahi['round_dies'], 2)
        self.assertEqual(asahi['flat_dies'], 1)
        self.assertEqual(asahi['percentage'], 60.0)

        # Sandvik: 1 die total (1 Round, 0 Flat) -> 20.0%
        sandvik = mfgs['Sandvik Coromant']
        self.assertEqual(sandvik['total_dies'], 1)
        self.assertEqual(sandvik['round_dies'], 1)
        self.assertEqual(sandvik['flat_dies'], 0)
        self.assertEqual(sandvik['percentage'], 20.0)

        # Unassigned: 1 die total (0 Round, 1 Flat) -> 20.0%
        unassigned = mfgs['Unassigned']
        self.assertIsNone(unassigned['id'])
        self.assertEqual(unassigned['total_dies'], 1)
        self.assertEqual(unassigned['round_dies'], 0)
        self.assertEqual(unassigned['flat_dies'], 1)
        self.assertEqual(unassigned['percentage'], 20.0)

        # Zero vendor: 0 dies -> 0.0%
        zero = mfgs['Zero Dies Vendor']
        self.assertEqual(zero['total_dies'], 0)
        self.assertEqual(zero['round_dies'], 0)
        self.assertEqual(zero['flat_dies'], 0)
        self.assertEqual(zero['percentage'], 0.0)

    def test_legacy_url_fallback(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get('/api/analytics/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['total_dies'], 5)

    def test_cache_invalidation_on_die_creation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res1 = self.client.get('/api/v1/analytics/summary/')
        self.assertEqual(res1.json()['total_dies'], 5)

        # Create a new die
        d_new = Die.objects.create(die_id='D-NEW-001', die_type='ROUND', casing='STEEL', status='AVAILABLE', manufacturer=self.mfg_sandvik)
        RoundDie.objects.create(die=d_new, punched_size=Decimal('0.100'), current_size=Decimal('0.100'))

        # Cache should be invalidated by signal, fetching updated count = 6
        res2 = self.client.get('/api/v1/analytics/summary/')
        self.assertEqual(res2.json()['total_dies'], 6)
        self.assertEqual(res2.json()['round_dies'], 4)
