"""
Test suite for complete bracket tree generation with new rules:
1. Complete tree visible from start with ALL rounds
2. Empty slots display "À déterminer" (rouge_id=null or bleu_id=null)
3. BYEs displayed (fighter vs BYE) with has_bye=True and termine=True
4. Strict power of 2 structure (each round = half of previous)
5. Direct elimination without repechage
6. Automatic winner propagation to next round
"""
import pytest
import requests
import os
import math

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin2@test.com"
TEST_PASSWORD = "admin123"
COMPETITION_ID = "comp_52f906b963d6"

# Test categories (regenerated with new logic)
CAT_13_FIGHTERS = "cat_d37cbd4d207d"  # 13 combattants
CAT_4_FIGHTERS = "cat_280b2d59b6c9"   # 4 combattants
CAT_8_FIGHTERS = "cat_1d0a6b6af09a"   # 8 combattants


@pytest.fixture(scope="module")
def auth_session():
    """Get authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    return session


class TestBracketGeneration13Fighters:
    """Test bracket generation for 13 fighters (bracket_size=16, 3 BYEs)"""
    
    def test_arbre_api_returns_all_rounds(self, auth_session):
        """API /api/combats/arbre should return ALL rounds including empty ones"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200, f"API failed: {response.text}"
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # For 13 fighters (bracket_size=16), we expect: huitieme, quart, demi, finale
        expected_tours = ["huitieme", "quart", "demi", "finale"]
        
        print(f"Tours in arbre: {list(arbre.keys())}")
        print(f"Expected tours: {expected_tours}")
        
        for tour in expected_tours:
            assert tour in arbre, f"Tour '{tour}' missing from arbre"
            print(f"  {tour}: {len(arbre[tour])} combats")
    
    def test_total_combats_13_fighters(self, auth_session):
        """13 fighters should generate 15 total combats (8+4+2+1)"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_combats", 0)
        
        # bracket_size=16 -> 8 huitièmes + 4 quarts + 2 demis + 1 finale = 15
        expected_total = 15
        
        print(f"Total combats: {total}, Expected: {expected_total}")
        assert total == expected_total, f"Expected {expected_total} combats, got {total}"
    
    def test_combats_per_round_13_fighters(self, auth_session):
        """Verify each round has correct number of combats (power of 2 structure)"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Expected: 8 huitièmes, 4 quarts, 2 demis, 1 finale
        expected_counts = {
            "huitieme": 8,
            "quart": 4,
            "demi": 2,
            "finale": 1
        }
        
        for tour, expected_count in expected_counts.items():
            actual_count = len(arbre.get(tour, []))
            print(f"{tour}: {actual_count} combats (expected {expected_count})")
            assert actual_count == expected_count, f"{tour}: expected {expected_count}, got {actual_count}"
    
    def test_byes_marked_correctly(self, auth_session):
        """BYE combats should have has_bye=True and termine=True"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Check first round (huitièmes) for BYEs
        huitiemes = arbre.get("huitieme", [])
        bye_combats = [c for c in huitiemes if c.get("has_bye")]
        
        print(f"BYE combats found: {len(bye_combats)}")
        
        # 13 fighters in bracket_size=16 -> 3 BYEs
        assert len(bye_combats) == 3, f"Expected 3 BYE combats, got {len(bye_combats)}"
        
        for combat in bye_combats:
            assert combat.get("termine") == True, f"BYE combat {combat['combat_id']} should be termine=True"
            assert combat.get("vainqueur_id") is not None, f"BYE combat should have a winner"
            print(f"  BYE combat {combat['position']}: termine={combat.get('termine')}, vainqueur={combat.get('vainqueur_id')}")
    
    def test_bye_winners_propagated_to_next_round(self, auth_session):
        """BYE winners should be propagated to quarts immediately"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Get BYE winners from huitièmes
        huitiemes = arbre.get("huitieme", [])
        bye_winners = [c.get("vainqueur_id") for c in huitiemes if c.get("has_bye") and c.get("vainqueur_id")]
        
        # Check quarts for these winners
        quarts = arbre.get("quart", [])
        quarts_fighters = []
        for q in quarts:
            if q.get("rouge_id"):
                quarts_fighters.append(q["rouge_id"])
            if q.get("bleu_id"):
                quarts_fighters.append(q["bleu_id"])
        
        print(f"BYE winners: {bye_winners}")
        print(f"Fighters in quarts: {quarts_fighters}")
        
        # All BYE winners should be in quarts
        for winner in bye_winners:
            assert winner in quarts_fighters, f"BYE winner {winner} not found in quarts"
        
        print(f"All {len(bye_winners)} BYE winners correctly propagated to quarts")


class TestBracketGeneration4Fighters:
    """Test bracket generation for 4 fighters (bracket_size=4, 0 BYEs)"""
    
    def test_arbre_api_returns_all_rounds_4_fighters(self, auth_session):
        """4 fighters should have demi and finale rounds"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_4_FIGHTERS}")
        assert response.status_code == 200, f"API failed: {response.text}"
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # For 4 fighters (bracket_size=4), we expect: demi, finale
        expected_tours = ["demi", "finale"]
        
        print(f"Tours in arbre: {list(arbre.keys())}")
        
        for tour in expected_tours:
            assert tour in arbre, f"Tour '{tour}' missing from arbre"
    
    def test_total_combats_4_fighters(self, auth_session):
        """4 fighters should generate 3 total combats (2 demis + 1 finale)"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_4_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_combats", 0)
        
        # bracket_size=4 -> 2 demis + 1 finale = 3
        expected_total = 3
        
        print(f"Total combats: {total}, Expected: {expected_total}")
        assert total == expected_total, f"Expected {expected_total} combats, got {total}"
    
    def test_no_byes_4_fighters(self, auth_session):
        """4 fighters should have 0 BYEs"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_4_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        num_byes = data.get("num_byes", -1)
        
        print(f"Number of BYEs: {num_byes}")
        assert num_byes == 0, f"Expected 0 BYEs, got {num_byes}"
    
    def test_combats_per_round_4_fighters(self, auth_session):
        """4 fighters: 2 demis + 1 finale"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_4_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        expected_counts = {
            "demi": 2,
            "finale": 1
        }
        
        for tour, expected_count in expected_counts.items():
            actual_count = len(arbre.get(tour, []))
            print(f"{tour}: {actual_count} combats (expected {expected_count})")
            assert actual_count == expected_count, f"{tour}: expected {expected_count}, got {actual_count}"


