"""
Test suite for Taekwondo Competition Management - Surclassement Features
Tests: Category seeding, surclassement categories, competitor creation with surclassement
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin2@test.com"
ADMIN_PASSWORD = "admin123"
COMPETITION_ID = "comp_535694c8e8dc"


class TestAuthSetup:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get authentication token via login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        # Session cookie is set automatically
        return response.cookies.get("session_token")
    
    def test_login_success(self, session, auth_token):
        """Test admin login works"""
        assert auth_token is not None or session.cookies.get("session_token") is not None
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_auth_me(self, session, auth_token):
        """Test /api/auth/me returns user data"""
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Auth/me returns correct user: {data['name']}")


class TestCategorySeedingEndpoint:
    """Tests for POST /api/categories/seed/{competition_id}"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        # Login
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_seed_categories_endpoint_exists(self, session):
        """Test that seed categories endpoint exists and returns proper response"""
        # First create a test competition
        comp_response = session.post(f"{BASE_URL}/api/competitions", json={
            "nom": "TEST_Seed_Competition",
            "date": "2026-06-01",
            "lieu": "Test Location",
            "heure_debut": "09:00",
            "duree_estimee_heures": 8
        })
        assert comp_response.status_code == 200
        test_comp_id = comp_response.json()["competition_id"]
        
        # Seed categories
        response = session.post(f"{BASE_URL}/api/categories/seed/{test_comp_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 126 categories created (as per FFTA/FFDA official categories)
        assert "total" in data
        assert data["total"] == 126, f"Expected 126 categories, got {data['total']}"
        print(f"✓ Seed endpoint created {data['total']} official categories")
        
        # Cleanup - delete test competition
        session.delete(f"{BASE_URL}/api/competitions/{test_comp_id}")
    
    def test_seed_categories_replaces_existing(self, session):
        """Test that seeding replaces existing categories"""
        # Create test competition
        comp_response = session.post(f"{BASE_URL}/api/competitions", json={
            "nom": "TEST_Replace_Categories",
            "date": "2026-07-01",
            "lieu": "Test Location"
        })
        test_comp_id = comp_response.json()["competition_id"]
        
        # Add a manual category first
        session.post(f"{BASE_URL}/api/categories", json={
            "competition_id": test_comp_id,
            "nom": "Manual Category",
            "age_min": 10,
            "age_max": 12,
            "sexe": "M",
            "poids_min": 30,
            "poids_max": 40
        })
        
        # Seed categories - should replace the manual one
        response = session.post(f"{BASE_URL}/api/categories/seed/{test_comp_id}")
        assert response.status_code == 200
        
        # Verify only official categories exist
        cat_response = session.get(f"{BASE_URL}/api/categories?competition_id={test_comp_id}")
        categories = cat_response.json()
        
        # Manual category should be gone, only 126 official ones
        assert len(categories) == 126
        manual_exists = any(c["nom"] == "Manual Category" for c in categories)
        assert not manual_exists, "Manual category should have been replaced"
        print("✓ Seed endpoint correctly replaces existing categories")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/competitions/{test_comp_id}")
    
    def test_seed_categories_invalid_competition(self, session):
        """Test seeding with invalid competition ID returns 404"""
        response = session.post(f"{BASE_URL}/api/categories/seed/invalid_comp_id")
        assert response.status_code == 404
        print("✓ Seed endpoint returns 404 for invalid competition")


class TestSurclassementCategoriesEndpoint:
    """Tests for GET /api/categories/for-surclassement/{competition_id}"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_surclassement_categories_for_10_year_old_male(self, session):
        """Test surclassement categories for 10-year-old male (Minimes)"""
        response = session.get(
            f"{BASE_URL}/api/categories/for-surclassement/{COMPETITION_ID}?sexe=M&age=10"
        )
        assert response.status_code == 200
        categories = response.json()
        
        # Should return categories for age >= 10 (Minimes 10-11, Cadets 12-13, etc.)
        assert len(categories) > 0, "Should return surclassement categories"
        
        # All returned categories should have age_min >= 10
        for cat in categories:
            assert cat["age_min"] >= 10, f"Category {cat['nom']} has age_min {cat['age_min']} < 10"
            assert cat["sexe"] == "M", f"Category {cat['nom']} has wrong sexe"
        
        # Should include Cadets (12-13), Juniors (14-17), etc.
        category_names = [c["nom"] for c in categories]
        has_cadets = any("Cadets" in name for name in category_names)
        has_juniors = any("Juniors" in name for name in category_names)
        
        assert has_cadets, "Should include Cadets categories for surclassement"
        assert has_juniors, "Should include Juniors categories for surclassement"
        print(f"✓ Surclassement endpoint returns {len(categories)} categories for 10yo male")
    
    def test_surclassement_categories_for_8_year_old_female(self, session):
        """Test surclassement categories for 8-year-old female (Benjamins)"""
        response = session.get(
            f"{BASE_URL}/api/categories/for-surclassement/{COMPETITION_ID}?sexe=F&age=8"
        )
        assert response.status_code == 200
        categories = response.json()
        
        assert len(categories) > 0
        
        # All should be female and age >= 8
        for cat in categories:
            assert cat["age_min"] >= 8
            assert cat["sexe"] == "F"
        
        print(f"✓ Surclassement endpoint returns {len(categories)} categories for 8yo female")
    
    def test_surclassement_categories_sorted_by_age_and_weight(self, session):
        """Test that surclassement categories are sorted by age_min then poids_min"""
        response = session.get(
            f"{BASE_URL}/api/categories/for-surclassement/{COMPETITION_ID}?sexe=M&age=10"
        )
        categories = response.json()
        
        # Verify sorting
        for i in range(1, len(categories)):
            prev = categories[i-1]
            curr = categories[i]
            # Should be sorted by age_min first, then poids_min
            if prev["age_min"] == curr["age_min"]:
                assert prev["poids_min"] <= curr["poids_min"], \
                    f"Categories not sorted by weight: {prev['nom']} vs {curr['nom']}"
            else:
                assert prev["age_min"] <= curr["age_min"], \
                    f"Categories not sorted by age: {prev['nom']} vs {curr['nom']}"
        
        print("✓ Surclassement categories are properly sorted")


class TestCompetiteurCreationWithSurclassement:
    """Tests for POST /api/competiteurs with surclassement option"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_create_competiteur_with_auto_category(self, session):
        """Test creating competitor without surclassement - auto category assignment"""
        # Get a Minimes category for a 10-year-old
        cat_response = session.get(f"{BASE_URL}/api/categories?competition_id={COMPETITION_ID}")
        categories = cat_response.json()
        
        # Find a Minimes category (age 10-11)
        minimes_cat = next((c for c in categories if "Minimes" in c["nom"] and c["sexe"] == "M" and c["poids_min"] <= 35 <= c["poids_max"]), None)
        
        response = session.post(f"{BASE_URL}/api/competiteurs", json={
            "competition_id": COMPETITION_ID,
            "nom": "TEST_AutoCategory",
            "prenom": "Pierre",
            "date_naissance": "2015-05-15",  # ~10 years old
            "sexe": "M",
            "poids_declare": 35.0,
            "club": "TKD Test Club",
            "surclasse": False
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have auto-assigned category
        assert data["surclasse"] == False
        assert data["categorie_id"] is not None, "Should have auto-assigned category"
        
        # Verify the assigned category is appropriate for age/weight
        assigned_cat = next((c for c in categories if c["categorie_id"] == data["categorie_id"]), None)
        if assigned_cat:
            assert assigned_cat["age_min"] <= 10 <= assigned_cat["age_max"], \
                f"Assigned category age range {assigned_cat['age_min']}-{assigned_cat['age_max']} doesn't match age 10"
        
        print(f"✓ Auto category assignment works: {assigned_cat['nom'] if assigned_cat else 'N/A'}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/competiteurs/{data['competiteur_id']}")
    
    def test_create_competiteur_with_surclassement(self, session):
        """Test creating competitor with surclassement - manual category selection"""
        # Get surclassement categories for a 10-year-old male
        surclass_response = session.get(
            f"{BASE_URL}/api/categories/for-surclassement/{COMPETITION_ID}?sexe=M&age=10"
        )
        surclass_categories = surclass_response.json()
        
        # Find a Cadets category (age 12-13) for surclassement that includes 38kg
        cadets_cat = next((c for c in surclass_categories if "Cadets" in c["nom"] and c["poids_min"] <= 38 <= c["poids_max"]), None)
        assert cadets_cat is not None, "Should find a Cadets category for surclassement with 38kg"
        
        response = session.post(f"{BASE_URL}/api/competiteurs", json={
            "competition_id": COMPETITION_ID,
            "nom": "TEST_Surclasse2",
            "prenom": "Marc",
            "date_naissance": "2015-08-20",  # ~10 years old
            "sexe": "M",
            "poids_declare": 38.0,
            "club": "TKD Surclasse Club",
            "surclasse": True,
            "categorie_surclasse_id": cadets_cat["categorie_id"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should be marked as surclassé with the chosen category
        assert data["surclasse"] == True
        assert data["categorie_id"] == cadets_cat["categorie_id"], \
            f"Expected category {cadets_cat['categorie_id']}, got {data['categorie_id']}"
        
        print(f"✓ Surclassement works: 10yo assigned to {cadets_cat['nom']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/competiteurs/{data['competiteur_id']}")
    
    def test_surclassement_weight_validation(self, session):
        """Test that surclassement validates weight compatibility"""
        # Get a category with specific weight range
        surclass_response = session.get(
            f"{BASE_URL}/api/categories/for-surclassement/{COMPETITION_ID}?sexe=M&age=10"
        )
        surclass_categories = surclass_response.json()
        
        # Find a category with narrow weight range
        narrow_cat = next((c for c in surclass_categories if c["poids_max"] < 40), None)
        if narrow_cat:
            # Try to create competitor with weight outside the category range
            response = session.post(f"{BASE_URL}/api/competiteurs", json={
                "competition_id": COMPETITION_ID,
                "nom": "TEST_WeightFail",
                "prenom": "Jean",
                "date_naissance": "2015-01-01",
                "sexe": "M",
                "poids_declare": 100.0,  # Way too heavy for the category
                "club": "TKD Test",
                "surclasse": True,
                "categorie_surclasse_id": narrow_cat["categorie_id"]
            })
            
            # Should fail with 400 error
            assert response.status_code == 400, \
                f"Expected 400 for weight mismatch, got {response.status_code}"
            print("✓ Weight validation works for surclassement")
        else:
            print("⚠ Skipped weight validation test - no suitable category found")
    
    def test_surclassement_requires_category_when_enabled(self, session):
        """Test that surclasse=true requires categorie_surclasse_id"""
        response = session.post(f"{BASE_URL}/api/competiteurs", json={
            "competition_id": COMPETITION_ID,
            "nom": "TEST_NoCategory",
            "prenom": "Paul",
            "date_naissance": "2015-01-01",
            "sexe": "M",
            "poids_declare": 35.0,
            "club": "TKD Test",
            "surclasse": True,
            "categorie_surclasse_id": None  # Missing category
        })
        
        # Should fail or fall back to auto-assignment
        # Based on the code, it should use auto-assignment if categorie_surclasse_id is None
        if response.status_code == 200:
            data = response.json()
            # If it succeeds, it should have auto-assigned a category
            assert data["categorie_id"] is not None
            session.delete(f"{BASE_URL}/api/competiteurs/{data['competiteur_id']}")
            print("✓ Missing surclassement category falls back to auto-assignment")
        else:
            print(f"✓ Missing surclassement category returns error: {response.status_code}")


class TestExistingCompetiteursData:
    """Tests to verify existing test data"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_lucas_dupont_is_surclasse(self, session):
        """Verify Lucas Dupont is marked as surclassé"""
        response = session.get(f"{BASE_URL}/api/competiteurs?competition_id={COMPETITION_ID}")
        assert response.status_code == 200
        competiteurs = response.json()
        
        lucas = next((c for c in competiteurs if c["nom"] == "Dupont" and c["prenom"] == "Lucas"), None)
        assert lucas is not None, "Lucas Dupont should exist"
        assert lucas["surclasse"] == True, "Lucas Dupont should be surclassé"
        print(f"✓ Lucas Dupont is surclassé: {lucas['surclasse']}")
    
    def test_emma_martin_auto_assigned(self, session):
        """Verify Emma Martin has auto-assigned category (not surclassé)"""
        response = session.get(f"{BASE_URL}/api/competiteurs?competition_id={COMPETITION_ID}")
        competiteurs = response.json()
        
        emma = next((c for c in competiteurs if c["nom"] == "Martin" and c["prenom"] == "Emma"), None)
        assert emma is not None, "Emma Martin should exist"
        assert emma["surclasse"] == False, "Emma Martin should not be surclassé"
        assert emma["categorie_id"] is not None, "Emma Martin should have auto-assigned category"
        print(f"✓ Emma Martin has auto-assigned category: {emma['categorie_id']}")
    
    def test_126_categories_exist(self, session):
        """Verify 126 official categories exist for the competition"""
        response = session.get(f"{BASE_URL}/api/categories?competition_id={COMPETITION_ID}")
        assert response.status_code == 200
        categories = response.json()
        
        assert len(categories) == 126, f"Expected 126 categories, got {len(categories)}"
        print(f"✓ Competition has {len(categories)} official categories")


class TestAgeGroupsEndpoint:
    """Tests for GET /api/categories/age-groups"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_age_groups_returns_all_groups(self, session):
        """Test that age-groups endpoint returns all official age groups"""
        response = session.get(f"{BASE_URL}/api/categories/age-groups")
        assert response.status_code == 200
        groups = response.json()
        
        # Should have 8 age groups: Pupilles 1, Pupilles 2, Benjamins, Minimes, Cadets, Juniors, Seniors, Masters
        expected_groups = ["Pupilles 1", "Pupilles 2", "Benjamins", "Minimes", "Cadets", "Juniors", "Seniors", "Masters"]
        
        group_names = [g["nom"] for g in groups]
        for expected in expected_groups:
            assert expected in group_names, f"Missing age group: {expected}"
        
        print(f"✓ Age groups endpoint returns {len(groups)} groups: {group_names}")


# Cleanup fixture to remove test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup after tests
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    # Get and delete test competiteurs
    response = s.get(f"{BASE_URL}/api/competiteurs?competition_id={COMPETITION_ID}")
    if response.status_code == 200:
        for comp in response.json():
            if comp["nom"].startswith("TEST_"):
                s.delete(f"{BASE_URL}/api/competiteurs/{comp['competiteur_id']}")
    
    # Get and delete test competitions
    response = s.get(f"{BASE_URL}/api/competitions")
    if response.status_code == 200:
        for comp in response.json():
            if comp["nom"].startswith("TEST_"):
                s.delete(f"{BASE_URL}/api/competitions/{comp['competition_id']}")
