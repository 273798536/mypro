import pytest
from unittest.mock import patch
from app.models.models import DataSourceType, FailureType


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

    def test_batch_import_duplicate_skipped(self, client):
        record = {
            "check_in_no": "CI001",
            "amount": 500,
            "room_no": "101",
            "guest_name": "张三"
        }

        response1 = client.post(
            "/api/v1/import/batch",
            json={
                "source_type": "check_in",
                "source_file": "dup_test.xlsx",
                "import_batch_no": "DUP001",
                "records": [record]
            }
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["success_count"] == 1
        assert data1["skipped_count"] == 0

        response2 = client.post(
            "/api/v1/import/batch",
            json={
                "source_type": "check_in",
                "source_file": "dup_test.xlsx",
                "import_batch_no": "DUP001",
                "records": [record]
            }
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["success_count"] == 0
        assert data2["skipped_count"] == 1

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


class TestCompensationProcessing:
    def test_create_compensation_triggers_processing(self, client, db_session):
        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (True, "补偿成功", None)

            response = client.post(
                "/api/v1/compensation/",
                json={
                    "source_type": "room_change",
                    "check_in_no": "CI20240520001",
                    "room_no": "1502",
                    "guest_name": "张三",
                    "amount": 120.0,
                    "deposit_amount": 0,
                    "invoice_amount": 0,
                    "extra_data": {"change_reason": "空调故障"}
                }
            )

            assert response.status_code == 200
            comp_no = response.json()["compensation_no"]

            from app.services.compensation_service import get_compensation_by_no
            comp = get_compensation_by_no(db_session, comp_no)
            assert comp.status == "compensated"

    def test_process_triggers_state_machine(self, client, db_session):
        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (True, "补偿成功", None)

            client.post(
                "/api/v1/compensation/",
                json={
                    "source_type": "deposit",
                    "check_in_no": "CI20240520001",
                    "amount": 200.0
                }
            )

            list_resp = client.get("/api/v1/compensation/?status=compensated")
            assert list_resp.status_code == 200
            assert list_resp.json()["total"] >= 1

    def test_retryable_failure(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (
                False,
                "网络超时",
                FailureType.RETRYABLE
            )

            response = client.post(
                "/api/v1/compensation/",
                json={
                    "source_type": "check_in",
                    "check_in_no": "CI001",
                    "amount": 500.0
                }
            )
            comp_no = response.json()["compensation_no"]

            from app.services.compensation_service import get_compensation_by_no
            comp = get_compensation_by_no(db_session, comp_no)
            assert comp.status == "waiting_retry"
            assert comp.retry_count == 1
            assert comp.next_retry_at is not None

    def test_permanent_failure(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (
                False,
                "入住单号不存在",
                FailureType.PERMANENT
            )

            response = client.post(
                "/api/v1/compensation/",
                json={
                    "source_type": "check_in",
                    "check_in_no": "CI999",
                    "amount": 500.0
                }
            )
            comp_no = response.json()["compensation_no"]

            from app.services.compensation_service import get_compensation_by_no
            comp = get_compensation_by_no(db_session, comp_no)
            assert comp.status == "permanent_failed"

    def test_need_manual_failure(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (
                False,
                "数据校验不通过",
                FailureType.NEED_MANUAL
            )

            response = client.post(
                "/api/v1/compensation/",
                json={
                    "source_type": "inventory_diff",
                    "check_in_no": "CI001",
                    "amount": -30.0,
                    "extra_data": {"diff_type": "坏果扣款"}
                }
            )
            comp_no = response.json()["compensation_no"]

            from app.services.compensation_service import get_compensation_by_no
            comp = get_compensation_by_no(db_session, comp_no)
            assert comp.status == "waiting_manual"


class TestFullWorkflow:
    def test_import_room_change_and_process(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (True, "补偿成功", None)

            import_resp = client.post(
                "/api/v1/import/batch",
                json={
                    "source_type": "room_change",
                    "source_file": "换房记录_20240521.xlsx",
                    "records": [
                        {
                            "check_in_no": "CI20240520001",
                            "old_room_no": "1001",
                            "new_room_no": "1502",
                            "guest_name": "张三",
                            "room_price_diff": 120.0,
                            "change_time": "2024-05-21 01:45:00",
                            "change_reason": "空调故障"
                        }
                    ]
                }
            )

            assert import_resp.status_code == 200
            assert import_resp.json()["success_count"] == 1

            list_resp = client.get("/api/v1/compensation/")
            assert list_resp.json()["total"] >= 1

            comps = list_resp.json()["items"]
            room_change_comps = [
                c for c in comps if c["source_type"] == "room_change"
            ]
            assert len(room_change_comps) >= 1
            assert room_change_comps[0]["status"] == "compensated"
            assert room_change_comps[0]["amount"] == 120.0

    def test_import_inventory_diff_and_process(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (
                False,
                "需要核实坏果扣款",
                FailureType.NEED_MANUAL
            )

            import_resp = client.post(
                "/api/v1/import/batch",
                json={
                    "source_type": "inventory_diff",
                    "source_file": "盘点差异_20240521.xlsx",
                    "records": [
                        {
                            "check_in_no": "CI20240520001",
                            "room_no": "1502",
                            "guest_name": "张三",
                            "diff_amount": -30.0,
                            "diff_type": "坏果扣款",
                            "diff_reason": "水果盘有坏果，客人投诉减免",
                            "audit_time": "2024-05-21 03:30:00"
                        }
                    ]
                }
            )

            assert import_resp.status_code == 200

            list_resp = client.get("/api/v1/compensation/?status=waiting_manual")
            comps = list_resp.json()["items"]
            assert len(comps) >= 1
            bad_fruit_comps = [
                c for c in comps if c["amount"] == -30.0
            ]
            assert len(bad_fruit_comps) >= 1

            comp_no = bad_fruit_comps[0]["compensation_no"]
            logs_resp = client.get(f"/api/v1/compensation/{comp_no}/logs")
            assert logs_resp.status_code == 200
            assert len(logs_resp.json()) >= 1

    def test_duplicate_import_no_duplicate_compensation(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (True, "补偿成功", None)

            record = {
                "check_in_no": "CI001",
                "amount": 500,
                "room_no": "101",
                "guest_name": "张三"
            }

            client.post(
                "/api/v1/import/batch",
                json={
                    "source_type": "check_in",
                    "source_file": "dup_test.xlsx",
                    "import_batch_no": "DUP001",
                    "records": [record]
                }
            )

            count_1 = client.get("/api/v1/compensation/").json()["total"]

            client.post(
                "/api/v1/import/batch",
                json={
                    "source_type": "check_in",
                    "source_file": "dup_test.xlsx",
                    "import_batch_no": "DUP001",
                    "records": [record]
                }
            )

            count_2 = client.get("/api/v1/compensation/").json()["total"]
            assert count_1 == count_2

    def test_full_workflow_with_export(self, client, db_session):
        from unittest.mock import patch

        with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call:
            mock_call.return_value = (True, "补偿成功", None)

            client.post(
                "/api/v1/import/batch",
                json={
                    "source_type": "check_in",
                    "source_file": "入住单.xlsx",
                    "records": [
                        {"check_in_no": "CI001", "amount": 580, "room_no": "101", "guest_name": "张三"}
                    ]
                }
            )

            with patch('app.tasks.compensation_tasks.simulate_external_system_call') as mock_call2:
                mock_call2.return_value = (
                    False,
                    "网络超时",
                    FailureType.RETRYABLE
                )
                client.post(
                    "/api/v1/import/batch",
                    json={
                        "source_type": "deposit",
                        "source_file": "押金流水.xlsx",
                        "records": [
                            {"check_in_no": "CI001", "deposit_amount": 200, "guest_name": "张三"}
                        ]
                    }
                )

            stats = client.get("/api/v1/export/statistics").json()
            assert stats["total_count"] >= 2

            export_resp = client.get("/api/v1/export/night-audit")
            assert export_resp.status_code == 200
            assert export_resp.headers["content-type"] == "text/csv; charset=utf-8"

            retryable_resp = client.get("/api/v1/export/retryable-classification")
            assert retryable_resp.status_code == 200

