"""
Test suite for Aires de Combat and Arbitre endpoints
Tests the new simplified Taekwondo competition management architecture
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin2@test.com"
ADMIN_PASSWORD = "admin123"
COMPETITION_ID = "comp_535694c8e8dc"

class TestSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get authentication token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        # Extract session token from cookies
        cookies = response.cookies
        return cookies
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        """Session with auth cookies"""
        session.cookies.update(auth_token)
        return session


class TestAiresCombat:
    """Tests for Aires de Combat endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_list_aires_combat(self, auth_session):
        """GET /api/aires-combat - List aires for a competition"""
        response = auth_session.get(
            f"{BASE_URL}/api/aires-combat?competition_id={COMPETITION_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} aires de combat")
        
        # Verify existing aires
        if len(data) > 0:
            aire = data[0]
            assert "aire_id" in aire
            assert "nom" in aire
            assert "numero" in aire
            assert "competition_id" in aire
            print(f"First aire: {aire['nom']} (numero: {aire['numero']})")
    
    def test_create_aire_combat(self, auth_session):
        """POST /api/aires-combat - Create a new aire de combat"""
        # Create a test aire
        test_aire = {
            "competition_id": COMPETITION_ID,
            "nom": "TEST_Aire_C",
            "numero": 99
        }
        response = auth_session.post(
            f"{BASE_URL}/api/aires-combat",
            json=test_aire
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "aire_id" in data
        assert data["nom"] == "TEST_Aire_C"
        assert data["numero"] == 99
        assert data["competition_id"] == COMPETITION_ID
        
        print(f"Created aire: {data['aire_id']}")
        
        # Store for cleanup
        self.__class__.test_aire_id = data["aire_id"]
        return data["aire_id"]
    
    def test_get_aire_combat_details(self, auth_session):
        """GET /api/aires-combat/{aire_id} - Get aire with combat info"""
        # Use existing aire
        aires_response = auth_session.get(
            f"{BASE_URL}/api/aires-combat?competition_id={COMPETITION_ID}"
        )
        aires = aires_response.json()
        
        if len(aires) > 0:
            aire_id = aires[0]["aire_id"]
            response = auth_session.get(f"{BASE_URL}/api/aires-combat/{aire_id}")
            assert response.status_code == 200
            data = response.json()
            
            assert "aire_id" in data
            assert "combat_en_cours" in data
            assert "combats_a_venir" in data
            print(f"Aire details: combat_en_cours={data['combat_en_cours']}, combats_a_venir={len(data.get('combats_a_venir', []))}")
    
    def test_delete_aire_combat(self, auth_session):
        """DELETE /api/aires-combat/{aire_id} - Delete an aire"""
        if hasattr(self.__class__, 'test_aire_id'):
            aire_id = self.__class__.test_aire_id
            response = auth_session.delete(f"{BASE_URL}/api/aires-combat/{aire_id}")
            assert response.status_code == 200
            
            # Verify deletion
            get_response = auth_session.get(f"{BASE_URL}/api/aires-combat/{aire_id}")
            assert get_response.status_code == 404
            print(f"Deleted aire: {aire_id}")


class TestRepartitionCombats:
    """Tests for combat distribution on aires"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_repartir_combats_no_aires(self, auth_session):
        """POST /api/aires-combat/repartir/{competition_id} - Error when no aires"""
        # Create a new competition without aires
        comp_response = auth_session.post(f"{BASE_URL}/api/competitions", json={
            "nom": "TEST_Competition_NoAires",
            "date": "2026-12-01",
            "lieu": "Test Lieu"
        })
        
        if comp_response.status_code == 200:
            test_comp_id = comp_response.json()["competition_id"]
            
            # Try to repartir without aires
            response = auth_session.post(
                f"{BASE_URL}/api/aires-combat/repartir/{test_comp_id}"
            )
            # Should fail because no aires configured
            assert response.status_code == 400
            assert "Aucune aire de combat configurée" in response.json().get("detail", "")
            print("Correctly rejected repartition without aires")
            
            # Cleanup
            auth_session.delete(f"{BASE_URL}/api/competitions/{test_comp_id}")
    
    def test_repartir_combats_success(self, auth_session):
        """POST /api/aires-combat/repartir/{competition_id} - Distribute combats"""
        # First check if there are combats to distribute
        combats_response = auth_session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        # Check aires exist
        aires_response = auth_session.get(
            f"{BASE_URL}/api/aires-combat?competition_id={COMPETITION_ID}"
        )
        aires = aires_response.json()
        
        if len(aires) > 0:
            response = auth_session.post(
                f"{BASE_URL}/api/aires-combat/repartir/{COMPETITION_ID}"
            )
            assert response.status_code == 200
            data = response.json()
            
            assert "message" in data
            print(f"Repartition result: {data['message']}")
            
            if "combats_reguliers" in data:
                print(f"Regular combats: {data['combats_reguliers']}, Finales: {data.get('finales', 0)}")


class TestArbitreEndpoints:
    """Tests for Arbitre view and actions"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_get_arbitre_view(self, auth_session):
        """GET /api/arbitre/aire/{aire_id} - Get arbitre view for an aire"""
        # Get existing aires
        aires_response = auth_session.get(
            f"{BASE_URL}/api/aires-combat?competition_id={COMPETITION_ID}"
        )
        aires = aires_response.json()
        
        if len(aires) > 0:
            aire_id = aires[0]["aire_id"]
            response = auth_session.get(f"{BASE_URL}/api/arbitre/aire/{aire_id}")
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert "aire" in data
            assert "combat_en_cours" in data
            assert "combats_a_venir" in data
            assert "finales_restantes" in data
            
            print(f"Arbitre view for {data['aire']['nom']}:")
            print(f"  - Combat en cours: {data['combat_en_cours']}")
            print(f"  - Combats à venir: {len(data['combats_a_venir'])}")
            print(f"  - Finales restantes: {data['finales_restantes']}")
    
    def test_get_arbitre_view_invalid_aire(self, auth_session):
        """GET /api/arbitre/aire/{aire_id} - 404 for invalid aire"""
        response = auth_session.get(f"{BASE_URL}/api/arbitre/aire/invalid_aire_id")
        assert response.status_code == 404
        print("Correctly returned 404 for invalid aire")
    
    def test_verifier_finales(self, auth_session):
        """POST /api/arbitre/verifier-finales/{competition_id} - Check if finals can start"""
        response = auth_session.post(
            f"{BASE_URL}/api/arbitre/verifier-finales/{COMPETITION_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "combats_reguliers_restants" in data
        assert "finales_total" in data
        assert "finales_terminees" in data
        assert "peut_lancer_finales" in data
        assert "message" in data
        
        print(f"Finales check: {data['message']}")
        print(f"  - Combats réguliers restants: {data['combats_reguliers_restants']}")
        print(f"  - Finales: {data['finales_terminees']}/{data['finales_total']}")


class TestCombatWorkflow:
    """Tests for the complete combat workflow: generate -> distribute -> launch -> result"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_full_workflow(self, auth_session):
        """Test complete workflow: create competition -> add competitors -> generate -> distribute -> arbitre"""
        # 1. Create test competition
        comp_response = auth_session.post(f"{BASE_URL}/api/competitions", json={
            "nom": "TEST_Workflow_Competition",
            "date": "2026-12-15",
            "lieu": "Test Gymnasium"
        })
        assert comp_response.status_code == 200
        test_comp_id = comp_response.json()["competition_id"]
        print(f"1. Created competition: {test_comp_id}")
        
        try:
            # 2. Seed categories
            seed_response = auth_session.post(
                f"{BASE_URL}/api/categories/seed/{test_comp_id}"
            )
            assert seed_response.status_code == 200
            print(f"2. Seeded categories: {seed_response.json()['total']}")
            
            # 3. Get a category for testing (Minimes Masculin)
            cats_response = auth_session.get(
                f"{BASE_URL}/api/categories?competition_id={test_comp_id}"
            )
            categories = cats_response.json()
            test_category = None
            for cat in categories:
                if "Minimes Masculin" in cat["nom"] and "-33kg" in cat["nom"]:
                    test_category = cat
                    break
            
            if not test_category:
                test_category = categories[0] if categories else None
            
            if test_category:
                print(f"3. Using category: {test_category['nom']}")
                
                # 4. Create 4 test competitors
                competitors = []
                for i in range(4):
                    comp_data = {
                        "competition_id": test_comp_id,
                        "nom": f"TEST_Nom_{i}",
                        "prenom": f"TEST_Prenom_{i}",
                        "date_naissance": "2015-06-15",  # ~10-11 years old for Minimes
                        "sexe": test_category["sexe"],
                        "poids_declare": (test_category["poids_min"] + test_category["poids_max"]) / 2,
                        "club": f"TEST_Club_{i}"
                    }
                    resp = auth_session.post(f"{BASE_URL}/api/competiteurs", json=comp_data)
                    if resp.status_code == 200:
                        competitors.append(resp.json())
                
                print(f"4. Created {len(competitors)} competitors")
                
                if len(competitors) >= 2:
                    # 5. Generate bracket
                    gen_response = auth_session.post(
                        f"{BASE_URL}/api/combats/generer/{test_category['categorie_id']}"
                    )
                    assert gen_response.status_code == 200
                    gen_data = gen_response.json()
                    print(f"5. Generated bracket: {gen_data['message']}")
                    
                    # 6. Create aire de combat
                    aire_response = auth_session.post(f"{BASE_URL}/api/aires-combat", json={
                        "competition_id": test_comp_id,
                        "nom": "TEST_Aire_1",
                        "numero": 1
                    })
                    assert aire_response.status_code == 200
                    test_aire_id = aire_response.json()["aire_id"]
                    print(f"6. Created aire: {test_aire_id}")
                    
                    # 7. Distribute combats
                    repartir_response = auth_session.post(
                        f"{BASE_URL}/api/aires-combat/repartir/{test_comp_id}"
                    )
                    assert repartir_response.status_code == 200
                    print(f"7. Distributed combats: {repartir_response.json()['message']}")
                    
                    # 8. Get arbitre view
                    arbitre_response = auth_session.get(
                        f"{BASE_URL}/api/arbitre/aire/{test_aire_id}"
                    )
                    assert arbitre_response.status_code == 200
                    arbitre_data = arbitre_response.json()
                    print(f"8. Arbitre view: {len(arbitre_data['combats_a_venir'])} combats à venir")
                    
                    # 9. Launch first combat if available
                    if arbitre_data["combats_a_venir"]:
                        first_combat = arbitre_data["combats_a_venir"][0]
                        if first_combat.get("rouge_id") and first_combat.get("bleu_id"):
                            launch_response = auth_session.post(
                                f"{BASE_URL}/api/arbitre/lancer/{first_combat['combat_id']}"
                            )
                            assert launch_response.status_code == 200
                            print(f"9. Launched combat: {first_combat['combat_id']}")
                            
                            # 10. Record result (rouge wins)
                            result_response = auth_session.post(
                                f"{BASE_URL}/api/arbitre/resultat/{first_combat['combat_id']}",
                                params={
                                    "vainqueur": "rouge",
                                    "score_rouge": 10,
                                    "score_bleu": 5,
                                    "type_victoire": "normal"
                                }
                            )
                            assert result_response.status_code == 200
                            result_data = result_response.json()
                            assert result_data["termine"] == True
                            assert result_data["statut"] == "termine"
                            print(f"10. Recorded result: rouge wins 10-5")
                            
                            # 11. Verify loser elimination (if not semi-final)
                            if first_combat["tour"] != "demi":
                                loser_id = first_combat["bleu_id"]
                                loser_response = auth_session.get(
                                    f"{BASE_URL}/api/competiteurs/{loser_id}"
                                )
                                if loser_response.status_code == 200:
                                    loser_data = loser_response.json()
                                    print(f"11. Loser elimination status: {loser_data.get('elimine', False)}")
                    
                    # 12. Verify finales status
                    finales_response = auth_session.post(
                        f"{BASE_URL}/api/arbitre/verifier-finales/{test_comp_id}"
                    )
                    assert finales_response.status_code == 200
                    print(f"12. Finales status: {finales_response.json()['message']}")
        
        finally:
            # Cleanup
            auth_session.delete(f"{BASE_URL}/api/competitions/{test_comp_id}")
            print("Cleanup: Deleted test competition")


class TestLancerCombat:
    """Tests for launching combats"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_lancer_combat_invalid_id(self, auth_session):
        """POST /api/arbitre/lancer/{combat_id} - 404 for invalid combat"""
        response = auth_session.post(f"{BASE_URL}/api/arbitre/lancer/invalid_combat_id")
        assert response.status_code == 404
        print("Correctly returned 404 for invalid combat")
    
    def test_lancer_combat_already_started(self, auth_session):
        """POST /api/arbitre/lancer/{combat_id} - Error for already started combat"""
        # Get a terminated combat
        combats_response = auth_session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        terminated = [c for c in combats if c.get("statut") == "termine"]
        if terminated:
            combat_id = terminated[0]["combat_id"]
            response = auth_session.post(f"{BASE_URL}/api/arbitre/lancer/{combat_id}")
            assert response.status_code == 400
            print("Correctly rejected launching terminated combat")


class TestResultatCombat:
    """Tests for recording combat results"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return s
    
    def test_resultat_invalid_combat(self, auth_session):
        """POST /api/arbitre/resultat/{combat_id} - 404 for invalid combat"""
        response = auth_session.post(
            f"{BASE_URL}/api/arbitre/resultat/invalid_combat_id",
            params={"vainqueur": "rouge"}
        )
        assert response.status_code == 404
        print("Correctly returned 404 for invalid combat")
    
    def test_resultat_invalid_vainqueur(self, auth_session):
        """POST /api/arbitre/resultat/{combat_id} - Error for invalid winner"""
        # Get any combat
        combats_response = auth_session.get(
            f"{BASE_URL}/api/combats?competition_id={COMPETITION_ID}"
        )
        combats = combats_response.json()
        
        if combats:
            combat_id = combats[0]["combat_id"]
            response = auth_session.post(
                f"{BASE_URL}/api/arbitre/resultat/{combat_id}",
                params={"vainqueur": "invalid"}
            )
            # Should fail with 400 (invalid vainqueur) or 400 (combat not en_cours)
            assert response.status_code == 400
            print("Correctly rejected invalid vainqueur value")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
