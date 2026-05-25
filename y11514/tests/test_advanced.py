import pytest
import io
from datetime import datetime, timedelta
from tests.conftest import get_token


class TestDirtyRecordDetection:
    def test_detect_missing_fields(self, client, db_session):
        token = get_token(client, "entry", "123456")
        response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DIRTY001",
                "reader_name": "",
                "reader_id": "",
                "book_title": "",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        assert response.status_code == 200
        result = response.json()
        assert result["record_status"] == "dirty_missing_field"

    def test_detect_cross_day(self, client, db_session):
        token = get_token(client, "entry", "123456")
        apply_date = (datetime.now() - timedelta(days=30)).isoformat()
        expected_date = (datetime.now() - timedelta(days=10)).isoformat()
        actual_date = datetime.now().isoformat()
        
        response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DIRTY002",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B",
                "apply_date": apply_date,
                "expected_return_date": expected_date,
                "actual_return_date": actual_date
            }
        )
        assert response.status_code == 200
        result = response.json()
        assert result["record_status"] == "dirty_cross_day"

    def test_detect_amount_conflict(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DIRTY003",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        comp_response = client.post(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "record_no": "COMP-DIRTY001",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "overdue",
                "overdue_days": 10,
                "daily_overdue_fee": 0.5,
                "soiling_fee": 0,
                "other_fees": 0,
                "total_amount": 100
            }
        )
        assert comp_response.status_code == 200
        result = comp_response.json()
        assert result["record_status"] == "dirty_amount_conflict"

    def test_detect_quantity_conflict(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DIRTY004",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        comp_response = client.post(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "record_no": "COMP-DIRTY002",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "overdue",
                "overdue_days": -5,
                "daily_overdue_fee": 0,
                "soiling_fee": 0,
                "other_fees": 0,
                "total_amount": 0
            }
        )
        assert comp_response.status_code == 200
        result = comp_response.json()
        assert result["record_status"] == "dirty_quantity_conflict"

    def test_name_change_detection(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DIRTY005",
                "reader_name": "张三",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = create_response.json()["id"]
        assert create_response.json()["record_status"] == "normal"
        
        update_response = client.put(
            f"/borrow-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reader_name": "李四",
                "change_reason": "姓名变更"
            }
        )
        assert update_response.status_code == 200
        result = update_response.json()
        assert result["record_status"] == "dirty_name_change"


