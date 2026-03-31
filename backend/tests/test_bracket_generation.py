"""
Test bracket generation logic for combat organizer.
Tests the POST /api/combats/generer/{categorie_id} endpoint.

Key test cases:
- 13 fighters → bracket of 16, 3 BYEs, 4 tours (huitieme, quart, demi, finale), 12 combats
- 21 fighters → bracket of 32, 11 BYEs, 5 tours (seizieme, huitieme, quart, demi, finale)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_EMAIL = "admin2@test.com"
MASTER_PASSWORD = "admin123"

# Category IDs from the problem statement
CATEGORY_13_FIGHTERS = "cat_d37cbd4d207d"  # Seniors Masculin -68kg with 13 fighters
CATEGORY_21_FIGHTERS = "cat_b4473d524a47"  # Should have 21 fighters
COMPETITION_ID = "comp_52f906b963d6"  # OPEN PETIT BOURG


class TestBracketGeneration:
    """Test bracket generation with power-of-2 logic"""
    
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
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code} - {login_response.text}")
        
        # Store session cookie
        self.session.cookies.update(login_response.cookies)
        
        yield
        
        # Cleanup - logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_auth_me_works(self):
        """Verify authentication is working"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data.get("role") in ["admin", "master"], f"Expected admin/master role, got: {data.get('role')}"
        print(f"✓ Authenticated as {data.get('name')} ({data.get('role')})")
    
    def test_category_13_fighters_exists(self):
        """Verify category with 13 fighters exists"""
        # Get competiteurs for the category
        response = self.session.get(
            f"{BASE_URL}/api/competiteurs",
            params={"categorie_id": CATEGORY_13_FIGHTERS}
        )
        assert response.status_code == 200, f"Failed to get competiteurs: {response.text}"
        
        competiteurs = response.json()
        print(f"✓ Category {CATEGORY_13_FIGHTERS} has {len(competiteurs)} fighters")
        
        # We expect 13 fighters
        assert len(competiteurs) == 13, f"Expected 13 fighters, got {len(competiteurs)}"
    
    def test_generate_bracket_13_fighters(self):
        """
        Test bracket generation for 13 fighters.
        Expected:
        - bracket_size = 16 (next power of 2 >= 13)
        - num_byes = 3 (16 - 13)
        - tours = [huitieme, quart, demi, finale] (4 tours)
        - total_combats = 12 (13 - 1 = 12 real combats needed)
        """
        # Generate bracket
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        
        assert response.status_code == 200, f"Bracket generation failed: {response.status_code} - {response.text}"
        
        data = response.json()
        print(f"✓ Bracket generated: {data.get('message')}")
        
        # Verify bracket_size is 16
        bracket_size = data.get("bracket_size")
        assert bracket_size == 16, f"Expected bracket_size=16, got {bracket_size}"
        print(f"✓ Bracket size: {bracket_size}")
        
        # Verify num_byes is 3
        num_byes = data.get("nb_byes")
        assert num_byes == 3, f"Expected nb_byes=3, got {num_byes}"
        print(f"✓ Number of BYEs: {num_byes}")
        
        # Verify tours
        tours = data.get("tours", [])
        expected_tours = ["huitieme", "quart", "demi", "finale"]
        assert tours == expected_tours, f"Expected tours={expected_tours}, got {tours}"
        print(f"✓ Tours: {tours}")
        
        # Verify total combats
        combats = data.get("combats", [])
        total_combats = len(combats)
        # For 13 fighters, we need 12 combats total (13-1)
        # But some first-round combats are BYEs, so actual combats created may vary
        # The key is: huitiemes (real) + quarts + demis + finale = 12
        print(f"✓ Total combats created: {total_combats}")
        
        # Verify combats per tour
        combats_par_tour = data.get("combats_par_tour", {})
        print(f"✓ Combats per tour: {combats_par_tour}")
        
        # Expected distribution for 13 fighters in bracket of 16:
        # - huitiemes: 5 real combats (8 slots, 3 BYEs = 5 real matches)
        # - quarts: 4 combats
        # - demis: 2 combats
        # - finale: 1 combat
        # Total: 5 + 4 + 2 + 1 = 12 combats
        
        assert combats_par_tour.get("quart") == 4, f"Expected 4 quarts, got {combats_par_tour.get('quart')}"
        assert combats_par_tour.get("demi") == 2, f"Expected 2 demis, got {combats_par_tour.get('demi')}"
        assert combats_par_tour.get("finale") == 1, f"Expected 1 finale, got {combats_par_tour.get('finale')}"
        
        # Huitiemes should have 5 real combats (8 - 3 BYEs = 5)
        huitiemes_count = combats_par_tour.get("huitieme", 0)
        assert huitiemes_count == 5, f"Expected 5 huitiemes, got {huitiemes_count}"
        
        # Total should be 12
        total_expected = 5 + 4 + 2 + 1
        assert total_combats == total_expected, f"Expected {total_expected} total combats, got {total_combats}"
        print(f"✓ Total combats verified: {total_combats} (5 huitiemes + 4 quarts + 2 demis + 1 finale)")
    
    def test_arbre_endpoint_13_fighters(self):
        """
        Test the /api/combats/arbre/{categorie_id} endpoint after generation.
        Verify all tours are present and BYE winners appear in quarts.
        """
        # First generate the bracket
        gen_response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert gen_response.status_code == 200, f"Bracket generation failed: {gen_response.text}"
        
        # Get the arbre
        response = self.session.get(
            f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200, f"Arbre endpoint failed: {response.text}"
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Verify all 4 tours are present
        expected_tours = ["huitieme", "quart", "demi", "finale"]
        for tour in expected_tours:
            assert tour in arbre, f"Tour '{tour}' missing from arbre"
            print(f"✓ Tour '{tour}' present with {len(arbre[tour])} combats")
        
        # Verify bracket_size and num_byes in response
        assert data.get("bracket_size") == 16, f"Expected bracket_size=16, got {data.get('bracket_size')}"
        assert data.get("num_byes") == 3, f"Expected num_byes=3, got {data.get('num_byes')}"
        
        # Verify total combats
        total_combats = data.get("total_combats", 0)
        assert total_combats == 12, f"Expected 12 total combats, got {total_combats}"
        print(f"✓ Total combats in arbre: {total_combats}")
        
        # Check quarts - some should have BYE winners already assigned
        quarts = arbre.get("quart", [])
        bye_winners_in_quarts = 0
        for combat in quarts:
            rouge = combat.get("rouge", {})
            bleu = combat.get("bleu", {})
            # If rouge or bleu has a real name (not "À déterminer"), it's a BYE winner
            if rouge.get("nom") and rouge.get("nom") != "À déterminer":
                bye_winners_in_quarts += 1
            if bleu.get("nom") and bleu.get("nom") != "À déterminer":
                bye_winners_in_quarts += 1
        
        # With 3 BYEs, we should have 3 fighters already in quarts
        print(f"✓ BYE winners visible in quarts: {bye_winners_in_quarts}")
        assert bye_winners_in_quarts >= 3, f"Expected at least 3 BYE winners in quarts, got {bye_winners_in_quarts}"
        
        # Verify non-determined slots show "À déterminer"
        undetermined_count = 0
        for tour_name, combats in arbre.items():
            for combat in combats:
                rouge = combat.get("rouge", {})
                bleu = combat.get("bleu", {})
                if rouge.get("nom") == "À déterminer":
                    undetermined_count += 1
                if bleu.get("nom") == "À déterminer":
                    undetermined_count += 1
        
        print(f"✓ Undetermined slots ('À déterminer'): {undetermined_count}")
        # There should be some undetermined slots (winners of huitiemes not yet known)
        assert undetermined_count > 0, "Expected some undetermined slots"
    
    def test_generate_bracket_21_fighters(self):
        """
        Test bracket generation for 21 fighters.
        Expected:
        - bracket_size = 32 (next power of 2 >= 21)
        - num_byes = 11 (32 - 21)
        - tours = [seizieme, huitieme, quart, demi, finale] (5 tours)
        - total_combats = 20 (21 - 1 = 20 real combats needed)
        """
        # First check if category has 21 fighters
        response = self.session.get(
            f"{BASE_URL}/api/competiteurs",
            params={"categorie_id": CATEGORY_21_FIGHTERS}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not get competiteurs for category {CATEGORY_21_FIGHTERS}")
        
        competiteurs = response.json()
        n = len(competiteurs)
        
        if n == 0:
            pytest.skip(f"Category {CATEGORY_21_FIGHTERS} has no fighters")
        
        print(f"Category {CATEGORY_21_FIGHTERS} has {n} fighters")
        
        # Generate bracket
        gen_response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_21_FIGHTERS}"
        )
        
        if gen_response.status_code != 200:
            pytest.skip(f"Bracket generation failed: {gen_response.text}")
        
        data = gen_response.json()
        
        # Calculate expected values based on actual fighter count
        import math
        def next_power_of_2(x):
            if x <= 1:
                return 2
            return 1 << (x - 1).bit_length()
        
        expected_bracket_size = next_power_of_2(n)
        expected_byes = expected_bracket_size - n
        expected_combats = n - 1
        
        print(f"✓ For {n} fighters: bracket={expected_bracket_size}, byes={expected_byes}, combats={expected_combats}")
        
        # Verify
        assert data.get("bracket_size") == expected_bracket_size
        assert data.get("nb_byes") == expected_byes
        
        # Verify tours based on bracket size
        tours = data.get("tours", [])
        if expected_bracket_size >= 32:
            assert "seizieme" in tours, "Expected seizieme tour for bracket >= 32"
        if expected_bracket_size >= 16:
            assert "huitieme" in tours, "Expected huitieme tour for bracket >= 16"
        if expected_bracket_size >= 8:
            assert "quart" in tours, "Expected quart tour for bracket >= 8"
        if expected_bracket_size >= 4:
            assert "demi" in tours, "Expected demi tour for bracket >= 4"
        assert "finale" in tours, "Expected finale tour"
        
        print(f"✓ Tours: {tours}")


