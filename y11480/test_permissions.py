import pytest


class TestPermissions:
    def test_readonly_cannot_create_batch(self, client):
        headers = {"Authorization": "Bearer invalid_token"}
        batch_data = {
            "batch_no": "BATCH-PERM-001",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        assert response.status_code == 401

    def test_data_entry_can_create_batch(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-002",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        assert response.status_code == 200

    def test_data_entry_cannot_settle_batch(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-003",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        response = client.post(f"/api/v1/batches/{batch_id}/settle", headers=headers)
        assert response.status_code == 403

    def test_reviewer_cannot_freeze_batch(self, client, data_entry_token, reviewer_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-004",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=data_headers)
        batch_id = response.json()["id"]

        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        freeze_data = {"reason": "测试冻结"}
        response = client.post(f"/api/v1/batches/{batch_id}/freeze", json=freeze_data, headers=reviewer_headers)
        assert response.status_code == 403

    def test_supervisor_can_freeze_batch(self, client, data_entry_token, supervisor_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-005",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=data_headers)
        batch_id = response.json()["id"]

        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}
        freeze_data = {"reason": "测试冻结"}
        response = client.post(f"/api/v1/batches/{batch_id}/freeze", json=freeze_data, headers=supervisor_headers)
        assert response.status_code == 200

    def test_reviewer_can_review(self, client, data_entry_token, reviewer_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-006",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=data_headers)
        batch_id = response.json()["id"]

        label_data = {
            "label_code": "LABEL-001",
            "sample_time": "2024-01-15T10:30:00",
            "idempotency_key": "label-001"
        }
        client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=data_headers)

        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        response = client.post(f"/api/v1/batches/{batch_id}/start-review", headers=reviewer_headers)
        assert response.status_code == 200

    def test_data_entry_cannot_add_supervisor_comment(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-007",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        comment_data = {
            "comment_type": "批注",
            "content": "主管意见"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/supervisor-comments", json=comment_data, headers=headers)
        assert response.status_code == 403

    def test_supervisor_can_add_comment(self, client, data_entry_token, supervisor_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        batch_data = {
            "batch_no": "BATCH-PERM-008",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=data_headers)
        batch_id = response.json()["id"]

        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}
        comment_data = {
            "comment_type": "批注",
            "content": "主管意见"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/supervisor-comments", json=comment_data, headers=supervisor_headers)
        assert response.status_code == 200
