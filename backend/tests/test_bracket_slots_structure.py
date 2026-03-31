"""
Test bracket slot structure for combat organizer.
Tests the NEW requirement: Each tour has EXACTLY bracket_size/2^(tour_index+1) SLOTS.

For 13 fighters:
- bracket_size = 16
- 8èmes = 8 slots (16/2 = 8)
- Quarts = 4 combats (8/2 = 4)
- Demis = 2 combats (4/2 = 2)
- Finale = 1 combat (2/2 = 1)
- Total = 15 combats (8+4+2+1)
- BYEs = 3 (visible as slots with 'À déterminer' opponent, termine=true)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_EMAIL = "admin2@test.com"
MASTER_PASSWORD = "admin123"

# Category ID from the problem statement
CATEGORY_13_FIGHTERS = "cat_d37cbd4d207d"  # Seniors Masculin -68kg with 13 fighters


class TestBracketSlotStructure:
    """Test bracket slot structure with the new requirements"""
    
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
        
        self.session.cookies.update(login_response.cookies)
        yield
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_8emes_has_exactly_8_slots(self):
        """
        RÈGLE ABSOLUE: 8èmes = bracket_size / 2 = 16 / 2 = 8 slots
        """
        # Generate bracket
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200, f"Bracket generation failed: {response.text}"
        
        data = response.json()
        combats_par_tour = data.get("combats_par_tour", {})
        
        # 8èmes should have exactly 8 slots
        huitiemes_count = combats_par_tour.get("huitieme", 0)
        assert huitiemes_count == 8, f"FAILED: Expected 8 slots in 8èmes, got {huitiemes_count}"
        print(f"✓ 8èmes has exactly 8 slots")
    
    def test_quarts_has_exactly_4_combats(self):
        """
        RÈGLE ABSOLUE: Quarts = 8èmes / 2 = 8 / 2 = 4 combats
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        combats_par_tour = data.get("combats_par_tour", {})
        
        quarts_count = combats_par_tour.get("quart", 0)
        assert quarts_count == 4, f"FAILED: Expected 4 combats in Quarts, got {quarts_count}"
        print(f"✓ Quarts has exactly 4 combats")
    
    def test_demis_has_exactly_2_combats(self):
        """
        RÈGLE ABSOLUE: Demis = Quarts / 2 = 4 / 2 = 2 combats
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        combats_par_tour = data.get("combats_par_tour", {})
        
        demis_count = combats_par_tour.get("demi", 0)
        assert demis_count == 2, f"FAILED: Expected 2 combats in Demis, got {demis_count}"
        print(f"✓ Demis has exactly 2 combats")
    
    def test_finale_has_exactly_1_combat(self):
        """
        RÈGLE ABSOLUE: Finale = Demis / 2 = 2 / 2 = 1 combat
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        combats_par_tour = data.get("combats_par_tour", {})
        
        finale_count = combats_par_tour.get("finale", 0)
        assert finale_count == 1, f"FAILED: Expected 1 combat in Finale, got {finale_count}"
        print(f"✓ Finale has exactly 1 combat")
    
    def test_total_combats_is_15(self):
        """
        Total combats = 8 + 4 + 2 + 1 = 15 (includes 3 BYE slots)
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        combats = data.get("combats", [])
        total = len(combats)
        
        assert total == 15, f"FAILED: Expected 15 total combats, got {total}"
        print(f"✓ Total combats is 15 (8+4+2+1)")
    
    def test_structure_valide_is_true(self):
        """
        API should return structure_valide: true
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        structure_valide = data.get("structure_valide")
        
        assert structure_valide is True, f"FAILED: Expected structure_valide=True, got {structure_valide}"
        print(f"✓ structure_valide is True")
    
    def test_verification_object_all_valid(self):
        """
        API should return verification object with all tours valid
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        verification = data.get("verification", {})
        
        for tour, info in verification.items():
            expected = info.get("expected")
            actual = info.get("actual")
            valid = info.get("valid")
            assert valid is True, f"FAILED: Tour '{tour}' is not valid (expected={expected}, actual={actual})"
            print(f"✓ Tour '{tour}': expected={expected}, actual={actual}, valid={valid}")
    
    def test_bye_slots_visible_with_a_determiner(self):
        """
        BYE slots should be visible with 'À déterminer' as the absent opponent
        """
        # Generate bracket
        self.session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}")
        
        # Get arbre
        response = self.session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        huitiemes = arbre.get("huitieme", [])
        
        bye_slots = [c for c in huitiemes if c.get("has_bye")]
        
        assert len(bye_slots) == 3, f"FAILED: Expected 3 BYE slots, got {len(bye_slots)}"
        
        for bye in bye_slots:
            rouge = bye.get("rouge", {}).get("nom", "")
            bleu = bye.get("bleu", {}).get("nom", "")
            # One should be "À déterminer" (the BYE side)
            has_a_determiner = rouge == "À déterminer" or bleu == "À déterminer"
            assert has_a_determiner, f"FAILED: BYE slot #{bye.get('position')} should have 'À déterminer'"
        
        print(f"✓ All 3 BYE slots show 'À déterminer' as opponent")
    
    def test_bye_slots_marked_as_termine_with_vainqueur(self):
        """
        BYE slots should be marked as termine=true with vainqueur_id set
        """
        # Generate bracket
        self.session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}")
        
        # Get arbre
        response = self.session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        huitiemes = arbre.get("huitieme", [])
        
        bye_slots = [c for c in huitiemes if c.get("has_bye")]
        
        for bye in bye_slots:
            termine = bye.get("termine")
            vainqueur_id = bye.get("vainqueur_id")
            
            assert termine is True, f"FAILED: BYE slot #{bye.get('position')} should have termine=True"
            assert vainqueur_id is not None, f"FAILED: BYE slot #{bye.get('position')} should have vainqueur_id set"
        
        print(f"✓ All 3 BYE slots are marked as termine=True with vainqueur_id set")
    
    def test_bye_winners_appear_in_quarts(self):
        """
        BYE winners should appear in the next round (quarts)
        """
        # Generate bracket
        self.session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}")
        
        # Get arbre
        response = self.session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}")
        assert response.status_code == 200
        
        data = response.json()
        arbre = data.get("arbre", {})
        huitiemes = arbre.get("huitieme", [])
        quarts = arbre.get("quart", [])
        
        # Get BYE winner IDs
        bye_winner_ids = set()
        for bye in huitiemes:
            if bye.get("has_bye") and bye.get("vainqueur_id"):
                bye_winner_ids.add(bye.get("vainqueur_id"))
        
        # Check if BYE winners appear in quarts
        quarts_fighter_ids = set()
        for quart in quarts:
            if quart.get("rouge_id"):
                quarts_fighter_ids.add(quart.get("rouge_id"))
            if quart.get("bleu_id"):
                quarts_fighter_ids.add(quart.get("bleu_id"))
        
        # All BYE winners should be in quarts
        for winner_id in bye_winner_ids:
            assert winner_id in quarts_fighter_ids, f"FAILED: BYE winner {winner_id} not found in quarts"
        
        print(f"✓ All {len(bye_winner_ids)} BYE winners appear in quarts")
    
    def test_bracket_size_is_16(self):
        """
        For 13 fighters, bracket_size should be 16
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        bracket_size = data.get("bracket_size")
        
        assert bracket_size == 16, f"FAILED: Expected bracket_size=16, got {bracket_size}"
        print(f"✓ bracket_size is 16")
    
    def test_num_byes_is_3(self):
        """
        For 13 fighters in bracket of 16, num_byes should be 3
        """
        response = self.session.post(
            f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}"
        )
        assert response.status_code == 200
        
        data = response.json()
        num_byes = data.get("nb_byes")
        
        assert num_byes == 3, f"FAILED: Expected nb_byes=3, got {num_byes}"
        print(f"✓ nb_byes is 3")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
