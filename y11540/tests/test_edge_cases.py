import pytest
from tests.conftest import get_token


class TestFieldVisibility:
    def test_viewer_cannot_see_sensitive_fields(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        viewer_token = get_token(client, "test_viewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "VISIBILITY_TEST_001",
                "material_name": "可见性测试素材",
                "platform": "抖音",
                "review_result": "通过",
                "daily_cost": 1500.0,
                "daily_impressions": 100000,
                "daily_clicks": 5000,
                "secondary_confirmation": "确认无误",
                "report_date": "2024-01-20T00:00:00",
                "cost_amount": 1500.0,
                "review_comment": "审核通过",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        viewer_response = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        viewer_data = viewer_response.json()

        assert "review_result" not in viewer_data
        assert "daily_cost" not in viewer_data
        assert "daily_impressions" not in viewer_data
        assert "daily_clicks" not in viewer_data
        assert "secondary_confirmation" not in viewer_data
        assert "review_comment" not in viewer_data
        assert "cost_amount" not in viewer_data

        assert "material_id" in viewer_data
        assert "material_name" in viewer_data
        assert "platform" in viewer_data
        assert "report_date" in viewer_data
        assert "status" in viewer_data
        assert "has_dirty" in viewer_data

    def test_data_entry_can_see_cost_fields(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "VISIBILITY_TEST_002",
                "material_name": "录入员可见性测试",
                "platform": "抖音",
                "daily_cost": 2000.0,
                "report_date": "2024-01-21T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        response = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        data = response.json()

        assert "daily_cost" in data
        assert "secondary_confirmation" in data

        assert "review_comment" not in data
        assert "raw_data" not in data
        assert "freeze_reason" not in data

    def test_reviewer_can_see_review_fields(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "VISIBILITY_TEST_003",
                "material_name": "复核员可见性测试",
                "platform": "抖音",
                "daily_cost": 2000.0,
                "review_comment": "审核备注",
                "report_date": "2024-01-22T00:00:00",
                "raw_data": {"key": "value"},
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        response = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        data = response.json()

        assert "review_comment" in data
        assert "raw_data" in data

        assert "freeze_reason" not in data
        assert "prev_status" not in data

    def test_supervisor_can_see_all_fields(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        supervisor_token = get_token(client, "test_supervisor")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "VISIBILITY_TEST_004",
                "material_name": "主管可见性测试",
                "platform": "抖音",
                "daily_cost": 2000.0,
                "review_comment": "审核备注",
                "report_date": "2024-01-23T00:00:00",
                "raw_data": {"key": "value"},
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        response = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {supervisor_token}"}
        )
        data = response.json()

        assert "freeze_reason" in data
        assert "prev_status" in data
        assert "dirty_types" in data
        assert "created_by" in data


class TestDirtyFixFlow:
    def test_fix_negative_cost_actually_cleans(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "DIRTY_FIX_001",
                "material_name": "脏数据修复测试",
                "platform": "抖音",
                "report_date": "2024-01-24T00:00:00",
                "daily_cost": -100.0,
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]
        assert receipt_response.json()["has_dirty"] == True

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt_id}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        dirty_records = dirty_response.json()
        dirty_id = dirty_records[0]["id"]

        fix_response = client.post(
            f"/api/v1/receipts/{receipt_id}/dirty-records/{dirty_id}/fix",
            json={
                "fix_note": "将负数花费改为正数",
                "updates": {"daily_cost": 100.0}
            },
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert fix_response.status_code == 200
        assert fix_response.json()["is_fixed"] == True

        receipt_after_fix = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        receipt_data = receipt_after_fix.json()
        assert receipt_data["has_dirty"] == False
        assert receipt_data["daily_cost"] == 100.0

        submit_response = client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert submit_response.status_code == 200
        assert submit_response.json()["status"] == "submitted"

    def test_fix_without_updating_data_keeps_dirty_flag(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")
        reviewer_token = get_token(client, "test_reviewer")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "DIRTY_FIX_002",
                "material_name": "脏数据不修复测试",
                "platform": "抖音",
                "report_date": "2024-01-25T00:00:00",
                "daily_cost": -50.0,
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]
        assert receipt_response.json()["has_dirty"] == True

        dirty_response = client.get(
            f"/api/v1/receipts/{receipt_id}/dirty-records",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        dirty_records = dirty_response.json()
        dirty_id = dirty_records[0]["id"]

        fix_response = client.post(
            f"/api/v1/receipts/{receipt_id}/dirty-records/{dirty_id}/fix",
            json={
                "fix_note": "只是标记，不修改数据",
                "updates": {}
            },
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        assert fix_response.status_code == 200
        assert fix_response.json()["is_fixed"] == True

        receipt_after_fix = client.get(
            f"/api/v1/receipts/{receipt_id}",
            headers={"Authorization": f"Bearer {reviewer_token}"}
        )
        receipt_data = receipt_after_fix.json()
        assert receipt_data["has_dirty"] == True
        assert receipt_data["daily_cost"] == -50.0

        submit_response = client.post(
            f"/api/v1/receipts/{receipt_id}/submit",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert submit_response.status_code == 400
        assert "脏数据" in submit_response.json()["detail"]


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


class TestAttachmentAudit:
    def test_upload_attachment_creates_audit_log(self, client, test_users):
        data_entry_token = get_token(client, "test_data_entry")

        receipt_response = client.post(
            "/api/v1/receipts",
            json={
                "material_id": "ATTACH_AUDIT_001",
                "material_name": "附件审计测试",
                "platform": "抖音",
                "report_date": "2024-01-28T00:00:00",
            },
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        receipt_id = receipt_response.json()["id"]

        audit_before = client.get(
            f"/api/v1/receipts/{receipt_id}/audit-logs",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        before_logs = audit_before.json()

        import io
        file_content = b"test content"
        response = client.post(
            f"/api/v1/receipts/{receipt_id}/attachments",
            files={"file": ("test.txt", io.BytesIO(file_content), "text/plain")},
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        assert response.status_code == 201

        audit_after = client.get(
            f"/api/v1/receipts/{receipt_id}/audit-logs",
            headers={"Authorization": f"Bearer {data_entry_token}"}
        )
        after_logs = audit_after.json()
        
        upload_actions = [log for log in after_logs if log["action"] == "upload_attachment"]
        assert len(upload_actions) >= 1
