import pytest
from datetime import datetime


class TestStateMachine:
    def test_batch_full_workflow(self, client, data_entry_token, reviewer_token, supervisor_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-001",
            "pot_no": "POT-A",
            "product_name": "红烧肉",
            "production_date": "2024-01-15T10:00:00",
            "affected_stores": [
                {"store_name": "朝阳门店", "store_code": "STORE-001", "quantity_received": 50},
                {"store_name": "海淀门店", "store_code": "STORE-002", "quantity_received": 30}
            ]
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        assert response.status_code == 200
        batch_id = response.json()["id"]
        assert response.json()["status"] == "created"

        label_data = {
            "label_code": "LABEL-001",
            "sample_time": "2024-01-15T10:30:00",
            "sampler": "张三",
            "idempotency_key": "label-001"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/sample-labels", json=label_data, headers=headers)
        assert response.status_code == 200

        temp_data = {
            "record_time": "2024-01-15T11:00:00",
            "temperature": 4.5,
            "measure_point": "冷藏柜",
            "idempotency_key": "temp-001"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/temperature-records", json=temp_data, headers=headers)
        assert response.status_code == 200

        complaint_data = {
            "store_name": "朝阳门店",
            "store_code": "STORE-001",
            "complaint_time": "2024-01-16T09:00:00",
            "complaint_content": "发现异味",
            "quantity": 5,
            "amount": 150.0,
            "idempotency_key": "complaint-001"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/store-complaints", json=complaint_data, headers=headers)
        assert response.status_code == 200

        response = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
        assert response.json()["status"] == "attachments_uploaded"

        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        response = client.post(f"/api/v1/batches/{batch_id}/start-review", headers=reviewer_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "reviewing"

        review_data = {
            "review_result": "通过",
            "review_comment": "材料齐全，同意通过"
        }
        response = client.post(f"/api/v1/batches/{batch_id}/review", json=review_data, headers=reviewer_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "reviewed"
        assert response.json()["review_result"] == "通过"

        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}
        response = client.post(f"/api/v1/batches/{batch_id}/settle", headers=supervisor_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "settled"

        response = client.post(f"/api/v1/batches/{batch_id}/archive", headers=supervisor_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "archived"

    def test_state_transition_invalid(self, client, data_entry_token, reviewer_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-002",
            "pot_no": "POT-B",
            "product_name": "清蒸鱼",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
        response = client.post(f"/api/v1/batches/{batch_id}/review", json={
            "review_result": "通过"
        }, headers=reviewer_headers)
        assert response.status_code == 400

    def test_freeze_unfreeze(self, client, data_entry_token, supervisor_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-003",
            "pot_no": "POT-C",
            "product_name": "宫保鸡丁",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

        freeze_data = {"reason": "需要进一步调查"}
        response = client.post(f"/api/v1/batches/{batch_id}/freeze", json=freeze_data, headers=supervisor_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "frozen"
        assert response.json()["before_freeze_status"] == "created"

        response = client.post(f"/api/v1/batches/{batch_id}/unfreeze?reason=调查完成", headers=supervisor_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "created"

    def test_withdraw(self, client, data_entry_token, supervisor_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch_data = {
            "batch_no": "BATCH-004",
            "pot_no": "POT-D",
            "product_name": "麻婆豆腐",
            "production_date": "2024-01-15T10:00:00"
        }
        response = client.post("/api/v1/batches/", json=batch_data, headers=headers)
        batch_id = response.json()["id"]

        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

        withdraw_data = {"reason": "批次信息错误"}
        response = client.post(f"/api/v1/batches/{batch_id}/withdraw", json=withdraw_data, headers=supervisor_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "withdrawn"

    def test_get_stores_by_pot(self, client, data_entry_token):
        headers = {"Authorization": f"Bearer {data_entry_token}"}

        batch1 = {
            "batch_no": "BATCH-005",
            "pot_no": "POT-SHARED",
            "product_name": "西红柿炒蛋",
            "production_date": "2024-01-15T10:00:00",
            "affected_stores": [
                {"store_name": "门店A", "store_code": "A001"},
                {"store_name": "门店B", "store_code": "A002"}
            ]
        }
        client.post("/api/v1/batches/", json=batch1, headers=headers)

        batch2 = {
            "batch_no": "BATCH-006",
            "pot_no": "POT-SHARED",
            "product_name": "西红柿炒蛋",
            "production_date": "2024-01-15T11:00:00",
            "affected_stores": [
                {"store_name": "门店B", "store_code": "A002"},
                {"store_name": "门店C", "store_code": "A003"}
            ]
        }
        client.post("/api/v1/batches/", json=batch2, headers=headers)

        response = client.get("/api/v1/batches/pot/POT-SHARED/stores", headers=headers)
        assert response.status_code == 200
        stores = response.json()
        assert len(stores) == 3
        store_codes = {s["store_code"] for s in stores}
        assert store_codes == {"A001", "A002", "A003"}
