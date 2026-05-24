import pytest


class TestDirtyRecords:
    def test_missing_fields_detection(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-DIRTY-001",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        label_data = {
            "sample_time": "2024-01-15T10:30:00",
            "idempotency_key": "dirty-label-001"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=headers)

        response = client.get(f"/api/v1/batches/{batch_id}/dirty-records", headers=headers)
        assert response.status_code == 200
        dirty_records = response.json()
        assert len(dirty_records) > 0

        missing_field_records = [r for r in dirty_records if r["dirty_type"] == "missing_fields"]
        assert len(missing_field_records) > 0

    def test_cross_date_detection(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-DIRTY-002",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        label_data = {
            "label_code": "LABEL-CROSS",
            "sample_time": "2024-01-20T10:30:00",
            "idempotency_key": "dirty-label-002"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=headers)

        response = client.get(f"/api/v1/batches/{batch_id}/dirty-records", headers=headers)
        dirty_records = response.json()

        cross_date_records = [r for r in dirty_records if r["dirty_type"] == "cross_date"]
        assert len(cross_date_records) > 0

    def test_amount_conflict_detection(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-DIRTY-003",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        complaint_data_1 = {
            "store_name": "测试门店",
            "complaint_time": "2024-01-16T09:00:00",
            "complaint_content": "测试投诉",
            "quantity": 5,
            "amount": 100.0,
            "idempotency_key": "dirty-complaint-001"
        }
        client.post(f"/api/v1/batches/{batch_id}/store-complaints", json=complaint_data_1, headers=headers)

        complaint_data_2 = {
            "store_name": "测试门店",
            "complaint_time": "2024-01-16T09:00:00",
            "complaint_content": "测试投诉更新",
            "quantity": 5,
            "amount": 200.0,
            "idempotency_key": "dirty-complaint-001"
        }
        client.post(f"/api/v1/batches/{batch_id}/store-complaints", json=complaint_data_2, headers=headers)

        response = client.get(f"/api/v1/batches/{batch_id}/dirty-records", headers=headers)
        dirty_records = response.json()

        amount_conflict_records = [r for r in dirty_records if r["dirty_type"] == "amount_conflict"]
        assert len(amount_conflict_records) > 0

    def test_resolve_dirty_record(self, client, data_entry_token, reviewer_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-DIRTY-004",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        label_data = {
            "sample_time": "2024-01-15T10:30:00",
            "idempotency_key": "dirty-label-004"
        }
        client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=headers)

        response = client.get(f"/api/v1/batches/{batch_id}/dirty-records", headers=headers)
        dirty_records = response.json()
        record_id = dirty_records[0]["id"]

        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        resolve_data = {"processing_opinion": "已手动补充标签编号"}
        response = client.post(f"/api/v1/batches/dirty-records/{record_id}/resolve", json=resolve_data, headers=reviewer_headers)
        assert response.status_code == 200

        response = client.get(f"/api/v1/batches/{batch_id}/dirty-records?resolved=true", headers=headers)
        resolved_records = response.json()
        assert len(resolved_records) == 1
        assert resolved_records[0]["is_resolved"] == True
