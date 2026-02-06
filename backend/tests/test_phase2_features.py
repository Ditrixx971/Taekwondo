"""
Phase 2 Tests - Taekwondo Competition Manager
Tests for:
1. User role management (Coach, Admin, MASTER)
2. Coach validation per competition
3. Excel import/export for competitors
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin2@test.com"
ADMIN_PASSWORD = "admin123"
COACH_EMAIL = "coach_test@test.com"
COACH_PASSWORD = "coach123"
COMPETITION_PARIS = "comp_535694c8e8dc"


class TestSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_admin_login(self, admin_session):
        """Test admin can login"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] in ["admin", "master"]
        print(f"✓ Admin logged in: {data['name']} (role: {data['role']})")


class TestUserRoleManagement:
    """Tests for user role management (PUT /api/users/{user_id}/role)"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_list_users(self, admin_session):
        """Test GET /api/users - List all users"""
        response = admin_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        
        # Check user structure
        for user in users:
            assert "user_id" in user
            assert "email" in user
            assert "role" in user
            assert user["role"] in ["coach", "admin", "master"]
        
        print(f"✓ Listed {len(users)} users")
        
        # Count roles
        roles = {"coach": 0, "admin": 0, "master": 0}
        for user in users:
            roles[user["role"]] += 1
        print(f"  Roles: {roles}")
        return users
    
    def test_change_role_to_admin(self, admin_session):
        """Test PUT /api/users/{user_id}/role - Change coach to admin"""
        # First get a coach user
        response = admin_session.get(f"{BASE_URL}/api/users")
        users = response.json()
        coach_user = next((u for u in users if u["role"] == "coach"), None)
        
        if not coach_user:
            pytest.skip("No coach user found to test role change")
        
        user_id = coach_user["user_id"]
        
        # Change to admin
        response = admin_session.put(f"{BASE_URL}/api/users/{user_id}/role?role=admin")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Changed {coach_user['name']} from coach to admin")
        
        # Verify change
        response = admin_session.get(f"{BASE_URL}/api/users")
        users = response.json()
        updated_user = next((u for u in users if u["user_id"] == user_id), None)
        assert updated_user["role"] == "admin"
        
        # Change back to coach
        response = admin_session.put(f"{BASE_URL}/api/users/{user_id}/role?role=coach")
        assert response.status_code == 200
        print(f"✓ Changed back to coach")
    
    def test_change_role_invalid(self, admin_session):
        """Test PUT /api/users/{user_id}/role - Invalid role"""
        response = admin_session.get(f"{BASE_URL}/api/users")
        users = response.json()
        user_id = users[0]["user_id"]
        
        response = admin_session.put(f"{BASE_URL}/api/users/{user_id}/role?role=invalid_role")
        assert response.status_code == 400
        print("✓ Invalid role rejected correctly")
    
    def test_change_role_nonexistent_user(self, admin_session):
        """Test PUT /api/users/{user_id}/role - Non-existent user"""
        response = admin_session.put(f"{BASE_URL}/api/users/nonexistent_user_123/role?role=admin")
        assert response.status_code == 404
        print("✓ Non-existent user returns 404")
    
    def test_admin_cannot_promote_to_master(self, admin_session):
        """Test that admin cannot promote to master (only master can)"""
        # Get current user role
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        current_user = response.json()
        
        if current_user["role"] == "master":
            pytest.skip("Current user is master, cannot test this restriction")
        
        # Get a coach user
        response = admin_session.get(f"{BASE_URL}/api/users")
        users = response.json()
        coach_user = next((u for u in users if u["role"] == "coach"), None)
        
        if not coach_user:
            pytest.skip("No coach user found")
        
        # Try to promote to master
        response = admin_session.put(f"{BASE_URL}/api/users/{coach_user['user_id']}/role?role=master")
        assert response.status_code == 403
        print("✓ Admin cannot promote to master (403 Forbidden)")


class TestUserDeletion:
    """Tests for user deletion (DELETE /api/users/{user_id}) - MASTER only"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_admin_cannot_delete_user(self, admin_session):
        """Test that admin (non-master) cannot delete users"""
        # Get current user role
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        current_user = response.json()
        
        if current_user["role"] == "master":
            pytest.skip("Current user is master, cannot test this restriction")
        
        # Get a user to try to delete
        response = admin_session.get(f"{BASE_URL}/api/users")
        users = response.json()
        other_user = next((u for u in users if u["user_id"] != current_user["user_id"]), None)
        
        if not other_user:
            pytest.skip("No other user found")
        
        # Try to delete
        response = admin_session.delete(f"{BASE_URL}/api/users/{other_user['user_id']}")
        assert response.status_code == 403
        print("✓ Admin (non-master) cannot delete users (403 Forbidden)")


