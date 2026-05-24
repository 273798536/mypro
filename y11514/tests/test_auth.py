import pytest
from tests.conftest import get_token


class TestAuthentication:
    def test_login_success(self, client):
        response = client.post(
            "/token",
            data={"username": "admin", "password": "admin123"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"

    def test_login_failure_wrong_password(self, client):
        response = client.post(
            "/token",
            data={"username": "admin", "password": "wrong"}
        )
        assert response.status_code == 401

    def test_login_failure_nonexistent_user(self, client):
        response = client.post(
            "/token",
            data={"username": "nonexistent", "password": "admin123"}
        )
        assert response.status_code == 401

    def test_get_current_user(self, client):
        token = get_token(client, "admin", "admin123")
        response = client.get(
            "/users/me/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["username"] == "admin"

    def test_no_token_access(self, client):
        response = client.get("/users/me/")
        assert response.status_code == 401


class TestRolePermissions:
    def test_data_entry_can_create_borrow_app(self, client):
        token = get_token(client, "entry", "123456")
        response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "TEST001",
                "reader_name": "张三",
                "reader_id": "123456",
                "book_title": "Python编程",
                "lending_library": "北大图书馆",
                "borrowing_library": "清华图书馆"
            }
        )
        assert response.status_code == 200

    def test_readonly_cannot_create_borrow_app(self, client):
        token = get_token(client, "readonly", "123456")
        response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "TEST001",
                "reader_name": "张三",
                "reader_id": "123456",
                "book_title": "Python编程",
                "lending_library": "北大图书馆",
                "borrowing_library": "清华图书馆"
            }
        )
        assert response.status_code == 403

    def test_reviewer_can_reject(self, client):
        entry_token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "application_no": "TEST002",
                "reader_name": "张三",
                "reader_id": "123456",
                "book_title": "Python编程",
                "lending_library": "北大图书馆",
                "borrowing_library": "清华图书馆"
            }
        )
        app_id = create_response.json()["id"]
        
        client.post(
            f"/borrow-applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {entry_token}"}
        )
        
        review_token = get_token(client, "review", "123456")
        response = client.post(
            f"/borrow-applications/{app_id}/reject?reason=信息不完整",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        assert response.status_code == 200

    def test_data_entry_cannot_reject(self, client):
        entry_token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "application_no": "TEST003",
                "reader_name": "张三",
                "reader_id": "123456",
                "book_title": "Python编程",
                "lending_library": "北大图书馆",
                "borrowing_library": "清华图书馆"
            }
        )
        app_id = create_response.json()["id"]
        
        response = client.post(
            f"/borrow-applications/{app_id}/reject?reason=信息不完整",
            headers={"Authorization": f"Bearer {entry_token}"}
        )
        assert response.status_code == 403

    def test_readonly_can_view(self, client):
        token = get_token(client, "readonly", "123456")
        response = client.get(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
