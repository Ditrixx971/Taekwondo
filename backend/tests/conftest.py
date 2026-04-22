"""
Configuration centralisée pour les tests.
Les credentials sont définis ici pour éviter les répétitions
et faciliter les changements.
"""
import os
import pytest

# Credentials de test - utilisent des variables d'environnement avec des fallbacks
TEST_EMAIL = os.environ.get("TEST_EMAIL", "admin2@test.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "admin123")

# Alias pour la compatibilité avec les anciens tests
ADMIN_EMAIL = TEST_EMAIL
ADMIN_PASSWORD = TEST_PASSWORD
MASTER_EMAIL = TEST_EMAIL
MASTER_PASSWORD = TEST_PASSWORD

# URL de l'API
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8001/api")

@pytest.fixture
def test_credentials():
    """Fixture pour fournir les credentials de test."""
    return {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }

@pytest.fixture
def api_url():
    """Fixture pour fournir l'URL de l'API."""
    return API_BASE_URL
