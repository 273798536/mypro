import pytest
from tests.conftest import get_token


class TestDuplicateSubmission:
    def test_cannot_modify_approved_receipt(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_DUP_001",
                "material_name": "测试素材",
                "platform": "抖音",
                "report_date": "2024-01-20T00:00:00",
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

        update_response = client.put(
            f"/api/v1/receipts/{receipt_id}",
            json={"material_name": "修改后的名称"},
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert update_response.status_code == 400
        assert "不允许修改" in update_response.json()["detail"]

    def test_duplicate_submit(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_DUP_002",
                "material_name": "测试素材",
                "platform": "抖音",
                "report_date": "2024-01-21T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )

        second_submit = client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert second_submit.status_code == 400


class TestBadData:
    def test_missing_fields_detection(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_BAD_001",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert receipt_response.status_code == 201
        receipt_id = receipt_response.json()["id"]
        assert receipt_response.json()["has_dirty"] == True

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt_id}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert dirty_response.status_code == 200
        dirty_records = dirty_response.json()
        assert len(dirty_records) > 0
        missing_fields = [dr for dr in dirty_records if dr["dirty_type"] == "missing_field"]
        assert len(missing_fields) > 0

    def test_negative_cost_detection(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_BAD_002",
                "material_name": "测试负数花费",
                "platform": "抖音",
                "report_date": "2024-01-22T00:00:00",
                "daily_cost": -100.0,
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert receipt_response.status_code == 201
        receipt_id = receipt_response.json()["id"]
        assert receipt_response.json()["has_dirty"] == True

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt_id}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        dirty_records = dirty_response.json()
        amount_conflicts = [dr for dr in dirty_records if dr["dirty_type"] == "amount_conflict"]
        assert len(amount_conflicts) > 0

    def test_negative_quantity_detection(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_BAD_003",
                "material_name": "测试负数曝光",
                "platform": "抖音",
                "report_date": "2024-01-23T00:00:00",
                "daily_impressions": -5000,
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert receipt_response.json()["has_dirty"] == True

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt_response.json()['id']}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        dirty_records = dirty_response.json()
        quantity_conflicts = [dr for dr in dirty_records if dr["dirty_type"] == "quantity_conflict"]
        assert len(quantity_conflicts) > 0

    def test_name_change_detection(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_SAME_ID",
                "material_name": "原始名称",
                "platform": "抖音",
                "report_date": "2024-01-24T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )

        receipt2_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_SAME_ID",
                "material_name": "修改后名称",
                "platform": "抖音",
                "report_date": "2024-01-25T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert receipt2_response.json()["has_dirty"] == True

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt2_response.json()['id']}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        dirty_records = dirty_response.json()
        name_changes = [dr for dr in dirty_records if dr["dirty_type"] == "name_changed"]
        assert len(name_changes) > 0

    def test_fix_dirty_record(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_FIX_001",
                "daily_cost": -50.0,
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt_id}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        dirty_records = dirty_response.json()
        dirty_id = dirty_records[0]["id"]

        fix_response = client.post(
            f"/api/v1/receipts/{receipt_id}/dirty-records/{dirty_id}/fix",
            json={
                "fix_note": "修正负数花费，改为正数",
                "updates": {"daily_cost": 50.0}
            },
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert fix_response.status_code == 200
        assert fix_response.json()["is_fixed"] == True


class TestPermissionControl:
    def test_viewer_cannot_create(self, client, test_users):
        viewer_token = get_token(client, "test_viewer")

        response = client.post(
            "/api/v1/receipts/batches",
            json={"name": "测试批次"},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_data_entry_cannot_freeze(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_PERM_001",
                "material_name": "权限测试",
                "platform": "抖音",
                "report_date": "2024-01-26T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )

        freeze_response = client.post(
            f"/api/v1/receipts/{receipt_id}/freeze",
            json={"freeze_reason": "测试冻结"},
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert freeze_response.status_code == 403

    def test_reviewer_cannot_settle(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "MATERIAL_PERM_002",
                "material_name": "权限测试2",
                "platform": "抖音",
                "report_date": "2024-01-27T00:00:00",
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

        settle_response = client.post(
            f"/api/v1/receipts/{receipt_id}/settle",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert settle_response.status_code == 403
