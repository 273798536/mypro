import pytest


class TestStatusFlow:
    def test_create_sample_label_is_draft(self, client, create_sample_label):
        """测试: 新创建的留样标签状态为 draft"""
        label = create_sample_label()
        assert label["status"] == "draft"
        assert label["version"] == 1

    def test_draft_to_submitted(self, client, create_sample_label, status_request):
        """测试: 正常流转 draft -> submitted"""
        label = create_sample_label()
        
        response = client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("submitted")
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["old_status"] == "draft"
        assert result["new_status"] == "submitted"

    def test_submitted_to_confirmed(self, client, create_sample_label, status_request):
        """测试: 正常流转 submitted -> confirmed"""
        label = create_sample_label()
        
        client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("submitted")
        )
        
        response = client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("confirmed")
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["old_status"] == "submitted"
        assert result["new_status"] == "confirmed"

    def test_submitted_to_rejected(self, client, create_sample_label, status_request):
        """测试: 驳回流程 submitted -> rejected"""
        label = create_sample_label()
        
        client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("submitted")
        )
        
        response = client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("rejected", "信息有误")
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["old_status"] == "submitted"
        assert result["new_status"] == "rejected"

    def test_rejected_to_submitted(self, client, create_sample_label, status_request):
        """测试: 二次提交流程 rejected -> submitted"""
        label = create_sample_label()
        
        client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("submitted")
        )
        client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("rejected", "信息有误")
        )
        
        response = client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("submitted", "已修正,重新提交")
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["old_status"] == "rejected"
        assert result["new_status"] == "submitted"

    def test_full_reject_flow(self, client, create_sample_label, status_request):
        """测试: 完整驳回二次确认流程 draft->submitted->rejected->submitted->confirmed"""
        label = create_sample_label()
        label_id = label["id"]
        
        response1 = client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("submitted")
        )
        assert response1.json()["new_status"] == "submitted"
        
        response2 = client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("rejected", "时间有误")
        )
        assert response2.json()["new_status"] == "rejected"
        
        response3 = client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("submitted", "已修正")
        )
        assert response3.json()["new_status"] == "submitted"
        
        response4 = client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("confirmed", "审核通过")
        )
        assert response4.json()["new_status"] == "confirmed"

    def test_invalid_transition_direct_draft_to_confirmed(self, client, create_sample_label, status_request):
        """测试: 非法流转 - 不能直接从 draft 到 confirmed"""
        label = create_sample_label()
        
        response = client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("confirmed")
        )
        
        assert response.status_code == 400
        assert "Invalid status transition" in response.json()["detail"]

    def test_invalid_transition_confirmed_to_anything(self, client, create_sample_label, status_request):
        """测试: 非法流转 - confirmed 状态后不能再变更"""
        label = create_sample_label()
        label_id = label["id"]
        
        client.post(f"/sample-labels/{label_id}/status", json=status_request("submitted"))
        client.post(f"/sample-labels/{label_id}/status", json=status_request("confirmed"))
        
        response = client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("rejected")
        )
        
        assert response.status_code == 400

    def test_invalid_transition_draft_to_rejected(self, client, create_sample_label, status_request):
        """测试: 非法流转 - 不能从 draft 直接到 rejected"""
        label = create_sample_label()
        
        response = client.post(
            f"/sample-labels/{label['id']}/status",
            json=status_request("rejected")
        )
        
        assert response.status_code == 400

    def test_cannot_update_confirmed_record(self, client, create_sample_label, status_request):
        """测试: 已确认的记录不能修改"""
        label = create_sample_label()
        label_id = label["id"]
        
        client.post(f"/sample-labels/{label_id}/status", json=status_request("submitted"))
        client.post(f"/sample-labels/{label_id}/status", json=status_request("confirmed"))
        
        response = client.put(
            f"/sample-labels/{label_id}",
            json={"product_name": "尝试修改"},
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 400

    def test_version_increment_on_status_change(self, client, create_sample_label, status_request):
        """测试: 每次状态变更版本号递增"""
        label = create_sample_label()
        label_id = label["id"]
        initial_version = label["version"]
        
        client.post(f"/sample-labels/{label_id}/status", json=status_request("submitted"))
        
        response = client.get(f"/sample-labels/{label_id}", headers={"X-User-Role": "admin"})
        new_version = response.json()["version"]
        
        assert new_version == initial_version + 1

    def test_audit_log_created_on_status_change(self, client, create_sample_label, status_request):
        """测试: 状态变更时生成审计日志"""
        label = create_sample_label()
        label_id = label["id"]
        
        client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("submitted", "测试提交")
        )
        
        logs_response = client.get(f"/audit-logs/?sample_label_id={label_id}")
        logs = logs_response.json()
        
        assert len(logs) >= 1
        status_logs = [l for l in logs if "status_change" in l["action_type"]]
        assert len(status_logs) >= 1
        assert status_logs[0]["change_reason"] == "测试提交"

    def test_update_only_allowed_in_draft(self, client, create_sample_label, status_request):
        """测试: 只能在 draft 状态修改记录"""
        label = create_sample_label()
        label_id = label["id"]
        
        update_response = client.put(
            f"/sample-labels/{label_id}",
            json={"product_name": "修改后的名称"},
            headers={"X-User-Id": "test_user"}
        )
        assert update_response.status_code == 200
        
        client.post(f"/sample-labels/{label_id}/status", json=status_request("submitted"))
        
        update_response2 = client.put(
            f"/sample-labels/{label_id}",
            json={"product_name": "再次修改"},
            headers={"X-User-Id": "test_user"}
        )
        assert update_response2.status_code == 400
