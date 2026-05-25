import pytest
import io
import pandas as pd
from datetime import datetime
from tests.conftest import get_token


class TestImportAllRecordTypes:
    def test_import_borrow_application(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        df = pd.DataFrame([{
            "application_no": "IMPORT-APP001",
            "reader_name": "导入测试用户",
            "reader_id": "999888",
            "book_title": "导入测试图书",
            "lending_library": "测试图书馆A",
            "borrowing_library": "测试图书馆B"
        }])
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode('utf-8')
        
        response = client.post(
            "/import/borrow_application",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.csv", csv_content, "text/csv")}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["success"] == 1
        assert result["errors"] == 0
        
        check_response = client.get(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"}
        )
        apps = check_response.json()
        assert any(a["application_no"] == "IMPORT-APP001" for a in apps)

    def test_import_express_order(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "IMPORT-EXP-APP001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        df = pd.DataFrame([{
            "order_no": "IMPORT-EXP001",
            "borrow_application_id": app_id,
            "express_company": "测试快递",
            "shipping_cost": 20.0
        }])
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode('utf-8')
        
        response = client.post(
            "/import/express_order",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.csv", csv_content, "text/csv")}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["success"] == 1
        assert result["errors"] == 0
        
        check_response = client.get(
            "/express-orders/",
            headers={"Authorization": f"Bearer {token}"}
        )
        orders = check_response.json()
        assert any(o["order_no"] == "IMPORT-EXP001" for o in orders)

    def test_import_compensation_record(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "IMPORT-COMP-APP001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        df = pd.DataFrame([{
            "record_no": "IMPORT-COMP001",
            "borrow_application_id": app_id,
            "reader_name": "测试用户",
            "reader_id": "123456",
            "damage_type": "soiled",
            "total_amount": 50.0,
            "paid_amount": 50.0
        }])
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode('utf-8')
        
        response = client.post(
            "/import/compensation_record",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.csv", csv_content, "text/csv")}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["success"] == 1
        assert result["errors"] == 0
        
        check_response = client.get(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"}
        )
        records = check_response.json()
        assert any(r["record_no"] == "IMPORT-COMP001" for r in records)

    def test_import_refund_record(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "IMPORT-REF-APP001",
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
                "record_no": "IMPORT-REF-COMP001",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "other",
                "total_amount": 100.0,
                "paid_amount": 100.0
            }
        )
        comp_id = comp_response.json()["id"]
        
        df = pd.DataFrame([{
            "refund_no": "IMPORT-REF001",
            "compensation_record_id": comp_id,
            "borrow_application_id": app_id,
            "reader_name": "测试用户",
            "reader_id": "123456",
            "refund_amount": 30.0
        }])
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode('utf-8')
        
        response = client.post(
            "/import/refund_record",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.csv", csv_content, "text/csv")}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["success"] == 1
        assert result["errors"] == 0
        
        check_response = client.get(
            "/refund-records/",
            headers={"Authorization": f"Bearer {token}"}
        )
        records = check_response.json()
        assert any(r["refund_no"] == "IMPORT-REF001" for r in records)

    def test_import_invalid_type_returns_error(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        df = pd.DataFrame([{"test": "data"}])
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode('utf-8')
        
        response = client.post(
            "/import/invalid_type",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.csv", csv_content, "text/csv")}
        )
        assert response.status_code == 400

    def test_import_duplicate_detection(self, client, db_session):
        token = get_token(client, "entry", "123456")
        
        df = pd.DataFrame([
            {"application_no": "DUP-IMPORT001", "reader_name": "用户1", "reader_id": "111", 
             "book_title": "图书1", "lending_library": "A", "borrowing_library": "B"},
            {"application_no": "DUP-IMPORT001", "reader_name": "用户2", "reader_id": "222", 
             "book_title": "图书2", "lending_library": "A", "borrowing_library": "B"}
        ])
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue().encode('utf-8')
        
        response = client.post(
            "/import/borrow_application",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.csv", csv_content, "text/csv")}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 2
        assert result["success"] == 1
        assert result["duplicates"] == 1


class TestStatisticsAllEntities:
    def test_statistics_includes_all_entity_types(self, client, db_session):
        token = get_token(client, "entry", "123456")
        admin_token = get_token(client, "admin", "admin123")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "STATS-ALL001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        client.post(
            "/express-orders/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "order_no": "STATS-EXP001",
                "borrow_application_id": app_id,
                "express_company": "测试快递",
                "shipping_cost": -10.0
            }
        )
        
        client.post(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "record_no": "STATS-COMP001",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "overdue",
                "total_amount": 100.0,
                "overdue_days": 10,
                "daily_overdue_fee": 0.5
            }
        )
        
        stats_response = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        assert stats["total_records"] >= 3
        assert stats["unprocessed_records"] >= 1
        assert stats["by_record_status"]["dirty_amount_conflict"] >= 1

    def test_statistics_unprocessed_includes_compensation_dirty(self, client, db_session):
        token = get_token(client, "entry", "123456")
        admin_token = get_token(client, "admin", "admin123")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "STATS-DIRTY-COMP001",
                "reader_name": "测试用户",
                "reader_id": "123456",
                "book_title": "测试图书",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        
        before_stats = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        before_unprocessed = before_stats["unprocessed_records"]
        
        comp_response = client.post(
            "/compensation-records/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "record_no": "STATS-DIRTY-COMP002",
                "borrow_application_id": app_id,
                "reader_name": "测试用户",
                "reader_id": "123456",
                "damage_type": "overdue",
                "overdue_days": 10,
                "daily_overdue_fee": 0.5,
                "total_amount": 100.0
            }
        )
        assert comp_response.json()["record_status"] == "dirty_amount_conflict"
        
        after_stats = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        after_unprocessed = after_stats["unprocessed_records"]
        
        assert after_unprocessed > before_unprocessed

    def test_statistics_by_record_status_counts_all(self, client, db_session):
        token = get_token(client, "entry", "123456")
        admin_token = get_token(client, "admin", "admin123")
        review_token = get_token(client, "review", "123456")
        
        app_response = client.post(
            "/borrow-applications/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "application_no": "STATS-BY-STATUS001",
                "reader_name": "",
                "reader_id": "",
                "book_title": "",
                "lending_library": "图书馆A",
                "borrowing_library": "图书馆B"
            }
        )
        app_id = app_response.json()["id"]
        assert app_response.json()["record_status"] == "dirty_missing_field"
        
        client.post(
            f"/borrow-applications/{app_id}/mark-corrected?reason=测试统计",
            headers={"Authorization": f"Bearer {review_token}"}
        )
        
        stats = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        assert "dirty_missing_field" in stats["by_record_status"]
        assert "corrected" in stats["by_record_status"]
        assert stats["by_record_status"]["corrected"] >= 1

    def test_statistics_breakdown_report(self, client, db_session):
        token = get_token(client, "admin", "admin123")
        
        stats = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        
        required_fields = [
            "total_records",
            "unprocessed_records",
            "corrected_records",
            "needs_manual_confirm_records",
            "total_compensation_amount",
            "total_refund_amount",
            "by_record_status",
            "by_damage_type",
            "by_workflow_status"
        ]
        for field in required_fields:
            assert field in stats, f"统计报告缺少字段: {field}"
        
        assert isinstance(stats["by_record_status"], dict)
        assert isinstance(stats["by_damage_type"], dict)
        assert isinstance(stats["by_workflow_status"], dict)


class TestRoleViewStatisticsConsistency:
    def test_role_view_uses_same_statistics(self, client, db_session):
        admin_token = get_token(client, "admin", "admin123")
        
        stats = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        role_view = client.get(
            "/role-view",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        assert role_view["summary"]["total_records"] == stats["total_records"]
        assert role_view["summary"]["unprocessed_records"] == stats["unprocessed_records"]
        assert role_view["summary"]["corrected_records"] == stats["corrected_records"]
