import pytest


class TestFieldPermissions:
    def test_readonly_user_batch_detail_fields(self, client, readonly_token, data_entry_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        readonly_headers = {"Authorization": f"Bearer {readonly_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-001",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=data_headers)
        batch_id = response.json()["id"]

        response = client.get(f"/api/v1/batches/{batch_id}", headers=readonly_headers)
        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert "batch_no" in data
        assert "pot_no" in data
        assert "product_name" in data
        assert "production_date" in data
        assert "status" in data
        assert "created_at" in data
        assert "sample_labels" in data
        assert "temperature_records" in data
        assert "store_complaints" in data
        assert "affected_stores" in data

        assert "before_freeze_status" not in data
        assert "freeze_reason" not in data
        assert "reviewed_by" not in data
        assert "reviewed_at" not in data
        assert "review_result" not in data
        assert "review_comment" not in data
        assert "supervisor_comments" not in data
        assert "status_history" not in data
        assert "dirty_records" not in data
        assert "created_by" not in data
        assert "updated_at" not in data

    def test_data_entry_user_batch_detail_fields(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-002",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        response = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert "batch_no" in data
        assert "created_by" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "sample_labels" in data
        assert "temperature_records" in data
        assert "store_complaints" in data
        assert "affected_stores" in data

        assert "before_freeze_status" not in data
        assert "freeze_reason" not in data
        assert "reviewed_by" not in data
        assert "reviewed_at" not in data
        assert "review_result" not in data
        assert "review_comment" not in data
        assert "supervisor_comments" not in data
        assert "status_history" not in data
        assert "dirty_records" not in data

    def test_reviewer_user_batch_detail_fields(self, client, data_entry_token, reviewer_token, supervisor_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-003",
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

        client.post(f"/api/v1/batches/{batch_id}/start-review", headers=reviewer_headers)

        review_data = {"review_result": "通过", "review_comment": "复核通过"}
        client.post(f"/api/v1/batches/{batch_id}/review", json=review_data, headers=reviewer_headers)

        freeze_data = {"reason": "测试冻结"}
        client.post(f"/api/v1/batches/{batch_id}/freeze", json=freeze_data, headers=supervisor_headers)

        response = client.get(f"/api/v1/batches/{batch_id}", headers=reviewer_headers)
        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert "batch_no" in data
        assert "created_by" in data
        assert "reviewed_by" in data
        assert "reviewed_at" in data
        assert "review_result" in data
        assert "before_freeze_status" in data
        assert "freeze_reason" in data
        assert "status_history" in data
        assert "sample_labels" in data
        assert "temperature_records" in data
        assert "store_complaints" in data
        assert "affected_stores" in data

        assert "review_comment" not in data
        assert "supervisor_comments" not in data
        assert "dirty_records" not in data

    def test_supervisor_user_batch_detail_fields(self, client, data_entry_token, reviewer_token, supervisor_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-004",
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

        client.post(f"/api/v1/batches/{batch_id}/start-review", headers=reviewer_headers)

        review_data = {"review_result": "通过", "review_comment": "复核通过"}
        client.post(f"/api/v1/batches/{batch_id}/review", json=review_data, headers=reviewer_headers)

        freeze_data = {"reason": "测试冻结"}
        client.post(f"/api/v1/batches/{batch_id}/freeze", json=freeze_data, headers=supervisor_headers)

        comment_data = {"comment_type": "批注", "content": "主管意见"}
        client.post(f"/api/v1/batches/{batch_id}/supervisor-comments", json=comment_data, headers=supervisor_headers)

        response = client.get(f"/api/v1/batches/{batch_id}", headers=supervisor_headers)
        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert "batch_no" in data
        assert "created_by" in data
        assert "reviewed_by" in data
        assert "reviewed_at" in data
        assert "review_result" in data
        assert "review_comment" in data
        assert "before_freeze_status" in data
        assert "freeze_reason" in data
        assert "status_history" in data
        assert "supervisor_comments" in data
        assert "dirty_records" in data
        assert "sample_labels" in data
        assert "temperature_records" in data
        assert "store_complaints" in data
        assert "affected_stores" in data

    def test_readonly_user_batch_list_fields(self, client, readonly_token, data_entry_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        readonly_headers = {"Authorization": f"Bearer {readonly_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-005",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        client.post("/api/v1/batches/", json=batch_data, headers=data_headers)

        response = client.get("/api/v1/batches/", headers=readonly_headers)
        assert response.status_code == 200
        data = response.json()[0]

        assert "id" in data
        assert "batch_no" in data
        assert "pot_no" in data
        assert "product_name" in data
        assert "production_date" in data
        assert "status" in data
        assert "created_at" in data

        assert "sample_label_count" not in data
        assert "temperature_record_count" not in data
        assert "store_complaint_count" not in data
        assert "affected_store_count" not in data

    def test_data_entry_user_batch_list_fields(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-006",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        client.post("/api/v1/batches/", json=batch_data, headers=headers)

        response = client.get("/api/v1/batches/", headers=headers)
        assert response.status_code == 200
        data = response.json()[0]

        assert "id" in data
        assert "batch_no" in data
        assert "sample_label_count" in data
        assert "temperature_record_count" in data
        assert "store_complaint_count" in data

        assert "affected_store_count" not in data

    def test_reviewer_user_batch_list_fields(self, client, data_entry_token, reviewer_token):
        data_headers = {"Authorization": f"Bearer {data_entry_token}"}
        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

        batch_data = {
            "batch_no": "BATCH-PERM-007",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        client.post("/api/v1/batches/", json=batch_data, headers=data_headers)

        response = client.get("/api/v1/batches/", headers=reviewer_headers)
        assert response.status_code == 200
        data = response.json()[0]

        assert "id" in data
        assert "batch_no" in data
        assert "sample_label_count" in data
        assert "temperature_record_count" in data
        assert "store_complaint_count" in data
        assert "affected_store_count" in data
