"""
Tests for location validation in dies module.
"""
from django.test import TestCase
from dies.services.validation_service import ValidationService


class TestLocationValidation(TestCase):
    """Test location validation logic (deprecated, returns None)."""

    def test_validate_location_both_none(self):
        """Test validation when both rack and shelf_number are None."""
        rack, shelf = ValidationService.validate_location(None, None)
        self.assertIsNone(rack)
        self.assertIsNone(shelf)
