import pytest
from app.models.models import DataSourceType


class TestImportAPI:
    def test_batch_import_check_in(self, client):
        response = client.post(
            "/api/v1/import/batch",
            json={
                "source_type": "check_in",
                "source_file": "check_in_20240520.xlsx",
                "imported_by": "财务小张",
                "records": [
                    {
                        "check_in_no": "CI20240520001",
                        "room_no": "1001",
                        "guest_name": "张三",
                        "check_in_date": "2024-05-20",
                        "check_out_date": "2024-05-22",
                        "amount": 580.0,
                        "deposit_amount": 600.0,
                        "invoice_amount": 580.0,
                        "payment_method": "微信",
                        "operator": "前台小王"
                    }
                ]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_count"] == 1
        assert data["success_count"] == 1

    def test_batch_import_deposit(self, client):
        response = client.post(
            "/api/v1/import/batch",
            json={
                "source_type": "deposit",
                "source_file": "deposit_20240520.xlsx",
                "records": [
                    {
                        "check_in_no": "CI20240520001",
                        "room_no": "1001",
                        "guest_name": "张三",
                        "deposit_amount": 200.0,
                        "deposit_type": "补充押金",
                        "payment_method": "微信"
                    }
                ]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_get_import_batch_records(self, client):
        import_response = client.post(
            "/api/v1/import/batch",
            json={
                "source_type": "check_in",
                "source_file": "test.xlsx",
                "records": [
                    {"check_in_no": "CI001", "amount": 500}
                ]
            }
        )
        batch_no = import_response.json()["import_batch_no"]
        
        response = client.get(f"/api/v1/import/batch/{batch_no}")
        assert response.status_code == 200
        records = response.json()
        assert len(records) == 1
        assert records[0]["source_file"] == "test.xlsx"
        assert records[0]["original_row_number"] == 1

    def test_list_import_records(self, client):
        client.post(
            "/api/v1/import/batch",
            json={
                "source_type": "check_in",
                "source_file": "test1.xlsx",
                "records": [{"check_in_no": "CI001", "amount": 500}]
            }
        )
        
        response = client.get("/api/v1/import/records")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1


class TestCompensationAPI:
    def test_create_compensation(self, client):
        response = client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI20240520001",
                "room_no": "1001",
                "guest_name": "张三",
                "amount": 580.0,
                "deposit_amount": 600.0,
                "invoice_amount": 580.0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["compensation_no"].startswith("COMP")
        assert data["status"] == "pending"

    def test_get_compensation(self, client):
        create_response = client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI001",
                "amount": 500.0
            }
        )
        comp_no = create_response.json()["compensation_no"]
        
        response = client.get(f"/api/v1/compensation/{comp_no}")
        assert response.status_code == 200
        data = response.json()
        assert data["compensation_no"] == comp_no

    def test_list_compensations(self, client):
        client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI001",
                "amount": 500.0
            }
        )
        
        response = client.get("/api/v1/compensation/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    def test_manual_takeover_api(self, client):
        create_response = client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI001",
                "amount": 500.0
            }
        )
        comp_no = create_response.json()["compensation_no"]
        
        response = client.post(
            f"/api/v1/compensation/{comp_no}/manual-takeover",
            json={
                "operator": "财务小张",
                "judgment_remark": "经核实需要补偿"
            }
        )
        
        assert response.status_code == 400

    def test_close_compensation_api(self, client):
        create_response = client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI001",
                "amount": 500.0
            }
        )
        comp_no = create_response.json()["compensation_no"]
        
        response = client.post(
            f"/api/v1/compensation/{comp_no}/close",
            json={
                "operator": "财务主管",
                "close_remark": "重复记录"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "closed"

    def test_get_compensation_transitions(self, client):
        create_response = client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI001",
                "amount": 500.0
            }
        )
        comp_no = create_response.json()["compensation_no"]
        
        response = client.get(f"/api/v1/compensation/{comp_no}/transitions")
        assert response.status_code == 200
        transitions = response.json()
        assert len(transitions) >= 1

    def test_get_compensation_logs(self, client):
        create_response = client.post(
            "/api/v1/compensation/",
            json={
                "source_type": "check_in",
                "check_in_no": "CI001",
                "amount": 500.0
            }
        )
        comp_no = create_response.json()["compensation_no"]
        
        response = client.get(f"/api/v1/compensation/{comp_no}/logs")
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) >= 1


class TestExportAPI:
    def test_get_statistics(self, client):
        response = client.get("/api/v1/export/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert "compensated_count" in data
        assert "total_amount" in data

    def test_export_night_audit_report(self, client):
        response = client.get("/api/v1/export/night-audit")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

    def test_export_retryable_classification(self, client):
        response = client.get("/api/v1/export/retryable-classification")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

    def test_export_dead_letter(self, client):
        response = client.get("/api/v1/export/dead-letter")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

    def test_export_recovery(self, client):
        response = client.get("/api/v1/export/recovery")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
