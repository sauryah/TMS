from django.urls import reverse
from rest_framework.test import APITestCase
from dies.models import Die, RoundDie, FlatDie
from django.db import connection
from decimal import Decimal
from users.models import User, UserSession
from rest_framework_simplejwt.tokens import AccessToken
import hashlib

class QueryCountTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='query_user', password='password123', email='query@tms.local', role='ADMIN'
        )
        token = str(AccessToken.for_user(self.user))
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        UserSession.objects.create(user=self.user, token_hash=token_hash)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        for i in range(25):
            die = Die.objects.create(
                die_id=f"R-{i}",
                die_type="ROUND",
                casing="25x10",
                status="AVAILABLE",
            )
            RoundDie.objects.create(
                die=die,
                punched_size=Decimal("2.400"),
                current_size=Decimal("2.400")
            )
        for i in range(25):
            die = Die.objects.create(
                die_id=f"F-{i}",
                die_type="FLAT",
                casing="30x15",
                status="AVAILABLE",
            )
            FlatDie.objects.create(
                die=die,
                punched_width=Decimal("5.500"),
                current_width=Decimal("5.500"),
                punched_thickness=Decimal("15.000"),
                current_thickness=Decimal("15.000"),
                radius=Decimal("1.000")
            )

    def test_list_dies_query_count(self):
        url = reverse('die-list')

        connection.queries_log.clear()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 50)

        query_count = len(connection.queries)
        print(f"Query count: {query_count}")
        self.assertTrue(query_count <= 5, f"Django executed {query_count} queries, which is > 5!")