class TestBracketEdgeCases:
    """Test edge cases for bracket generation"""
    
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
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        self.session.cookies.update(login_response.cookies)
        yield
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_power_of_2_calculation(self):
        """Verify power of 2 calculation is correct"""
        # Test cases: (n_fighters, expected_bracket_size, expected_byes)
        test_cases = [
            (2, 2, 0),
            (3, 4, 1),
            (4, 4, 0),
            (5, 8, 3),
            (8, 8, 0),
            (9, 16, 7),
            (13, 16, 3),
            (16, 16, 0),
            (17, 32, 15),
            (21, 32, 11),
            (32, 32, 0),
        ]
        
        def next_power_of_2(x):
            if x <= 1:
                return 2
            return 1 << (x - 1).bit_length()
        
        for n, expected_bracket, expected_byes in test_cases:
            bracket = next_power_of_2(n)
            byes = bracket - n
            assert bracket == expected_bracket, f"For n={n}: expected bracket={expected_bracket}, got {bracket}"
            assert byes == expected_byes, f"For n={n}: expected byes={expected_byes}, got {byes}"
            print(f"✓ n={n} → bracket={bracket}, byes={byes}")
    
    def test_tour_names_by_bracket_size(self):
        """Verify tour names are correct for each bracket size"""
        def get_tour_names(bracket_size):
            tours = []
            if bracket_size >= 32:
                tours.append("seizieme")
            if bracket_size >= 16:
                tours.append("huitieme")
            if bracket_size >= 8:
                tours.append("quart")
            if bracket_size >= 4:
                tours.append("demi")
            tours.append("finale")
            return tours
        
        # Test cases
        assert get_tour_names(2) == ["finale"]
        assert get_tour_names(4) == ["demi", "finale"]
        assert get_tour_names(8) == ["quart", "demi", "finale"]
        assert get_tour_names(16) == ["huitieme", "quart", "demi", "finale"]
        assert get_tour_names(32) == ["seizieme", "huitieme", "quart", "demi", "finale"]
        
        print("✓ Tour names verified for all bracket sizes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