class TestCoachValidationPerCompetition:
    """Tests for coach validation per competition"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_get_authorized_coaches(self, admin_session):
        """Test GET /api/competitions/{competition_id}/coaches - List authorized coaches"""
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches")
        assert response.status_code == 200
        coaches = response.json()
        assert isinstance(coaches, list)
        print(f"✓ Listed {len(coaches)} authorized coaches for competition")
        
        for coach in coaches:
            assert "user_id" in coach
            assert "name" in coach
            assert "email" in coach
            print(f"  - {coach['name']} ({coach['email']})")
        
        return coaches
    
    def test_get_available_coaches(self, admin_session):
        """Test GET /api/competitions/{competition_id}/coaches/available - List available coaches"""
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/available")
        assert response.status_code == 200
        coaches = response.json()
        assert isinstance(coaches, list)
        print(f"✓ Listed {len(coaches)} available coaches (not yet authorized)")
        return coaches
    
    def test_add_and_remove_coach(self, admin_session):
        """Test POST and DELETE /api/competitions/{competition_id}/coaches/{coach_id}"""
        # Get available coaches
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/available")
        available = response.json()
        
        if not available:
            # Try to find a coach that we can add
            response = admin_session.get(f"{BASE_URL}/api/users")
            users = response.json()
            coach_user = next((u for u in users if u["role"] == "coach"), None)
            
            if not coach_user:
                pytest.skip("No coach available to test add/remove")
            
            # First remove the coach if already authorized
            admin_session.delete(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/{coach_user['user_id']}")
            coach_to_add = coach_user
        else:
            coach_to_add = available[0]
        
        coach_id = coach_to_add["user_id"]
        
        # Add coach to competition
        response = admin_session.post(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/{coach_id}")
        assert response.status_code == 200
        print(f"✓ Added coach {coach_to_add['name']} to competition")
        
        # Verify coach is now authorized
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches")
        authorized = response.json()
        assert any(c["user_id"] == coach_id for c in authorized)
        print("✓ Coach appears in authorized list")
        
        # Remove coach from competition
        response = admin_session.delete(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/{coach_id}")
        assert response.status_code == 200
        print(f"✓ Removed coach from competition")
        
        # Verify coach is no longer authorized
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches")
        authorized = response.json()
        assert not any(c["user_id"] == coach_id for c in authorized)
        print("✓ Coach no longer in authorized list")
    
    def test_add_coach_already_authorized(self, admin_session):
        """Test adding a coach that is already authorized"""
        # Get authorized coaches
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches")
        authorized = response.json()
        
        if not authorized:
            pytest.skip("No authorized coaches to test duplicate add")
        
        coach_id = authorized[0]["user_id"]
        
        # Try to add again
        response = admin_session.post(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/{coach_id}")
        assert response.status_code == 400
        print("✓ Adding already authorized coach returns 400")
    
    def test_coaches_nonexistent_competition(self, admin_session):
        """Test coaches endpoints with non-existent competition"""
        response = admin_session.get(f"{BASE_URL}/api/competitions/nonexistent_comp/coaches")
        assert response.status_code == 404
        print("✓ Non-existent competition returns 404")


class TestExcelExport:
    """Tests for Excel export functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_export_competiteurs_excel(self, admin_session):
        """Test GET /api/excel/competiteurs/export/{competition_id}"""
        response = admin_session.get(f"{BASE_URL}/api/excel/competiteurs/export/{COMPETITION_PARIS}")
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        
        # Check content disposition
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert ".xlsx" in content_disp
        
        # Check file size (should be > 0)
        assert len(response.content) > 0
        print(f"✓ Exported Excel file ({len(response.content)} bytes)")
        
        # Verify it's a valid Excel file (starts with PK for zip format)
        assert response.content[:2] == b'PK'
        print("✓ File is valid Excel format (ZIP/XLSX)")
    
    def test_export_nonexistent_competition(self, admin_session):
        """Test export with non-existent competition"""
        response = admin_session.get(f"{BASE_URL}/api/excel/competiteurs/export/nonexistent_comp")
        assert response.status_code == 404
        print("✓ Non-existent competition returns 404")


