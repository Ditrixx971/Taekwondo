#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TaekwondoNewFeaturesAPITester:
    def __init__(self, base_url="https://fight-manager-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.session_token = "sess_279e2dc10e144621a3724855fce7f8fb"  # Provided session token
        self.existing_category_id = "cat_553398c2d5bd"  # Provided category with 8 combats
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Set up session with token
        self.session.cookies.set('session_token', self.session_token)

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            'name': name,
            'success': success,
            'details': details,
            'response_data': response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200, params: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Make API request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers, params=params, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_auth_verification(self):
        """Test that our session token works"""
        success, response = self.make_request('GET', 'auth/me', None, 200)
        
        if success and 'user_id' in response:
            self.log_test("Auth Verification", True, f"Authenticated as: {response.get('name', 'Unknown')}")
            return True
        else:
            self.log_test("Auth Verification", False, f"Failed: {response}", response)
            return False

    def test_combats_suivre_basic(self):
        """Test GET /api/combats/suivre - basic functionality"""
        success, response = self.make_request('GET', 'combats/suivre', None, 200)
        
        if success and isinstance(response, list):
            self.log_test("Combats Suivre - Basic", True, f"Retrieved {len(response)} combats")
            return response
        else:
            self.log_test("Combats Suivre - Basic", False, f"Failed: {response}", response)
            return []

    def test_combats_suivre_with_filters(self):
        """Test GET /api/combats/suivre with filters"""
        # Test with category filter
        params = {"categorie_id": self.existing_category_id}
        success, response = self.make_request('GET', 'combats/suivre', None, 200, params)
        
        if success and isinstance(response, list):
            # Check if response has enriched data
            enriched = False
            if len(response) > 0:
                combat = response[0]
                enriched = all(key in combat for key in ['rouge_nom', 'bleu_nom', 'categorie_nom', 'tatami_nom'])
            
            self.log_test("Combats Suivre - Filters & Enrichment", enriched, 
                         f"Retrieved {len(response)} combats, enriched: {enriched}")
            return response
        else:
            self.log_test("Combats Suivre - Filters & Enrichment", False, f"Failed: {response}", response)
            return []

    def test_combats_arbre(self):
        """Test GET /api/combats/arbre/{categorie_id}"""
        success, response = self.make_request('GET', f'combats/arbre/{self.existing_category_id}', None, 200)
        
        if success and 'arbre' in response and 'categorie' in response:
            arbre = response['arbre']
            has_structure = isinstance(arbre, dict) and any(tour in arbre for tour in ['quart', 'demi', 'bronze', 'finale'])
            
            self.log_test("Combats Arbre", has_structure, 
                         f"Retrieved combat tree with {response.get('total_combats', 0)} total combats")
            return response
        else:
            self.log_test("Combats Arbre", False, f"Failed: {response}", response)
            return None

    def test_planifier_combats(self):
        """Test POST /api/combats/planifier/{categorie_id}"""
        planification_data = {
            "heure_debut_competition": "09:00",
            "duree_combat_minutes": 6,
            "pauses": [{"apres_combat": 4, "duree_minutes": 15}]
        }
        
        success, response = self.make_request('POST', f'combats/planifier/{self.existing_category_id}', 
                                            planification_data, 200)
        
        if success and 'message' in response:
            self.log_test("Planifier Combats", True, 
                         f"Scheduled combats: {response.get('message', '')}")
            return True
        else:
            self.log_test("Planifier Combats", False, f"Failed: {response}", response)
            return False

    def test_modifier_statut_combat(self):
        """Test PUT /api/combats/{combat_id}/statut"""
        # First get a combat to modify
        combats = self.test_combats_suivre_basic()
        if not combats:
            self.log_test("Modifier Statut Combat", False, "No combats available to test")
            return False
        
        combat_id = combats[0]['combat_id']
        params = {"statut": "en_cours"}
        
        success, response = self.make_request('PUT', f'combats/{combat_id}/statut', None, 200, params)
        
        if success and 'message' in response:
            self.log_test("Modifier Statut Combat", True, f"Status changed: {response.get('message', '')}")
            return True
        else:
            self.log_test("Modifier Statut Combat", False, f"Failed: {response}", response)
            return False

    def test_lancer_categorie(self):
        """Test POST /api/combats/lancer-categorie/{categorie_id}"""
        params = {"mode": "complet"}
        
        success, response = self.make_request('POST', f'combats/lancer-categorie/{self.existing_category_id}', 
                                            {}, 200, params)
        
        if success and 'message' in response:
            self.log_test("Lancer Catégorie", True, f"Category launched: {response.get('message', '')}")
            return True
        else:
            self.log_test("Lancer Catégorie", False, f"Failed: {response}", response)
            return False

    def test_lancer_finales(self):
        """Test POST /api/combats/lancer-finales"""
        success, response = self.make_request('POST', 'combats/lancer-finales', {}, 200)
        
        if success and 'message' in response:
            self.log_test("Lancer Finales", True, f"Finals launched: {response.get('message', '')}")
            return True
        else:
            self.log_test("Lancer Finales", False, f"Failed: {response}", response)
            return False

    def test_categories_and_tatamis_exist(self):
        """Test that we have categories and tatamis for the frontend tests"""
        # Test categories
        success, categories = self.make_request('GET', 'categories', None, 200)
        if success and isinstance(categories, list) and len(categories) > 0:
            self.log_test("Categories Available", True, f"Found {len(categories)} categories")
        else:
            self.log_test("Categories Available", False, "No categories found")
            
        # Test tatamis
        success, tatamis = self.make_request('GET', 'tatamis', None, 200)
        if success and isinstance(tatamis, list) and len(tatamis) > 0:
            self.log_test("Tatamis Available", True, f"Found {len(tatamis)} tatamis")
        else:
            self.log_test("Tatamis Available", False, "No tatamis found")

    def run_new_features_test_suite(self):
        """Run test suite for new combat management features"""
        print("🥋 Testing New Taekwondo Combat Management Features")
        print("=" * 60)
        
        # Authentication verification
        print("\n📋 Authentication Verification")
        if not self.test_auth_verification():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test data availability
        print("\n📋 Test Data Verification")
        self.test_categories_and_tatamis_exist()
        
        # New features tests
        print("\n📋 New Combat Management Features")
        
        # Test combats suivre endpoint
        self.test_combats_suivre_basic()
        self.test_combats_suivre_with_filters()
        
        # Test arbre endpoint
        self.test_combats_arbre()
        
        # Test planification
        self.test_planifier_combats()
        
        # Test status modification
        self.test_modifier_statut_combat()
        
        # Test launching features
        self.test_lancer_categorie()
        self.test_lancer_finales()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All new features tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = TaekwondoNewFeaturesAPITester()
    
    try:
        success = tester.run_new_features_test_suite()
        
        # Save detailed results
        results = {
            "timestamp": datetime.now().isoformat(),
            "test_type": "new_combat_features",
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            "test_details": tester.test_results
        }
        
        with open('/app/backend_test_new_features_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())