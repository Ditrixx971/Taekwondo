#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TaekwondoAPITester:
    def __init__(self, base_url="https://fight-manager-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()  # Use session to handle cookies
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_ids = {
            'users': [],
            'categories': [],
            'competiteurs': [],
            'tatamis': [],
            'combats': []
        }

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

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers, timeout=10)
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

    def test_auth_register(self):
        """Test user registration"""
        timestamp = int(datetime.now().timestamp())
        test_data = {
            "email": f"admin{timestamp}@test.com",
            "password": "admin123",
            "name": f"Admin Test {timestamp}",
            "role": "admin"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_data, 200)
        
        if success and 'user_id' in response:
            self.user_data = response
            self.created_ids['users'].append(response['user_id'])
            self.log_test("Auth Register (Admin)", True, f"Created user: {response['email']}")
            return True
        else:
            self.log_test("Auth Register (Admin)", False, f"Failed: {response}", response)
            return False

    def test_auth_login(self):
        """Test user login"""
        if not self.user_data:
            self.log_test("Auth Login", False, "No user data from registration")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'user_id' in response:
            self.log_test("Auth Login", True, f"Logged in as: {response['email']}")
            return True
        else:
            self.log_test("Auth Login", False, f"Failed: {response}", response)
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', 'auth/me', None, 200)
        
        if success and 'user_id' in response:
            self.log_test("Auth Me", True, f"User: {response.get('name', 'Unknown')}")
            return True
        else:
            self.log_test("Auth Me", False, f"Failed: {response}", response)
            return False

    def test_create_category(self):
        """Test creating a category"""
        category_data = {
            "nom": "Cadets -55kg Masculin",
            "age_min": 14,
            "age_max": 17,
            "sexe": "M",
            "poids_min": 50.0,
            "poids_max": 55.0
        }
        
        success, response = self.make_request('POST', 'categories', category_data, 200)
        
        if success and 'categorie_id' in response:
            self.created_ids['categories'].append(response['categorie_id'])
            self.log_test("Create Category", True, f"Created: {response['nom']}")
            return response['categorie_id']
        else:
            self.log_test("Create Category", False, f"Failed: {response}", response)
            return None

    def test_list_categories(self):
        """Test listing categories"""
        success, response = self.make_request('GET', 'categories', None, 200)
        
        if success and isinstance(response, list):
            self.log_test("List Categories", True, f"Found {len(response)} categories")
            return True
        else:
            self.log_test("List Categories", False, f"Failed: {response}", response)
            return False

    def test_create_competiteur(self, category_id: str = None):
        """Test creating a competitor"""
        competiteur_data = {
            "nom": "Dupont",
            "prenom": "Jean",
            "date_naissance": "2008-05-15",
            "sexe": "M",
            "poids": 52.5,
            "club": "Dojang Test"
        }
        
        success, response = self.make_request('POST', 'competiteurs', competiteur_data, 200)
        
        if success and 'competiteur_id' in response:
            self.created_ids['competiteurs'].append(response['competiteur_id'])
            self.log_test("Create Competiteur", True, f"Created: {response['prenom']} {response['nom']}")
            return response['competiteur_id']
        else:
            self.log_test("Create Competiteur", False, f"Failed: {response}", response)
            return None

    def test_list_competiteurs(self):
        """Test listing competitors"""
        success, response = self.make_request('GET', 'competiteurs', None, 200)
        
        if success and isinstance(response, list):
            self.log_test("List Competiteurs", True, f"Found {len(response)} competitors")
            return True
        else:
            self.log_test("List Competiteurs", False, f"Failed: {response}", response)
            return False

    def test_create_tatami(self):
        """Test creating a tatami"""
        tatami_data = {
            "nom": "Tatami Central",
            "numero": 1
        }
        
        success, response = self.make_request('POST', 'tatamis', tatami_data, 200)
        
        if success and 'tatami_id' in response:
            self.created_ids['tatamis'].append(response['tatami_id'])
            self.log_test("Create Tatami", True, f"Created: {response['nom']}")
            return response['tatami_id']
        else:
            self.log_test("Create Tatami", False, f"Failed: {response}", response)
            return None

    def test_generate_bracket(self, category_id: str, tatami_id: str = None):
        """Test generating combat bracket"""
        url = f"combats/generer/{category_id}"
        if tatami_id:
            url += f"?tatami_id={tatami_id}"
            
        success, response = self.make_request('POST', url, {}, 200)
        
        if success and 'combats' in response:
            combats = response['combats']
            for combat in combats:
                self.created_ids['combats'].append(combat['combat_id'])
            self.log_test("Generate Bracket", True, f"Generated {len(combats)} combats")
            return combats
        else:
            self.log_test("Generate Bracket", False, f"Failed: {response}", response)
            return []

    def test_list_combats(self, category_id: str = None):
        """Test listing combats"""
        endpoint = "combats"
        if category_id:
            endpoint += f"?categorie_id={category_id}"
            
        success, response = self.make_request('GET', endpoint, None, 200)
        
        if success and isinstance(response, list):
            self.log_test("List Combats", True, f"Found {len(response)} combats")
            return response
        else:
            self.log_test("List Combats", False, f"Failed: {response}", response)
            return []

    def test_enter_result(self, combat_id: str, winner_id: str):
        """Test entering combat result"""
        result_data = {
            "vainqueur_id": winner_id,
            "score_rouge": 5,
            "score_bleu": 3,
            "type_victoire": "normal"
        }
        
        success, response = self.make_request('PUT', f'combats/{combat_id}/resultat', result_data, 200)
        
        if success and 'vainqueur_id' in response:
            self.log_test("Enter Combat Result", True, f"Result entered for combat {combat_id}")
            return True
        else:
            self.log_test("Enter Combat Result", False, f"Failed: {response}", response)
            return False

    def test_stats(self):
        """Test getting stats"""
        success, response = self.make_request('GET', 'stats', None, 200)
        
        if success and 'competiteurs' in response:
            self.log_test("Get Stats", True, f"Stats: {response}")
            return True
        else:
            self.log_test("Get Stats", False, f"Failed: {response}", response)
            return False

    def test_protected_routes_without_auth(self):
        """Test that protected routes require authentication"""
        # Create a new session without cookies
        temp_session = requests.Session()
        
        url = f"{self.api_url}/competiteurs"
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = temp_session.get(url, headers=headers, timeout=10)
            success = response.status_code == 401
        except:
            success = False
        
        if success:
            self.log_test("Protected Routes (No Auth)", True, "Correctly returned 401")
            return True
        else:
            self.log_test("Protected Routes (No Auth)", False, f"Should return 401, got {response.status_code}")
            return False

    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🥋 Starting Taekwondo Competition API Tests")
        print("=" * 50)
        
        # Authentication tests
        print("\n📋 Authentication Tests")
        if not self.test_auth_register():
            print("❌ Registration failed - stopping tests")
            return False
            
        if not self.test_auth_login():
            print("❌ Login failed - stopping tests")
            return False
            
        if not self.test_auth_me():
            print("❌ Auth verification failed")
            
        # Test protected routes without auth
        self.test_protected_routes_without_auth()
        
        # Core functionality tests
        print("\n📋 Core Functionality Tests")
        
        # Categories
        category_id = self.test_create_category()
        self.test_list_categories()
        
        # Competitors
        if category_id:
            # Create multiple competitors for bracket generation
            comp_ids = []
            for i in range(4):  # Create 4 competitors for a proper bracket
                comp_data = {
                    "nom": f"Fighter{i+1}",
                    "prenom": f"Test",
                    "date_naissance": "2008-05-15",
                    "sexe": "M",
                    "poids": 52.0 + i * 0.5,
                    "club": f"Club{i+1}"
                }
                success, response = self.make_request('POST', 'competiteurs', comp_data, 200)
                if success and 'competiteur_id' in response:
                    comp_ids.append(response['competiteur_id'])
                    self.created_ids['competiteurs'].append(response['competiteur_id'])
            
            self.log_test("Create Multiple Competiteurs", len(comp_ids) == 4, f"Created {len(comp_ids)}/4 competitors")
        
        self.test_list_competiteurs()
        
        # Tatamis
        tatami_id = self.test_create_tatami()
        
        # Combats
        if category_id and len(self.created_ids['competiteurs']) >= 2:
            combats = self.test_generate_bracket(category_id, tatami_id)
            self.test_list_combats(category_id)
            
            # Test entering results
            if combats and len(combats) > 0:
                first_combat = combats[0]
                if first_combat.get('rouge_id') and first_combat.get('bleu_id'):
                    self.test_enter_result(first_combat['combat_id'], first_combat['rouge_id'])
        
        # Stats
        self.test_stats()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = TaekwondoAPITester()
    
    try:
        success = tester.run_full_test_suite()
        
        # Save detailed results
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            "test_details": tester.test_results,
            "created_test_data": tester.created_ids
        }
        
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())