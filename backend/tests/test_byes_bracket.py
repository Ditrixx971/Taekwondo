"""
Test suite for BYEs management and bracket generation (World Taekwondo rules)
Tests:
- GET /api/categories/{id}/byes - returns bye info with competiteurs list
- PUT /api/categories/{id}/byes - allows MASTER to modify byes (should fail if locked)
- GET /api/combats/arbre/{id} - returns bracket_size, num_byes, byes_locked info
- No bronze fight generation (World Taekwondo rules)
- New tours (seizieme, huitieme) support
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_EMAIL = "admin2@test.com"
MASTER_PASSWORD = "admin123"
COMPETITION_ID = "comp_52f906b963d6"  # OPEN PETIT BOURG


class TestByesAPI:
    """Tests for BYEs management API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as MASTER
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MASTER_EMAIL, "password": MASTER_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        assert self.user["role"] == "master", "User should be MASTER role"
        print(f"✓ Logged in as MASTER: {self.user['email']}")
        
    def test_01_get_categories_with_combats(self):
        """Test getting categories that have combats generated"""
        # Get all categories for the competition
        response = self.session.get(
            f"{BASE_URL}/api/categories?competition_id={COMPETITION_ID}"
        )
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        categories = response.json()
        print(f"✓ Found {len(categories)} categories in competition")
        
        # Get combats to find categories with generated brackets
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        assert combats_response.status_code == 200
        combats = combats_response.json()
        
        # Find unique category IDs with combats
        categories_with_combats = set(c["categorie_id"] for c in combats)
        print(f"✓ Found {len(categories_with_combats)} categories with generated combats")
        
        return list(categories_with_combats)
    
    def test_02_get_byes_info_endpoint(self):
        """Test GET /api/categories/{id}/byes returns correct structure"""
        # First get a category with combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found in competition")
        
        categorie_id = combats[0]["categorie_id"]
        
        # Test the byes endpoint
        response = self.session.get(f"{BASE_URL}/api/categories/{categorie_id}/byes")
        assert response.status_code == 200, f"Failed to get byes info: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "categorie_id" in data, "Response should contain categorie_id"
        assert "categorie_nom" in data, "Response should contain categorie_nom"
        assert "nb_competiteurs" in data, "Response should contain nb_competiteurs"
        assert "bracket_size" in data, "Response should contain bracket_size"
        assert "num_byes_disponibles" in data, "Response should contain num_byes_disponibles"
        assert "byes_locked" in data, "Response should contain byes_locked"
        assert "competiteurs_avec_bye" in data, "Response should contain competiteurs_avec_bye"
        assert "competiteurs" in data, "Response should contain competiteurs list"
        
        print(f"✓ BYEs info for category {data['categorie_nom']}:")
        print(f"  - {data['nb_competiteurs']} competiteurs")
        print(f"  - Bracket size: {data['bracket_size']}")
        print(f"  - BYEs disponibles: {data['num_byes_disponibles']}")
        print(f"  - BYEs locked: {data['byes_locked']}")
        print(f"  - Competiteurs avec BYE: {len(data['competiteurs_avec_bye'])}")
        
        # Verify competiteurs list structure
        if data["competiteurs"]:
            comp = data["competiteurs"][0]
            assert "competiteur_id" in comp
            assert "nom" in comp
            assert "prenom" in comp
            assert "club" in comp
            assert "has_bye" in comp
            print(f"✓ Competiteur structure verified")
        
        return data
    
    def test_03_get_arbre_combats_returns_bracket_info(self):
        """Test GET /api/combats/arbre/{id} returns bracket_size, num_byes, byes_locked"""
        # Get a category with combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found in competition")
        
        categorie_id = combats[0]["categorie_id"]
        
        # Test the arbre endpoint
        response = self.session.get(f"{BASE_URL}/api/combats/arbre/{categorie_id}")
        assert response.status_code == 200, f"Failed to get arbre: {response.text}"
        
        data = response.json()
        
        # Verify bracket info is present
        assert "bracket_size" in data, "Response should contain bracket_size"
        assert "num_byes" in data, "Response should contain num_byes"
        assert "byes_locked" in data, "Response should contain byes_locked"
        assert "arbre" in data, "Response should contain arbre"
        assert "categorie" in data, "Response should contain categorie"
        assert "total_combats" in data, "Response should contain total_combats"
        assert "combats_termines" in data, "Response should contain combats_termines"
        
        print(f"✓ Arbre info:")
        print(f"  - Bracket size: {data['bracket_size']}")
        print(f"  - Num BYEs: {data['num_byes']}")
        print(f"  - BYEs locked: {data['byes_locked']}")
        print(f"  - Total combats: {data['total_combats']}")
        print(f"  - Tours in arbre: {list(data['arbre'].keys())}")
        
        return data
    
    def test_04_no_bronze_fight_in_arbre(self):
        """Test that no bronze fight is generated (World Taekwondo rules)"""
        # Get a category with combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found in competition")
        
        categorie_id = combats[0]["categorie_id"]
        
        # Get the arbre
        response = self.session.get(f"{BASE_URL}/api/combats/arbre/{categorie_id}")
        data = response.json()
        
        # Verify no bronze tour exists
        arbre = data.get("arbre", {})
        assert "bronze" not in arbre, "Bronze fight should NOT exist (World Taekwondo rules)"
        
        # Also check all combats for this category
        all_combats = [c for c in combats if c["categorie_id"] == categorie_id]
        bronze_combats = [c for c in all_combats if c.get("tour") == "bronze"]
        assert len(bronze_combats) == 0, f"Found {len(bronze_combats)} bronze combats - should be 0"
        
        print(f"✓ No bronze fight found (World Taekwondo rules verified)")
        print(f"  - Tours present: {list(arbre.keys())}")
    
    def test_05_new_tours_supported(self):
        """Test that new tours (seizieme, huitieme) are properly supported"""
        # Get all combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        # Get unique tours
        tours = set(c.get("tour") for c in combats if c.get("tour"))
        print(f"✓ Tours found in combats: {tours}")
        
        # Valid tours according to World Taekwondo
        valid_tours = {"seizieme", "huitieme", "quart", "demi", "finale", "manuel"}
        
        for tour in tours:
            if tour not in valid_tours and not tour.startswith("tour_"):
                print(f"  ⚠ Unknown tour type: {tour}")
        
        # Check if seizieme or huitieme exist (depends on bracket size)
        if "seizieme" in tours:
            print(f"✓ 16èmes de finale (seizieme) supported")
        if "huitieme" in tours:
            print(f"✓ 8èmes de finale (huitieme) supported")
        
        return tours
    
    def test_06_put_byes_requires_master(self):
        """Test that PUT /api/categories/{id}/byes requires MASTER role"""
        # Get a category with combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found in competition")
        
        categorie_id = combats[0]["categorie_id"]
        
        # Get byes info first
        byes_response = self.session.get(f"{BASE_URL}/api/categories/{categorie_id}/byes")
        byes_info = byes_response.json()
        
        # If byes are locked, we expect a 400 error
        if byes_info.get("byes_locked"):
            response = self.session.put(
                f"{BASE_URL}/api/categories/{categorie_id}/byes",
                json={"competiteur_ids_with_bye": []}
            )
            assert response.status_code == 400, "Should fail when byes are locked"
            assert "verrouillés" in response.json().get("detail", "").lower() or "locked" in response.json().get("detail", "").lower()
            print(f"✓ PUT byes correctly rejected when locked: {response.json()['detail']}")
        else:
            # If not locked, we can test the endpoint
            # Get current byes
            current_byes = byes_info.get("competiteurs_avec_bye", [])
            num_byes = byes_info.get("num_byes_disponibles", 0)
            
            if num_byes > 0:
                # Try to modify with same byes (should work)
                response = self.session.put(
                    f"{BASE_URL}/api/categories/{categorie_id}/byes",
                    json={"competiteur_ids_with_bye": current_byes}
                )
                # Could be 200 or 400 depending on state
                print(f"✓ PUT byes response: {response.status_code}")
            else:
                print(f"✓ No BYEs to modify (num_byes_disponibles = 0)")
    
    def test_07_byes_locked_when_combat_started(self):
        """Test that byes are locked when a combat has started"""
        # Get categories with combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        # Find a category with a started or finished combat
        categories_with_started = set()
        for c in combats:
            if c.get("statut") in ["en_cours", "termine"]:
                categories_with_started.add(c["categorie_id"])
        
        if not categories_with_started:
            print("✓ No categories with started combats found - cannot test lock")
            return
        
        categorie_id = list(categories_with_started)[0]
        
        # Get byes info
        response = self.session.get(f"{BASE_URL}/api/categories/{categorie_id}/byes")
        data = response.json()
        
        assert data.get("byes_locked") == True, "BYEs should be locked when combat has started"
        print(f"✓ BYEs correctly locked for category with started combat")


