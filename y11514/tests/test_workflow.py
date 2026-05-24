import pytest
from tests.conftest import get_token


class TestWorkflowStatus:
    def test_draft_to_submitted(self, client):
        token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "WF001",
                "reader_name": "李四",
                "reader_id": "654321",
                "book_title": "数据结构",
                "lending_library": "复旦图书馆",
                "borrowing_library": "交大图书馆"
            }
        )
        app_id = create_response.json()["id"]
        assert create_response.json()["status"] == "draft"
        
        submit_response = client.post(
            f"/borrow-applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert submit_response.status_code == 200
        assert submit_response.json()["status"] == "submitted"

    def test_submitted_to_rejected(self, client):
        entry_token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "application_no": "WF002",
                "reader_name": "李四",
                "reader_id": "654321",
                "book_title": "数据结构",
                "lending_library": "复旦图书馆",
                "borrowing_library": "交大图书馆"
            }
        )
        app_id = create_response.json()["id"]
        
        client.post(
            f"/borrow-applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {entry_token}"}
        )
        
        review_token = get_token(client, "review", "123456")
        reject_response = client.post(
            f"/borrow-applications/{app_id}/reject?reason=信息不完整",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        assert reject_response.status_code == 200
        assert reject_response.json()["status"] == "rejected"
        assert reject_response.json()["reason"] == "信息不完整"

    def test_second_confirm(self, client):
        entry_token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "application_no": "WF003",
                "reader_name": "李四",
                "reader_id": "654321",
                "book_title": "数据结构",
                "lending_library": "复旦图书馆",
                "borrowing_library": "交大图书馆"
            }
        )
        app_id = create_response.json()["id"]
        
        admin_token = get_token(client, "admin", "admin123")
        confirm_response = client.post(
            f"/borrow-applications/{app_id}/second-confirm",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert confirm_response.status_code == 200
        assert confirm_response.json()["status"] == "second_confirm"

    def test_finalize(self, client):
        entry_token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "application_no": "WF004",
                "reader_name": "李四",
                "reader_id": "654321",
                "book_title": "数据结构",
                "lending_library": "复旦图书馆",
                "borrowing_library": "交大图书馆"
            }
        )
        app_id = create_response.json()["id"]
        
        admin_token = get_token(client, "admin", "admin123")
        finalize_response = client.post(
            f"/borrow-applications/{app_id}/finalize",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert finalize_response.status_code == 200
        assert finalize_response.json()["status"] == "finalized"


class TestDuplicateDetection:
    def test_duplicate_application_no(self, client):
        token = get_token(client, "entry", "123456")
        client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DUP001",
                "reader_name": "王五",
                "reader_id": "111111",
                "book_title": "算法导论",
                "lending_library": "浙大图书馆",
                "borrowing_library": "南大图书馆"
            }
        )
        
        duplicate_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DUP001",
                "reader_name": "赵六",
                "reader_id": "222222",
                "book_title": "算法导论第二版",
                "lending_library": "浙大图书馆",
                "borrowing_library": "南大图书馆"
            }
        )
        assert duplicate_response.status_code == 400
        assert "已存在" in duplicate_response.json()["detail"]


class TestAuditLog:
    def test_audit_log_created_on_update(self, client):
        entry_token = get_token(client, "entry", "123456")
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "application_no": "AUDIT001",
                "reader_name": "陈七",
                "reader_id": "333333",
                "book_title": "计算机网络",
                "lending_library": "中科大图书馆",
                "borrowing_library": "国防科大图书馆"
            }
        )
        app_id = create_response.json()["id"]
        
        client.put(
            f"/borrow-applications/{app_id}",
            headers={"Authorization": f"Bearer {entry_token}"},
            json={
                "reader_name": "陈七修改",
                "change_reason": "姓名拼写错误"
            }
        )
        
        review_token = get_token(client, "review", "123456")
        audit_response = client.get(
            "/audit-logs/",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        assert audit_response.status_code == 200
        audit_logs = audit_response.json()
        assert len(audit_logs) > 0
        
        update_logs = [log for log in audit_logs if log["action"] == "更新字段"]
        assert len(update_logs) > 0
        assert update_logs[0]["change_reason"] == "姓名拼写错误"


class TestStatistics:
    def test_statistics_report(self, client):
        token = get_token(client, "entry", "123456")
        for i in range(5):
            client.post(
                "/borrow-applications/",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "application_no": f"STAT{i:03d}",
                    "reader_name": f"读者{i}",
                    "reader_id": f"ID{i:06d}",
                    "book_title": f"图书{i}",
                    "lending_library": "图书馆A",
                    "borrowing_library": "图书馆B"
                }
            )
        
        admin_token = get_token(client, "admin", "admin123")
        stats_response = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert stats["total_records"] >= 5
        assert "unprocessed_records" in stats
        assert "corrected_records" in stats
        assert "needs_manual_confirm_records" in stats


class TestDataMasking:
    def test_role_view_differs_by_role(self, client):
        entry_token = get_token(client, "entry", "123456")
        entry_view = client.get(
            "/role-view",
            headers={"Authorization": f"Bearer {entry_token}"}
        )
        assert entry_view.status_code == 200
        
        admin_token = get_token(client, "admin", "admin123")
        admin_view = client.get(
            "/role-view",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_view.status_code == 200
        
        entry_data = entry_view.json()
        admin_data = admin_view.json()
        
        assert entry_data["view_type"] == "data_entry"
        assert admin_data["view_type"] == "supervisor"