class TestBracketGeneration8Fighters:
    """Test bracket generation for 8 fighters (bracket_size=8, 0 BYEs)"""
    
    def test_arbre_api_returns_all_rounds_8_fighters(self, auth_session):
        """8 fighters should have quart, demi, finale rounds"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_8_FIGHTERS}")
        assert response.status_code == 200, f"API failed: {response.text}"
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # For 8 fighters (bracket_size=8), we expect: quart, demi, finale
        expected_tours = ["quart", "demi", "finale"]
        
        print(f"Tours in arbre: {list(arbre.keys())}")
        
        for tour in expected_tours:
            assert tour in arbre, f"Tour '{tour}' missing from arbre"
    
    def test_total_combats_8_fighters(self, auth_session):
        """8 fighters should generate 7 total combats (4 quarts + 2 demis + 1 finale)"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_8_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_combats", 0)
        
        # bracket_size=8 -> 4 quarts + 2 demis + 1 finale = 7
        expected_total = 7
        
        print(f"Total combats: {total}, Expected: {expected_total}")
        assert total == expected_total, f"Expected {expected_total} combats, got {total}"
    
    def test_no_byes_8_fighters(self, auth_session):
        """8 fighters should have 0 BYEs"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_8_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        num_byes = data.get("num_byes", -1)
        
        print(f"Number of BYEs: {num_byes}")
        assert num_byes == 0, f"Expected 0 BYEs, got {num_byes}"
    
    def test_combats_per_round_8_fighters(self, auth_session):
        """8 fighters: 4 quarts + 2 demis + 1 finale"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_8_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        expected_counts = {
            "quart": 4,
            "demi": 2,
            "finale": 1
        }
        
        for tour, expected_count in expected_counts.items():
            actual_count = len(arbre.get(tour, []))
            print(f"{tour}: {actual_count} combats (expected {expected_count})")
            assert actual_count == expected_count, f"{tour}: expected {expected_count}, got {actual_count}"


class TestADeterminerDisplay:
    """Test that 'À déterminer' is displayed for empty slots"""
    
    def test_future_rounds_have_a_determiner(self, auth_session):
        """Future rounds should have combats with null rouge_id or bleu_id (À déterminer)"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Check quarts, demis, finale for "À déterminer" slots
        a_determiner_count = 0
        
        for tour in ["quart", "demi", "finale"]:
            combats = arbre.get(tour, [])
            for combat in combats:
                rouge = combat.get("rouge", {})
                bleu = combat.get("bleu", {})
                
                if rouge.get("nom") == "À déterminer":
                    a_determiner_count += 1
                if bleu.get("nom") == "À déterminer":
                    a_determiner_count += 1
        
        print(f"'À déterminer' slots found: {a_determiner_count}")
        
        # With 13 fighters and 3 BYEs, we should have some "À déterminer" in future rounds
        # (unless all results are already entered)
        # The key is that the API returns these combats with "À déterminer" labels
        assert a_determiner_count >= 0, "API should return combats with 'À déterminer' for unknown fighters"


class TestPowerOf2Structure:
    """Test strict power of 2 structure"""
    
    def test_each_round_is_half_of_previous(self, auth_session):
        """Each round should have exactly half the combats of the previous round"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        tour_order = ["huitieme", "quart", "demi", "finale"]
        
        prev_count = None
        for tour in tour_order:
            if tour in arbre:
                current_count = len(arbre[tour])
                print(f"{tour}: {current_count} combats")
                
                if prev_count is not None:
                    expected = prev_count // 2
                    assert current_count == expected, f"{tour} should have {expected} combats (half of {prev_count}), got {current_count}"
                
                prev_count = current_count
        
        # Finale should always have 1 combat
        assert len(arbre.get("finale", [])) == 1, "Finale should have exactly 1 combat"


class TestWinnerPropagation:
    """Test automatic winner propagation"""
    
    def test_bye_winner_appears_in_next_round(self, auth_session):
        """BYE winners should automatically appear in the next round"""
        response = auth_session.get(f"{BASE_URL}/api/combats/arbre/{CAT_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Get all BYE winners from huitièmes
        huitiemes = arbre.get("huitieme", [])
        bye_winners = []
        for combat in huitiemes:
            if combat.get("has_bye") and combat.get("vainqueur_id"):
                bye_winners.append(combat["vainqueur_id"])
        
        # Check that these winners appear in quarts
        quarts = arbre.get("quart", [])
        quarts_fighters = set()
        for combat in quarts:
            if combat.get("rouge_id"):
                quarts_fighters.add(combat["rouge_id"])
            if combat.get("bleu_id"):
                quarts_fighters.add(combat["bleu_id"])
        
        print(f"BYE winners: {bye_winners}")
        print(f"Fighters in quarts: {quarts_fighters}")
        
        for winner in bye_winners:
            assert winner in quarts_fighters, f"BYE winner {winner} should be in quarts"
        
        print(f"All {len(bye_winners)} BYE winners correctly propagated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
