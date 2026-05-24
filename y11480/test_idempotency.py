import pytest


class TestIdempotency:
    def test_sample_label_idempotency(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-IDEM-001",
            "pot_no": "POT-1",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        label_data = {
            "label_code": "LABEL-IDEM-001",
            "sample_time": "2024-01-15T10:30:00",
            "sampler": "张三",
            "idempotency_key": "unique-label-key-001"
        }

        response1 = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=headers)
        assert response1.status_code == 200
        label_id_1 = response1.json()["id"]

        response2 = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=headers)
        assert response2.status_code == 200
        label_id_2 = response2.json()["id"]

        assert label_id_1 == label_id_2

        response = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
        assert len(response.json()["sample_labels"]) == 1

    def test_temperature_record_idempotency(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-IDEM-002",
            "pot_no": "POT-2",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        temp_data = {
            "record_time": "2024-01-15T11:00:00",
            "temperature": 5.0,
            "idempotency_key": "unique-temp-key-001"
        }

        response1 = client.post(f"/api/v1/batches/{batch_id}/temperature-records", json=temp_data, headers=headers)
        temp_id_1 = response1.json()["id"]

        response2 = client.post(f"/api/v1/batches/{batch_id}/temperature-records", json=temp_data, headers=headers)
        temp_id_2 = response2.json()["id"]

        assert temp_id_1 == temp_id_2

    def test_store_complaint_idempotency_with_update(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-IDEM-003",
            "pot_no": "POT-3",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        complaint_data_1 = {
            "store_name": "测试门店",
            "complaint_time": "2024-01-16T09:00:00",
            "complaint_content": "初始投诉",
            "quantity": 5,
            "amount": 100.0,
            "idempotency_key": "unique-complaint-key-001"
        }

        response1 = client.post(f"/api/v1/batches/{batch_id}/store-complaints", json=complaint_data_1, headers=headers)
        assert response1.json()["complaint_content"] == "初始投诉"
        assert response1.json()["amount"] == 100.0

        complaint_data_2 = {
            "store_name": "测试门店",
            "complaint_time": "2024-01-16T09:00:00",
            "complaint_content": "更新后的投诉内容",
            "quantity": 10,
            "amount": 200.0,
            "idempotency_key": "unique-complaint-key-001"
        }

        response2 = client.post(f"/api/v1/batches/{batch_id}/store-complaints", json=complaint_data_2, headers=headers)
        assert response2.json()["complaint_content"] == "更新后的投诉内容"
        assert response2.json()["amount"] == 200.0
        assert response2.json()["quantity"] == 10

        assert response1.json()["id"] == response2.json()["id"]

        response = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
        assert len(response.json()["store_complaints"]) == 1

    def test_different_keys_create_different_records(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-IDEM-004",
            "pot_no": "POT-4",
            "product_name": "测试产品",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        label_data_1 = {
            "label_code": "LABEL-1",
            "sample_time": "2024-01-15T10:30:00",
            "idempotency_key": "key-1"
        }
        label_data_2 = {
            "label_code": "LABEL-2",
            "sample_time": "2024-01-15T11:30:00",
            "idempotency_key": "key-2"
        }

        response1 = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data_1, headers=headers)
        response2 = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data_2, headers=headers)

        assert response1.json()["id"] != response2.json()["id"]

        response = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
        assert len(response.json()["sample_labels"]) == 2