class TestFullWorkflow:
    def test_express_order_full_workflow(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "WF-EXP001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        create_response = client.post(
            "/express-orders/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "order_no": "EXP001",
                "borrow_application_id": app_id,
                "express_company": "顺丰速运",
                "shipping_cost": 15.0
            }
        )
        order_id = create_response.json()["id"]
        assert create_response.json()["status"] == "draft"
        
        submit_response = client.post(
            f"/express-orders/{order_id}/submit",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert submit_response.status_code == 200
        assert submit_response.json()["status"] == "submitted"
        
        review_token = get_token(client, "review", "123456")
        reject_response = client.post(
            f"/express-orders/{order_id}/reject?reason=快递费异常",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        assert reject_response.status_code == 200
        assert reject_response.json()["status"] == "rejected"
        
        admin_token = get_token(client, "admin", "admin123")
        confirm_response = client.post(
            f"/express-orders/{order_id}/second-confirm",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert confirm_response.status_code == 200
        assert confirm_response.json()["status"] == "second_confirm"
        
        finalize_response = client.post(
            f"/express-orders/{order_id}/finalize",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert finalize_response.status_code == 200
        assert finalize_response.json()["status"] == "finalized"

    def test_compensation_record_full_workflow(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "WF-COMP001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        create_response = client.post(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "record_no": "COMP001",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "soiled",
                "total_amount": 50,
                "paid_amount": 50
            }
        )
        record_id = create_response.json()["id"]
        assert create_response.json()["status"] == "draft"
        
        submit_response = client.post(
            f"/compensation-records/{record_id}/submit",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert submit_response.status_code == 200
        assert submit_response.json()["status"] == "submitted"

    def test_refund_record_full_workflow(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "WF-REF001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        comp_response = client.post(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "record_no": "COMP-REF001",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "other",
                "total_amount": 100,
                "paid_amount": 100
            }
        )
        comp_id = comp_response.json()["id"]
        
        create_response = client.post(
            "/refund-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "refund_no": "REF001",
                "compensation_record_id": comp_id,
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "refund_amount": 50
            }
        )
        record_id = create_response.json()["id"]
        assert create_response.json()["status"] == "draft"
        
        submit_response = client.post(
            f"/refund-records/{record_id}/submit",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert submit_response.status_code == 200


class TestPersistenceAndAudit:
    def test_audit_log_persists_after_operations(self, client, db_session):
        token = get_token(client, "entry", "123456")
        review_token = get_token(client, "review", "123456")
        
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "PERSIST001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = create_response.json()["id"]
        
        client.put(
            f"/borrow-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reader_name": "修改后用户",
                "change_reason": "测试修改"
            }
        )
        
        client.post(
            f"/borrow-applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        audit_response = client.get(
            f"/audit-logs/?table_name=borrow_applications&record_id={app_id}",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        assert audit_response.status_code == 200
        logs = audit_response.json()
        assert len(logs) >= 3
        
        actions = [log["action"] for log in logs]
        assert any("创建借阅申请" in a for a in actions)
        assert any("更新字段" in a for a in actions)
        assert any("状态变更" in a for a in actions)

    def test_raw_original_data_preserved(self, client, db_session):
        token = get_token(client, "entry", "123456")
        admin_token = get_token(client, "admin", "admin123")
        
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "RAWDATA001",
                "reader_name": "原始用户",
                "reader_id": "123456",
                "book_title": "原始图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = create_response.json()["id"]
        
        client.put(
            f"/borrow-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reader_name": "修改后用户",
                "change_reason": "修改测试"
            }
        )
        
        detail_response = client.get(
            f"/borrow-applications/{app_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["reader_name"] == "修改后用户"
        
        from app.models import BorrowApplication
        record = db_session.query(BorrowApplication).filter(BorrowApplication.id == app_id).first()
        assert record.raw_original_data is not None
        import json
        original_data = json.loads(record.raw_original_data)
        assert original_data["reader_name"] == "原始用户"


class TestExportConsistency:
    def test_export_returns_data(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        for i in range(3):
            client.post(
                "/borrow-applications/",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "application_no": f"EXPORT{i:03d}",
                    "reader_name": f"用户{i}",
                    "reader_id": f"ID{i:06d}",
                    "book_title": f"图书{i}",
                    "lending_library": "图书馆A",
                    "borrowing_library": "图书馆B"
                }
            )
        
        admin_token = get_token(client, "admin", "admin123")
        export_response = client.get(
            "/export/borrow_applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert export_response.status_code == 200
        assert export_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert len(export_response.content) > 0

    def test_export_sensitive_data_masked_for_readonly(self, client, db_session):
        admin_token = get_token(client, "admin", "admin123")
        client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "application_no": "EXPORT-MASK001",
                "reader_name": "测试用户",
                "reader_id": "9876543210",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        
        readonly_token = get_token(client, "readonly", "123456")
        list_response = client.get(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {readonly_token}"}
        )
        assert list_response.status_code == 200
        apps = list_response.json()
        assert len(apps) > 0
        
        for app in apps:
            assert "raw_original_data" not in app
            assert "processing_notes" not in app


class TestCorrectionWorkflow:
    def test_mark_record_as_corrected(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        create_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "CORRECT001",
                "reader_name": "",
                "reader_id": "",
                "book_title": "",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = create_response.json()["id"]
        assert create_response.json()["record_status"] == "dirty_missing_field"
        
        client.put(
            f"/borrow-applications/{app_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reader_name": "修正后用户名",
                "reader_id": "123456",
                "book_title": "修正后书名",
                "change_reason": "补全缺失信息"
            }
        )
        
        review_token = get_token(client, "review", "123456")
        mark_response = client.post(
            f"/borrow-applications/{app_id}/mark-corrected?reason=已补全所有缺失字段",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        assert mark_response.status_code == 200
        assert mark_response.json()["new_status"] == "corrected"

    def test_statistics_report_separates_statuses(self, client, db_session):
        token = get_token(client, "entry", "123456")
        review_token = get_token(client, "review", "123456")
        
        client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "STAT-DIRTY01",
                "reader_name": "",
                "reader_id": "",
                "book_title": "",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        
        normal_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "STAT-NORMAL01",
                "reader_name": "正常用户",
                "reader_id": "123456",
                "book_title": "正常图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        normal_id = normal_response.json()["id"]
        
        client.post(
            f"/borrow-applications/{normal_id}/mark-corrected?reason=测试标记修正",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        
        admin_token = get_token(client, "admin", "admin123")
        stats_response = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        assert "unprocessed_records" in stats
        assert stats["unprocessed_records"] >= 1
        assert "corrected_records" in stats
        assert stats["corrected_records"] >= 1
        assert "needs_manual_confirm_records" in stats
        assert "by_record_status" in stats
        assert "dirty_missing_field" in stats["by_record_status"]
        assert "corrected" in stats["by_record_status"]


class TestRoleViewDifferences:
    def test_different_roles_get_different_views(self, client, db_session):
        token_entry = get_token(client, "entry", "123456")
        token_review = get_token(client, "review", "123456")
        token_admin = get_token(client, "admin", "admin123")
        
        view_entry = client.get(
            "/role-view",
            headers={"Authorization": f"Bearer {token_entry}"}
        )
        view_review = client.get(
            "/role-view",
            headers={"Authorization": f"Bearer {token_review}"}
        )
        view_admin = client.get(
            "/role-view",
            headers={"Authorization": f"Bearer {token_admin}"}
        )
        
        assert view_entry.status_code == 200
        assert view_review.status_code == 200
        assert view_admin.status_code == 200
        
        assert view_entry.json()["view_type"] == "data_entry"
        assert view_review.json()["view_type"] == "reviewer"
        assert view_admin.json()["view_type"] == "supervisor"
        
        assert "recent_changes" in view_entry.json()
        assert "summary" in view_review.json()
        
        review_data = view_review.json()
        assert "pending_items" in review_data


class TestDuplicateImportDetection:
    def test_duplicate_import_blocked(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        first = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DUP-CHECK001",
                "reader_name": "用户A",
                "reader_id": "123456",
                "book_title": "图书A",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        assert first.status_code == 200
        
        second = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "DUP-CHECK001",
                "reader_name": "用户B",
                "reader_id": "654321",
                "book_title": "图书B",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        assert second.status_code == 400
