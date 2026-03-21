"""
Test suite for Combat Manuel module - Phase 1 Backend
Tests all endpoints for manual combat creation, modification, connection, and distribution.

Endpoints tested:
- POST /api/combats-manuels - Create manual combat
- PUT /api/combats-manuels/{combat_id} - Update manual combat
- DELETE /api/combats-manuels/{combat_id} - Delete manual combat
- POST /api/combats-manuels/connecter - Connect combats
- POST /api/combats-manuels/deconnecter - Disconnect combats
- GET /api/combats-manuels/prets/{competition_id} - List ready combats
- GET /api/combats-manuels/non-assignes/{competition_id} - List unassigned combats
- POST /api/combats-manuels/assigner-aire - Assign combat to area
- POST /api/combats-manuels/distribution-auto/{competition_id} - Auto-distribute combats
- GET /api/combats-manuels/arbre/{categorie_id} - Get combat tree with connections
- PUT /api/combats/{combat_id}/resultat - Winner propagation via manual connections
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data from the request
COMPETITION_ID = "comp_52f906b963d6"
CATEGORIE_ID = "cat_f84e40525807"
AIRE_ID = "aire_ffc3ae90d351"

# Admin credentials
ADMIN_EMAIL = "admin2@test.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def session():
    """Create a requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    """Get authentication token for admin user"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        # Extract session token from cookies
        cookies = response.cookies
        session.cookies.update(cookies)
        return response.json()
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def test_competiteurs(session, auth_token):
    """Create test competitors for the tests"""
    competiteurs = []
    
    # Create 4 test competitors
    for i in range(4):
        data = {
            "competition_id": COMPETITION_ID,
            "nom": f"TEST_Combattant_{uuid.uuid4().hex[:6]}",
            "prenom": f"Test{i+1}",
            "date_naissance": "2010-01-15",
            "sexe": "M",
            "poids_declare": 35.0 + i,
            "club": "Test Club"
        }
        response = session.post(f"{BASE_URL}/api/competiteurs", json=data)
        if response.status_code in [200, 201]:
            competiteurs.append(response.json())
    
    yield competiteurs
    
    # Cleanup: Delete test competitors
    for comp in competiteurs:
        try:
            session.delete(f"{BASE_URL}/api/competiteurs/{comp['competiteur_id']}")
        except:
            pass


@pytest.fixture(scope="module")
def test_combat_manuel(session, auth_token, test_competiteurs):
    """Create a test manual combat"""
    if len(test_competiteurs) < 2:
        pytest.skip("Not enough test competitors")
    
    data = {
        "competition_id": COMPETITION_ID,
        "categorie_id": CATEGORIE_ID,
        "tour": "manuel",
        "position": 1,
        "rouge_id": test_competiteurs[0]["competiteur_id"],
        "bleu_id": test_competiteurs[1]["competiteur_id"],
        "nom_personnalise": "Test Combat Manuel"
    }
    response = session.post(f"{BASE_URL}/api/combats-manuels", json=data)
    
    if response.status_code in [200, 201]:
        combat = response.json()
        yield combat
        # Cleanup
        try:
            session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")
        except:
            pass
    else:
        pytest.skip(f"Failed to create test combat: {response.status_code} - {response.text}")


class TestCombatManuelCreate:
    """Tests for POST /api/combats-manuels - Create manual combat"""
    
    def test_create_combat_manuel_with_competitors(self, session, auth_token, test_competiteurs):
        """Test creating a manual combat with both competitors defined"""
        if len(test_competiteurs) < 2:
            pytest.skip("Not enough test competitors")
        
        data = {
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"],
            "nom_personnalise": "Test Demi-Finale"
        }
        
        response = session.post(f"{BASE_URL}/api/combats-manuels", json=data)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        combat = response.json()
        assert combat["mode_creation"] == "manuel"
        assert combat["rouge_id"] == test_competiteurs[0]["competiteur_id"]
        assert combat["bleu_id"] == test_competiteurs[1]["competiteur_id"]
        assert combat["pret"] == True  # Both competitors defined
        assert combat["nom_personnalise"] == "Test Demi-Finale"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")
    
    def test_create_combat_manuel_without_competitors(self, session, auth_token):
        """Test creating a manual combat without competitors (for later connection)"""
        data = {
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "finale",
            "position": 1,
            "nom_personnalise": "Finale à connecter"
        }
        
        response = session.post(f"{BASE_URL}/api/combats-manuels", json=data)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        combat = response.json()
        assert combat["mode_creation"] == "manuel"
        assert combat["rouge_id"] is None
        assert combat["bleu_id"] is None
        assert combat["pret"] == False  # No competitors
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")
    
    def test_create_combat_manuel_invalid_competition(self, session, auth_token):
        """Test creating combat with non-existent competition"""
        data = {
            "competition_id": "comp_nonexistent",
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 1
        }
        
        response = session.post(f"{BASE_URL}/api/combats-manuels", json=data)
        assert response.status_code == 404
    
    def test_create_combat_manuel_invalid_categorie(self, session, auth_token):
        """Test creating combat with non-existent category"""
        data = {
            "competition_id": COMPETITION_ID,
            "categorie_id": "cat_nonexistent",
            "tour": "manuel",
            "position": 1
        }
        
        response = session.post(f"{BASE_URL}/api/combats-manuels", json=data)
        assert response.status_code == 404


class TestCombatManuelUpdate:
    """Tests for PUT /api/combats-manuels/{combat_id} - Update manual combat"""
    
    def test_update_combat_manuel_tour(self, session, auth_token, test_combat_manuel):
        """Test updating combat tour"""
        data = {"tour": "quart"}
        
        response = session.put(
            f"{BASE_URL}/api/combats-manuels/{test_combat_manuel['combat_id']}", 
            json=data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated = response.json()
        assert updated["tour"] == "quart"
    
    def test_update_combat_manuel_nom_personnalise(self, session, auth_token, test_combat_manuel):
        """Test updating custom name"""
        data = {"nom_personnalise": "Nouveau Nom Combat"}
        
        response = session.put(
            f"{BASE_URL}/api/combats-manuels/{test_combat_manuel['combat_id']}", 
            json=data
        )
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["nom_personnalise"] == "Nouveau Nom Combat"
    
    def test_update_combat_manuel_change_competitor(self, session, auth_token, test_combat_manuel, test_competiteurs):
        """Test changing a competitor"""
        if len(test_competiteurs) < 3:
            pytest.skip("Not enough test competitors")
        
        data = {"rouge_id": test_competiteurs[2]["competiteur_id"]}
        
        response = session.put(
            f"{BASE_URL}/api/combats-manuels/{test_combat_manuel['combat_id']}", 
            json=data
        )
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["rouge_id"] == test_competiteurs[2]["competiteur_id"]
    
    def test_update_combat_manuel_remove_competitor(self, session, auth_token, test_combat_manuel):
        """Test removing a competitor by setting empty string"""
        data = {"bleu_id": ""}
        
        response = session.put(
            f"{BASE_URL}/api/combats-manuels/{test_combat_manuel['combat_id']}", 
            json=data
        )
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["bleu_id"] is None
        assert updated["pret"] == False  # No longer ready
    
    def test_update_combat_manuel_nonexistent(self, session, auth_token):
        """Test updating non-existent combat"""
        data = {"tour": "finale"}
        
        response = session.put(f"{BASE_URL}/api/combats-manuels/cbt_nonexistent", json=data)
        assert response.status_code == 404


class TestCombatManuelDelete:
    """Tests for DELETE /api/combats-manuels/{combat_id} - Delete manual combat"""
    
    def test_delete_combat_manuel(self, session, auth_token, test_competiteurs):
        """Test deleting a manual combat"""
        # Create a combat to delete
        data = {
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 99,
            "nom_personnalise": "Combat à supprimer"
        }
        create_response = session.post(f"{BASE_URL}/api/combats-manuels", json=data)
        assert create_response.status_code in [200, 201]
        combat = create_response.json()
        
        # Delete it
        response = session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = session.get(f"{BASE_URL}/api/combats/{combat['combat_id']}")
        assert get_response.status_code == 404
    
    def test_delete_combat_manuel_nonexistent(self, session, auth_token):
        """Test deleting non-existent combat"""
        response = session.delete(f"{BASE_URL}/api/combats-manuels/cbt_nonexistent")
        assert response.status_code == 404


class TestCombatConnexion:
    """Tests for combat connection endpoints"""
    
    def test_connecter_combats(self, session, auth_token, test_competiteurs):
        """Test connecting two combats"""
        if len(test_competiteurs) < 4:
            pytest.skip("Not enough test competitors")
        
        # Create source combat
        source_data = {
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"]
        }
        source_response = session.post(f"{BASE_URL}/api/combats-manuels", json=source_data)
        assert source_response.status_code in [200, 201]
        source_combat = source_response.json()
        
        # Create destination combat (finale)
        dest_data = {
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "finale",
            "position": 1
        }
        dest_response = session.post(f"{BASE_URL}/api/combats-manuels", json=dest_data)
        assert dest_response.status_code in [200, 201]
        dest_combat = dest_response.json()
        
        # Connect them
        connect_data = {
            "combat_source_id": source_combat["combat_id"],
            "combat_destination_id": dest_combat["combat_id"],
            "slot_destination": "rouge"
        }
        response = session.post(f"{BASE_URL}/api/combats-manuels/connecter", json=connect_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result["source"] == source_combat["combat_id"]
        assert result["destination"] == dest_combat["combat_id"]
        assert result["slot"] == "rouge"
        
        # Verify source combat has connection info
        source_updated = session.get(f"{BASE_URL}/api/combats/{source_combat['combat_id']}").json()
        assert source_updated["combat_suivant_id"] == dest_combat["combat_id"]
        assert source_updated["combat_suivant_slot"] == "rouge"
        
        # Verify destination has source info
        dest_updated = session.get(f"{BASE_URL}/api/combats/{dest_combat['combat_id']}").json()
        assert dest_updated["combat_source_rouge_id"] == source_combat["combat_id"]
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{source_combat['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{dest_combat['combat_id']}")
    
    def test_connecter_combats_invalid_slot(self, session, auth_token, test_competiteurs):
        """Test connecting with invalid slot"""
        # Create two combats
        combat1 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 1
        }).json()
        
        combat2 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 2
        }).json()
        
        # Try invalid slot
        response = session.post(f"{BASE_URL}/api/combats-manuels/connecter", json={
            "combat_source_id": combat1["combat_id"],
            "combat_destination_id": combat2["combat_id"],
            "slot_destination": "invalid"
        })
        assert response.status_code == 400
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat1['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat2['combat_id']}")
    
    def test_deconnecter_combat(self, session, auth_token, test_competiteurs):
        """Test disconnecting combats"""
        # Create and connect two combats
        combat1 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 1
        }).json()
        
        combat2 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "finale",
            "position": 1
        }).json()
        
        # Connect
        session.post(f"{BASE_URL}/api/combats-manuels/connecter", json={
            "combat_source_id": combat1["combat_id"],
            "combat_destination_id": combat2["combat_id"],
            "slot_destination": "bleu"
        })
        
        # Disconnect
        response = session.post(f"{BASE_URL}/api/combats-manuels/deconnecter", json={
            "combat_destination_id": combat2["combat_id"],
            "slot": "bleu"
        })
        assert response.status_code == 200
        
        # Verify disconnection
        combat1_updated = session.get(f"{BASE_URL}/api/combats/{combat1['combat_id']}").json()
        assert combat1_updated.get("combat_suivant_id") is None
        
        combat2_updated = session.get(f"{BASE_URL}/api/combats/{combat2['combat_id']}").json()
        assert combat2_updated.get("combat_source_bleu_id") is None
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat1['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat2['combat_id']}")


class TestCombatsPrets:
    """Tests for GET /api/combats-manuels/prets/{competition_id}"""
    
    def test_get_combats_prets(self, session, auth_token, test_combat_manuel):
        """Test getting ready combats"""
        response = session.get(f"{BASE_URL}/api/combats-manuels/prets/{COMPETITION_ID}")
        assert response.status_code == 200
        
        combats = response.json()
        assert isinstance(combats, list)
        
        # All returned combats should be ready
        for combat in combats:
            assert combat.get("pret") == True
            assert combat.get("termine") == False
    
    def test_get_combats_prets_invalid_competition(self, session, auth_token):
        """Test getting ready combats for non-existent competition - returns empty list for admin"""
        response = session.get(f"{BASE_URL}/api/combats-manuels/prets/comp_nonexistent")
        # Admin users can access any competition, so returns 200 with empty list
        assert response.status_code == 200
        assert response.json() == []


class TestCombatsNonAssignes:
    """Tests for GET /api/combats-manuels/non-assignes/{competition_id}"""
    
    def test_get_combats_non_assignes(self, session, auth_token, test_competiteurs):
        """Test getting unassigned combats"""
        # Create a combat without aire
        combat = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"]
        }).json()
        
        response = session.get(f"{BASE_URL}/api/combats-manuels/non-assignes/{COMPETITION_ID}")
        assert response.status_code == 200
        
        combats = response.json()
        assert isinstance(combats, list)
        
        # All returned combats should have no aire
        for c in combats:
            assert c.get("aire_id") is None or c.get("aire_id") == ""
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")


class TestAssignerAire:
    """Tests for POST /api/combats-manuels/assigner-aire"""
    
    def test_assigner_combat_aire(self, session, auth_token, test_competiteurs):
        """Test assigning a combat to an area"""
        # Create a combat
        combat = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"]
        }).json()
        
        # Assign to aire
        response = session.post(f"{BASE_URL}/api/combats-manuels/assigner-aire", json={
            "combat_id": combat["combat_id"],
            "aire_id": AIRE_ID
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated = response.json()
        assert updated["aire_id"] == AIRE_ID
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")
    
    def test_assigner_combat_aire_invalid_combat(self, session, auth_token):
        """Test assigning non-existent combat"""
        response = session.post(f"{BASE_URL}/api/combats-manuels/assigner-aire", json={
            "combat_id": "cbt_nonexistent",
            "aire_id": AIRE_ID
        })
        assert response.status_code == 404
    
    def test_assigner_combat_aire_invalid_aire(self, session, auth_token, test_competiteurs):
        """Test assigning to non-existent area"""
        combat = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 1
        }).json()
        
        response = session.post(f"{BASE_URL}/api/combats-manuels/assigner-aire", json={
            "combat_id": combat["combat_id"],
            "aire_id": "aire_nonexistent"
        })
        assert response.status_code == 404
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")


class TestDistributionAuto:
    """Tests for POST /api/combats-manuels/distribution-auto/{competition_id}"""
    
    def test_distribution_auto(self, session, auth_token, test_competiteurs):
        """Test automatic distribution of combats to areas"""
        # Create multiple ready combats without aire
        combats = []
        for i in range(3):
            if i * 2 + 1 < len(test_competiteurs):
                combat = session.post(f"{BASE_URL}/api/combats-manuels", json={
                    "competition_id": COMPETITION_ID,
                    "categorie_id": CATEGORIE_ID,
                    "tour": "manuel",
                    "position": i + 10,
                    "rouge_id": test_competiteurs[0]["competiteur_id"],
                    "bleu_id": test_competiteurs[1]["competiteur_id"]
                }).json()
                combats.append(combat)
        
        # Run auto distribution
        response = session.post(f"{BASE_URL}/api/combats-manuels/distribution-auto/{COMPETITION_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "distribues" in result
        assert "aires" in result
        
        # Cleanup
        for combat in combats:
            session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")


class TestArbreManuel:
    """Tests for GET /api/combats-manuels/arbre/{categorie_id}"""
    
    def test_get_arbre_manuel(self, session, auth_token, test_combat_manuel):
        """Test getting combat tree with connections"""
        response = session.get(f"{BASE_URL}/api/combats-manuels/arbre/{CATEGORIE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "categorie" in data
        assert "arbre" in data
        assert "connexions" in data
        assert "total_combats" in data
        assert "combats_termines" in data
        assert "combats_prets" in data
        
        # Arbre should be organized by tour
        assert isinstance(data["arbre"], dict)
        assert isinstance(data["connexions"], list)
    
    def test_get_arbre_manuel_with_connections(self, session, auth_token, test_competiteurs):
        """Test combat tree includes connection information"""
        # Create connected combats
        combat1 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"]
        }).json()
        
        combat2 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "finale",
            "position": 1
        }).json()
        
        # Connect them
        session.post(f"{BASE_URL}/api/combats-manuels/connecter", json={
            "combat_source_id": combat1["combat_id"],
            "combat_destination_id": combat2["combat_id"],
            "slot_destination": "rouge"
        })
        
        # Get tree
        response = session.get(f"{BASE_URL}/api/combats-manuels/arbre/{CATEGORIE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should have at least one connection
        connexions = data["connexions"]
        found_connection = any(
            c["source_id"] == combat1["combat_id"] and 
            c["destination_id"] == combat2["combat_id"]
            for c in connexions
        )
        assert found_connection, "Connection should be in the tree"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat1['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat2['combat_id']}")


class TestPropagationVainqueur:
    """Tests for winner propagation via manual connections"""
    
    def test_propagation_vainqueur_manuel(self, session, auth_token, test_competiteurs):
        """Test that winner is propagated through manual connection"""
        if len(test_competiteurs) < 2:
            pytest.skip("Not enough test competitors")
        
        # Create source combat with competitors
        source = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"]
        }).json()
        
        # Create destination combat (finale)
        dest = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "finale",
            "position": 1
        }).json()
        
        # Connect: winner of source goes to rouge slot of dest
        session.post(f"{BASE_URL}/api/combats-manuels/connecter", json={
            "combat_source_id": source["combat_id"],
            "combat_destination_id": dest["combat_id"],
            "slot_destination": "rouge"
        })
        
        # Record result for source combat (rouge wins)
        vainqueur_id = test_competiteurs[0]["competiteur_id"]
        result_response = session.put(f"{BASE_URL}/api/combats/{source['combat_id']}/resultat", json={
            "vainqueur_id": vainqueur_id,
            "score_rouge": 10,
            "score_bleu": 5,
            "type_victoire": "normal"
        })
        assert result_response.status_code == 200, f"Expected 200, got {result_response.status_code}: {result_response.text}"
        
        # Verify winner was propagated to destination
        dest_updated = session.get(f"{BASE_URL}/api/combats/{dest['combat_id']}").json()
        assert dest_updated["rouge_id"] == vainqueur_id, "Winner should be propagated to rouge slot"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{source['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{dest['combat_id']}")


class TestEdgeCases:
    """Edge case tests"""
    
    def test_cannot_modify_finished_combat(self, session, auth_token, test_competiteurs):
        """Test that finished combats cannot be modified"""
        # Create and finish a combat
        combat = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "manuel",
            "position": 1,
            "rouge_id": test_competiteurs[0]["competiteur_id"],
            "bleu_id": test_competiteurs[1]["competiteur_id"]
        }).json()
        
        # Finish the combat
        session.put(f"{BASE_URL}/api/combats/{combat['combat_id']}/resultat", json={
            "vainqueur_id": test_competiteurs[0]["competiteur_id"],
            "score_rouge": 10,
            "score_bleu": 5,
            "type_victoire": "normal"
        })
        
        # Try to modify
        response = session.put(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}", json={
            "tour": "finale"
        })
        assert response.status_code == 400, "Should not be able to modify finished combat"
        
        # Try to delete
        delete_response = session.delete(f"{BASE_URL}/api/combats-manuels/{combat['combat_id']}")
        assert delete_response.status_code == 400, "Should not be able to delete finished combat"
    
    def test_slot_already_connected(self, session, auth_token, test_competiteurs):
        """Test that connecting to an already connected slot fails"""
        # Create 3 combats
        combat1 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 1
        }).json()
        
        combat2 = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "demi",
            "position": 2
        }).json()
        
        finale = session.post(f"{BASE_URL}/api/combats-manuels", json={
            "competition_id": COMPETITION_ID,
            "categorie_id": CATEGORIE_ID,
            "tour": "finale",
            "position": 1
        }).json()
        
        # Connect combat1 to finale rouge slot
        session.post(f"{BASE_URL}/api/combats-manuels/connecter", json={
            "combat_source_id": combat1["combat_id"],
            "combat_destination_id": finale["combat_id"],
            "slot_destination": "rouge"
        })
        
        # Try to connect combat2 to same slot
        response = session.post(f"{BASE_URL}/api/combats-manuels/connecter", json={
            "combat_source_id": combat2["combat_id"],
            "combat_destination_id": finale["combat_id"],
            "slot_destination": "rouge"
        })
        assert response.status_code == 400, "Should not be able to connect to already connected slot"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat1['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{combat2['combat_id']}")
        session.delete(f"{BASE_URL}/api/combats-manuels/{finale['combat_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
