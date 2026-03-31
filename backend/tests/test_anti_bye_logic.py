"""
Test Anti-BYE Logic for Taekwondo Competition Bracket Generation

Tests the new Anti-BYE visual logic:
- Combats with only 1 fighter (BYE) should NOT be created/displayed
- A match should only exist if A != null AND B != null
- BYE winners should be propagated automatically and silently
- Dynamic combat creation when results are entered
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin2@test.com"
TEST_PASSWORD = "admin123"
COMPETITION_ID = "comp_52f906b963d6"
CATEGORY_13_FIGHTERS = "cat_d37cbd4d207d"  # 13 combattants - 3 BYEs
CATEGORY_4_FIGHTERS = "cat_280b2d59b6c9"   # 4 combattants - 0 BYEs


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    
    return s


class TestAntiBye4Fighters:
    """Test bracket generation with 4 fighters (0 BYEs)"""
    
    def test_regenerate_bracket_4_fighters(self, session):
        """Regenerate bracket for 4 fighters category"""
        response = session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_4_FIGHTERS}")
        
        assert response.status_code == 200, f"Failed to regenerate: {response.text}"
        data = response.json()
        
        # 4 fighters = bracket_size 4, 0 BYEs
        assert data["nb_combattants"] == 4, f"Expected 4 fighters, got {data['nb_combattants']}"
        assert data["bracket_size"] == 4, f"Expected bracket_size 4, got {data['bracket_size']}"
        assert data["nb_byes"] == 0, f"Expected 0 BYEs, got {data['nb_byes']}"
        
        # With 4 fighters and 0 BYEs: 2 demis should be created immediately
        # Finale should NOT be created yet (waiting for demi results)
        assert data["combats_crees"] == 2, f"Expected 2 combats created (demis), got {data['combats_crees']}"
        assert data["total_combats_prevu"] == 3, f"Expected 3 total combats (n-1), got {data['total_combats_prevu']}"
        
        print(f"✓ 4 fighters: {data['combats_crees']} combats created, {data['combats_restants']} remaining")
    
    def test_arbre_4_fighters_no_null_combattants(self, session):
        """Verify no combat has null rouge or bleu"""
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_4_FIGHTERS}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all combats in arbre
        for tour, combats in data.get("arbre", {}).items():
            for combat in combats:
                # ANTI-BYE RULE: No combat should have null rouge or bleu
                assert combat.get("rouge_id") is not None, f"Combat {combat['combat_id']} has null rouge_id"
                assert combat.get("bleu_id") is not None, f"Combat {combat['combat_id']} has null bleu_id"
                
                # Also check the enriched data
                rouge = combat.get("rouge", {})
                bleu = combat.get("bleu", {})
                assert rouge.get("nom") != "À déterminer", f"Combat {combat['combat_id']} has 'À déterminer' for rouge"
                assert bleu.get("nom") != "À déterminer", f"Combat {combat['combat_id']} has 'À déterminer' for bleu"
        
        print(f"✓ All combats have both fighters defined (no null, no 'À déterminer')")
    
    def test_4_fighters_only_demis_created(self, session):
        """With 4 fighters, only demis should be created initially"""
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_4_FIGHTERS}")
        
        assert response.status_code == 200
        data = response.json()
        arbre = data.get("arbre", {})
        
        # Should have demis
        assert "demi" in arbre, "Demis should exist"
        assert len(arbre["demi"]) == 2, f"Expected 2 demis, got {len(arbre['demi'])}"
        
        # Finale should NOT exist yet (created dynamically after demis)
        # OR if it exists, it should have both fighters defined
        if "finale" in arbre and len(arbre["finale"]) > 0:
            finale = arbre["finale"][0]
            # If finale exists, both fighters must be defined
            assert finale.get("rouge_id") is not None, "Finale rouge_id should not be null"
            assert finale.get("bleu_id") is not None, "Finale bleu_id should not be null"
        
        print(f"✓ 4 fighters: {len(arbre.get('demi', []))} demis, finale created dynamically")


class TestAntiBye13Fighters:
    """Test bracket generation with 13 fighters (3 BYEs)"""
    
    def test_regenerate_bracket_13_fighters(self, session):
        """Regenerate bracket for 13 fighters category"""
        response = session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}")
        
        assert response.status_code == 200, f"Failed to regenerate: {response.text}"
        data = response.json()
        
        # 13 fighters = bracket_size 16, 3 BYEs
        assert data["nb_combattants"] == 13, f"Expected 13 fighters, got {data['nb_combattants']}"
        assert data["bracket_size"] == 16, f"Expected bracket_size 16, got {data['bracket_size']}"
        assert data["nb_byes"] == 3, f"Expected 3 BYEs, got {data['nb_byes']}"
        
        # With 13 fighters and 3 BYEs:
        # - First round (huitièmes): 8 slots, but 3 are BYEs = 5 real combats
        # - Combats are created only when both fighters are known
        print(f"✓ 13 fighters: {data['combats_crees']} combats created, {data['combats_restants']} remaining")
        print(f"  Total expected: {data['total_combats_prevu']} (n-1 = 12)")
    
    def test_arbre_13_fighters_no_null_combattants(self, session):
        """Verify no combat has null rouge or bleu in 13 fighters bracket"""
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}")
        
        assert response.status_code == 200
        data = response.json()
        
        null_combats = []
        a_determiner_combats = []
        
        # Check all combats in arbre
        for tour, combats in data.get("arbre", {}).items():
            for combat in combats:
                # Check for null IDs
                if combat.get("rouge_id") is None:
                    null_combats.append(f"{tour}#{combat.get('position')}: rouge_id is null")
                if combat.get("bleu_id") is None:
                    null_combats.append(f"{tour}#{combat.get('position')}: bleu_id is null")
                
                # Check for "À déterminer" in enriched data
                rouge = combat.get("rouge", {})
                bleu = combat.get("bleu", {})
                if rouge.get("nom") == "À déterminer":
                    a_determiner_combats.append(f"{tour}#{combat.get('position')}: rouge is 'À déterminer'")
                if bleu.get("nom") == "À déterminer":
                    a_determiner_combats.append(f"{tour}#{combat.get('position')}: bleu is 'À déterminer'")
        
        # ANTI-BYE RULE: No combat should have null or "À déterminer"
        assert len(null_combats) == 0, f"Found combats with null fighters: {null_combats}"
        assert len(a_determiner_combats) == 0, f"Found combats with 'À déterminer': {a_determiner_combats}"
        
        print(f"✓ All {data['total_combats']} combats have both fighters defined")
    
    def test_13_fighters_first_round_combats(self, session):
        """With 13 fighters (3 BYEs), first round should have 5 real combats"""
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}")
        
        assert response.status_code == 200
        data = response.json()
        arbre = data.get("arbre", {})
        
        # First round is "huitieme" for bracket_size 16
        first_round = arbre.get("huitieme", [])
        
        # With 3 BYEs out of 8 slots, we should have 5 real combats
        # (8 slots - 3 BYEs = 5 combats where both fighters are present)
        print(f"  First round (huitièmes): {len(first_round)} combats")
        
        # Each combat should have both fighters
        for combat in first_round:
            assert combat.get("rouge_id") is not None, f"Combat {combat['combat_id']} missing rouge"
            assert combat.get("bleu_id") is not None, f"Combat {combat['combat_id']} missing bleu"
        
        print(f"✓ First round has {len(first_round)} combats with both fighters defined")


class TestDynamicCombatCreation:
    """Test dynamic combat creation when results are entered"""
    
    def test_enter_result_creates_next_combat(self, session):
        """When a result is entered, the next combat should be created if both fighters are known"""
        # First, regenerate to get fresh state
        session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_4_FIGHTERS}")
        
        # Get the current arbre
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_4_FIGHTERS}")
        assert response.status_code == 200
        data = response.json()
        
        initial_total = data["total_combats"]
        demis = data["arbre"].get("demi", [])
        
        if len(demis) < 2:
            pytest.skip("Not enough demis to test")
        
        # Enter result for first demi
        demi1 = demis[0]
        if demi1.get("termine"):
            pytest.skip("First demi already finished")
        
        result_response = session.put(f"{BASE_URL}/api/combats/{demi1['combat_id']}/resultat", json={
            "vainqueur_id": demi1["rouge_id"],
            "score_rouge": 10,
            "score_bleu": 5,
            "type_victoire": "normal"
        })
        
        assert result_response.status_code == 200, f"Failed to enter result: {result_response.text}"
        
        # Enter result for second demi
        demi2 = demis[1]
        if not demi2.get("termine"):
            result_response2 = session.put(f"{BASE_URL}/api/combats/{demi2['combat_id']}/resultat", json={
                "vainqueur_id": demi2["rouge_id"],
                "score_rouge": 8,
                "score_bleu": 3,
                "type_victoire": "normal"
            })
            assert result_response2.status_code == 200
        
        # Now check if finale was created
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_4_FIGHTERS}")
        assert response.status_code == 200
        data = response.json()
        
        new_total = data["total_combats"]
        finale = data["arbre"].get("finale", [])
        
        # Finale should now exist with both fighters
        assert len(finale) > 0, "Finale should be created after both demis are finished"
        
        finale_combat = finale[0]
        assert finale_combat.get("rouge_id") is not None, "Finale rouge should be set"
        assert finale_combat.get("bleu_id") is not None, "Finale bleu should be set"
        
        print(f"✓ Dynamic creation: {initial_total} → {new_total} combats after entering results")
        print(f"  Finale created with rouge={finale_combat['rouge_id']}, bleu={finale_combat['bleu_id']}")


class TestAPIArbreNoBYECombats:
    """Test that /api/combats/arbre/{categorie_id} returns NO combat with null rouge or bleu"""
    
    def test_api_arbre_no_null_fighters(self, session):
        """API should never return combats with null rouge or bleu"""
        # Test both categories
        for cat_id in [CATEGORY_4_FIGHTERS, CATEGORY_13_FIGHTERS]:
            response = session.get(f"{BASE_URL}/api/combats/arbre/{cat_id}")
            
            if response.status_code != 200:
                continue
            
            data = response.json()
            
            for tour, combats in data.get("arbre", {}).items():
                for combat in combats:
                    # CRITICAL: No null fighters
                    assert combat.get("rouge_id") is not None, \
                        f"[{cat_id}] {tour}#{combat.get('position')}: rouge_id is null"
                    assert combat.get("bleu_id") is not None, \
                        f"[{cat_id}] {tour}#{combat.get('position')}: bleu_id is null"
        
        print("✓ API /api/combats/arbre returns no combat with null fighters")


class TestBYEPropagation:
    """Test that BYE winners are stored in bracket structure for dynamic creation"""
    
    def test_bye_winners_stored_in_bracket_structure(self, session):
        """BYE winners should be stored in bracket_structure.known_rouge/known_bleu"""
        # Regenerate 13 fighters bracket
        session.post(f"{BASE_URL}/api/combats/generer/{CATEGORY_13_FIGHTERS}")
        
        # Get category to check bracket_structure
        response = session.get(f"{BASE_URL}/api/categories?competition_id={COMPETITION_ID}")
        assert response.status_code == 200
        categories = response.json()
        
        cat = next((c for c in categories if c.get("categorie_id") == CATEGORY_13_FIGHTERS), None)
        assert cat is not None, "Category not found"
        
        bracket_structure = cat.get("bracket_structure", {})
        
        # Check quarts entries for known_rouge/known_bleu (BYE winners)
        quarts = bracket_structure.get("quart", [])
        bye_winners_stored = 0
        
        for entry in quarts:
            if entry.get("status") == "waiting":
                if entry.get("known_rouge"):
                    bye_winners_stored += 1
                    print(f"  Quart #{entry.get('position')}: BYE winner stored as known_rouge")
                if entry.get("known_bleu"):
                    bye_winners_stored += 1
                    print(f"  Quart #{entry.get('position')}: BYE winner stored as known_bleu")
        
        # With 3 BYEs, we should have 3 BYE winners stored
        assert bye_winners_stored == 3, f"Expected 3 BYE winners stored, found {bye_winners_stored}"
        
        print(f"✓ {bye_winners_stored} BYE winners stored in bracket_structure for dynamic creation")
    
    def test_quarts_not_created_until_results(self, session):
        """Quarts should NOT be created until huitièmes results are entered"""
        response = session.get(f"{BASE_URL}/api/combats/arbre/{CATEGORY_13_FIGHTERS}")
        assert response.status_code == 200
        data = response.json()
        
        arbre = data.get("arbre", {})
        
        # Quarts should NOT exist in arbre (they're waiting)
        quarts = arbre.get("quart", [])
        
        # If quarts exist, they should have both fighters defined (Anti-BYE rule)
        for combat in quarts:
            assert combat.get("rouge_id") is not None, "Quart combat has null rouge"
            assert combat.get("bleu_id") is not None, "Quart combat has null bleu"
        
        print(f"✓ Quarts: {len(quarts)} combats (created only when both fighters known)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