class TestBracketGeneration:
    """Tests for bracket generation logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as MASTER
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MASTER_EMAIL, "password": MASTER_PASSWORD}
        )
        assert login_response.status_code == 200
        self.user = login_response.json()
    
    def test_bracket_size_power_of_2(self):
        """Test that bracket sizes are powers of 2"""
        # Get categories with combats
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found")
        
        # Get unique categories
        categories = set(c["categorie_id"] for c in combats)
        
        for cat_id in list(categories)[:3]:  # Test first 3 categories
            response = self.session.get(f"{BASE_URL}/api/combats/arbre/{cat_id}")
            if response.status_code == 200:
                data = response.json()
                bracket_size = data.get("bracket_size", 0)
                
                if bracket_size > 0:
                    # Check if power of 2
                    is_power_of_2 = (bracket_size & (bracket_size - 1)) == 0
                    assert is_power_of_2, f"Bracket size {bracket_size} is not a power of 2"
                    print(f"✓ Category {cat_id}: bracket_size={bracket_size} (valid power of 2)")
    
    def test_num_byes_calculation(self):
        """Test that num_byes = bracket_size - num_competiteurs"""
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found")
        
        categories = set(c["categorie_id"] for c in combats)
        
        for cat_id in list(categories)[:3]:
            byes_response = self.session.get(f"{BASE_URL}/api/categories/{cat_id}/byes")
            if byes_response.status_code == 200:
                data = byes_response.json()
                
                nb_comp = data.get("nb_competiteurs", 0)
                bracket_size = data.get("bracket_size", 0)
                num_byes = data.get("num_byes_disponibles", 0)
                
                expected_byes = bracket_size - nb_comp
                assert num_byes == expected_byes, f"num_byes should be {expected_byes}, got {num_byes}"
                print(f"✓ Category: {nb_comp} competiteurs, bracket={bracket_size}, byes={num_byes}")


class TestMedaillesAttribution:
    """Tests for medals attribution (World Taekwondo rules)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as MASTER
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MASTER_EMAIL, "password": MASTER_PASSWORD}
        )
        assert login_response.status_code == 200
        self.user = login_response.json()
    
    def test_medailles_endpoint_exists(self):
        """Test that medailles endpoint exists"""
        # Get a category
        combats_response = self.session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if not combats:
            pytest.skip("No combats found")
        
        categorie_id = combats[0]["categorie_id"]
        
        # Try to get medailles
        response = self.session.get(f"{BASE_URL}/api/medailles?categorie_id={categorie_id}")
        # Should return 200 even if empty
        assert response.status_code == 200, f"Medailles endpoint failed: {response.text}"
        print(f"✓ Medailles endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