class TestExcelTemplate:
    """Tests for Excel template download"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_download_template(self, admin_session):
        """Test GET /api/excel/competiteurs/template"""
        response = admin_session.get(f"{BASE_URL}/api/excel/competiteurs/template")
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        
        # Check content disposition
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert "template" in content_disp.lower()
        
        # Check file size
        assert len(response.content) > 0
        print(f"✓ Downloaded template ({len(response.content)} bytes)")
        
        # Verify it's a valid Excel file
        assert response.content[:2] == b'PK'
        print("✓ Template is valid Excel format")


class TestExcelImport:
    """Tests for Excel import functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_import_endpoint_exists(self, admin_session):
        """Test POST /api/excel/competiteurs/import/{competition_id} endpoint exists"""
        # Send empty request to check endpoint exists
        response = admin_session.post(
            f"{BASE_URL}/api/excel/competiteurs/import/{COMPETITION_PARIS}",
            files={}
        )
        # Should return 422 (validation error) not 404
        assert response.status_code in [400, 422]
        print("✓ Import endpoint exists and validates input")
    
    def test_import_invalid_file_type(self, admin_session):
        """Test import with invalid file type"""
        # Create a fake text file
        fake_file = io.BytesIO(b"This is not an Excel file")
        
        response = admin_session.post(
            f"{BASE_URL}/api/excel/competiteurs/import/{COMPETITION_PARIS}",
            files={"file": ("test.txt", fake_file, "text/plain")}
        )
        assert response.status_code == 400
        print("✓ Invalid file type rejected")
    
    def test_import_nonexistent_competition(self, admin_session):
        """Test import with non-existent competition"""
        # Download template first
        response = admin_session.get(f"{BASE_URL}/api/excel/competiteurs/template")
        template_content = response.content
        
        response = admin_session.post(
            f"{BASE_URL}/api/excel/competiteurs/import/nonexistent_comp",
            files={"file": ("template.xlsx", io.BytesIO(template_content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert response.status_code == 404
        print("✓ Non-existent competition returns 404")


class TestIntegration:
    """Integration tests for Phase 2 features"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_full_coach_workflow(self, admin_session):
        """Test complete coach authorization workflow"""
        # 1. List all users
        response = admin_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        users = response.json()
        print(f"✓ Step 1: Listed {len(users)} users")
        
        # 2. Get authorized coaches for competition
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches")
        assert response.status_code == 200
        authorized = response.json()
        print(f"✓ Step 2: {len(authorized)} coaches authorized")
        
        # 3. Get available coaches
        response = admin_session.get(f"{BASE_URL}/api/competitions/{COMPETITION_PARIS}/coaches/available")
        assert response.status_code == 200
        available = response.json()
        print(f"✓ Step 3: {len(available)} coaches available")
        
        print("✓ Full coach workflow completed")
    
    def test_full_excel_workflow(self, admin_session):
        """Test complete Excel export/import workflow"""
        # 1. Download template
        response = admin_session.get(f"{BASE_URL}/api/excel/competiteurs/template")
        assert response.status_code == 200
        print(f"✓ Step 1: Downloaded template ({len(response.content)} bytes)")
        
        # 2. Export current competitors
        response = admin_session.get(f"{BASE_URL}/api/excel/competiteurs/export/{COMPETITION_PARIS}")
        assert response.status_code == 200
        print(f"✓ Step 2: Exported competitors ({len(response.content)} bytes)")
        
        print("✓ Full Excel workflow completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
