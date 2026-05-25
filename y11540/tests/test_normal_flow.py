import pytest
from datetime import datetime
from tests.conftest import get_token


class TestNormalFlow:
    def test_health_check(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_authentication(self, client, test_users):
        for role in ["supervisor", "reviewer", "data_entry", "viewer"]:
            token = get_token(client, f"test_{role}")
            assert token is not None
            
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            assert response.json()["role"] == role

    def test_create_batch_and_receipts(self, client, test_users):
        token = get_token(client, "test_data_entry")
        
        batch_response = client.post(
            "/api/v1/receipts/batches",
            json={"name": "测试批次", "description": "这是一个测试批次"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert batch_response.status_code == 201
        batch_data = batch_response.json()
        assert batch_data["name"] == "测试批次"
        batch_id = batch_data["id"]

        receipt_data = {
            "material_id": "MATERIAL_001",
            "material_name": "测试素材1",
            "platform": "抖音",
            "review_result": "通过",
            "daily_cost": 1500.0,
            "daily_impressions": 100000,
            "daily_clicks": 5000,
            "secondary_confirmation": "确认无误",
            "report_date": "2024-01-15T00:00:00",
            "cost_amount": 1500.0,
            "batch_id": batch_id
        }
        
        receipt_response = client.post(
            "/api/v1/receipts",
            json=receipt_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert receipt_response.status_code == 201
        receipt = receipt_response.json()
        assert receipt["material_id"] == "MATERIAL_001"
        assert receipt["status"] == "draft"
        receipt_id = receipt["id"]

        response = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["receipt_no"] == receipt["receipt_no"]

    def test_full_workflow(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")
        supervisor_token = get_token(client, "test_supervisor")

        receipt_data = {
            "material_id": "MATERIAL_002",
            "material_name": "测试素材2",
            "platform": "快手",
            "review_result": "通过",
            "daily_cost": 2000.0,
            "report_date": "2024-01-16T00:00:00",
        }
        receipt_response = client.post(
            "/api/v1/receipts",
            json=receipt_data,
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert receipt_response.status_code == 201
        receipt_id = receipt_response.json()["id"]

        submit_response = client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert submit_response.status_code == 200
        assert submit_response.json()["status"] == "submitted"

        review_response = client.post(
            f"/api/v1/receipts/{receipt_id}/start-review",
            json={"reason": "开始复核"},
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert review_response.status_code == 200
        assert review_response.json()["status"] == "reviewing"

        approve_response = client.post(
            f"/api/v1/receipts/{receipt_id}/approve",
            json={"reason": "复核通过，数据无误", "review_remark": "检查通过"},
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert approve_response.status_code == 200
        assert approve_response.json()["status"] == "approved"

        freeze_response = client.post(
            f"/api/v1/receipts/{receipt_id}/freeze",
            json={"freeze_reason": "待核对花费数据"},
            headers={"Authorization": f"Bearer {supervisor_token}"}
        )
        assert freeze_response.status_code == 200
        assert freeze_response.json()["status"] == "frozen"
        assert freeze_response.json()["freeze_reason"] == "待核对花费数据"

        unfreeze_response = client.post(
            f"/api/v1/receipts/{receipt_id}/unfreeze?target_status=approved",
            headers={"Authorization": f"Bearer {supervisor_token}"}
        )
        assert unfreeze_response.status_code == 200
        assert unfreeze_response.json()["status"] == "approved"

        settle_response = client.post(
            f"/api/v1/receipts/{receipt_id}/settle",
            headers={"Authorization": f"Bearer {supervisor_token}"}
        )
        assert settle_response.status_code == 200
        assert settle_response.json()["status"] == "settled"

        archive_response = client.post(
            f"/api/v1/receipts/{receipt_id}/archive",
            headers={"Authorization": f"Bearer {supervisor_token}"}
        )
        assert archive_response.status_code == 200
        assert archive_response.json()["status"] == "archived"

    def test_status_history_and_audit_logs(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_003",
                "material_name": "测试素材3",
                "platform": "微信",
                "report_date": "2024-01-17T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        client.post(
            f"/api/v1/receipts/{receipt_id}/start-review",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        client.post(
            f"/api/v1/receipts/{receipt_id}/approve",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )

        history_response = client.get(
            f"/api/v1/receipts/{receipt_id}/status-history",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert history_response.status_code == 200
        history = history_response.json()
        assert len(history) >= 3

        audit_response = client.get(
            f"/api/v1/receipts/{receipt_id}/audit-logs",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert audit_response.status_code == 200
        audit_logs = audit_response.json()
        assert len(audit_logs) >= 3

    def test_supervisor_view(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        supervisor_token = get_token(client, "test_supervisor")

        for i in range(3):
            client.post(
                "/api/v1/receipts",
                json={
                    "material_id": f"MATERIAL_SV_{i}",
                    "material_name": f"主管视图测试{i}",
                    "platform": "抖音",
                    "report_date": f"2024-01-{15 + i}T00:00:00",
                    "daily_cost": 1000.0 * (i + 1),
                },
                headers={"Authorization": f"Bearer {data_entry_token}"}
            )

        view_response = client.get(
            "/api/v1/receipts/supervisor/view",
            headers={"Authorization": f"Bearer {supervisor_token}"}
        )
        assert view_response.status_code == 200
        view_data = view_response.json()
        assert view_data["total"] == 3
        assert len(view_data["items"]) == 3
        assert "freeze_reason" in view_data["items"][0]
        assert "prev_status" in view_data["items"][0]

    def test_audit_logs_for_batch_and_receipt_creation(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        batch_response = client.post(
            "/api/v1/receipts/batches",
            json={"name": "审计测试批次"},
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        batch_id = batch_response.json()["id"]

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "AUDIT_TEST_001",
                "material_name": "审计测试素材",
                "platform": "抖音",
                "report_date": "2024-01-20T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        audit_response = client.get(
            f"/api/v1/receipts/{receipt_id}/audit-logs",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        audit_logs = audit_response.json()
        
        create_actions = [log for log in audit_logs if log["action"] == "create"]
        assert len(create_actions) >= 1
