import pytest


class TestBadDataIsolation:
    def test_temperature_record_rejects_nonexistent_sample_label(self, client):
        """测试: 温度记录 - 关联不存在的留样标签应被拦截"""
        temp_data = {
            "sample_label_id": 99999,
            "record_time": "2026-05-25T10:00:00",
            "temperature": 20.0,
            "recorder": "测试员"
        }
        
        response = client.post(
            "/temperature-records/",
            json=temp_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 400
        assert "不存在" in response.json()["detail"]
        
        failed_response = client.get("/failed-records/?source_type=temperature")
        failed_records = failed_response.json()
        
        assert len(failed_records) >= 1
        assert any("99999" in r["error_message"] for r in failed_records)

    def test_temperature_record_with_valid_label_succeeds(self, client, create_sample_label):
        """测试: 温度记录 - 关联存在的留样标签应成功"""
        label = create_sample_label("BAD_DATA_001")
        
        temp_data = {
            "sample_label_id": label["id"],
            "record_time": "2026-05-25T10:00:00",
            "temperature": 5.0,
            "recorder": "测试员"
        }
        
        response = client.post(
            "/temperature-records/",
            json=temp_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 200
        assert response.json()["sample_label_id"] == label["id"]

    def test_scan_record_rejects_nonexistent_sample_label(self, client):
        """测试: 扫码记录 - 关联不存在的留样标签应被拦截"""
        scan_data = {
            "sample_label_id": 99999,
            "store_id": "STORE001",
            "store_name": "测试门店",
            "scan_time": "2026-05-25T11:00:00",
            "scanner": "测试员",
            "quantity": 10
        }
        
        response = client.post(
            "/scan-records/",
            json=scan_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 400
        assert "不存在" in response.json()["detail"]

    def test_scan_record_without_sample_label_succeeds(self, client):
        """测试: 扫码记录 - 不指定留样标签应成功(可选关联)"""
        scan_data = {
            "store_id": "STORE001",
            "store_name": "测试门店",
            "scan_time": "2026-05-25T11:00:00",
            "scanner": "测试员",
            "quantity": 10
        }
        
        response = client.post(
            "/scan-records/",
            json=scan_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 200

    def test_complaint_rejects_nonexistent_sample_label(self, client):
        """测试: 门店投诉 - 关联不存在的留样标签应被拦截"""
        complaint_data = {
            "sample_label_id": 99999,
            "store_id": "STORE001",
            "store_name": "测试门店",
            "complaint_type": "质量问题",
            "complaint_desc": "测试投诉",
            "complaint_time": "2026-05-25T12:00:00",
            "handler": "测试员"
        }
        
        response = client.post(
            "/complaints/",
            json=complaint_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 400
        assert "不存在" in response.json()["detail"]

    def test_complaint_without_sample_label_succeeds(self, client):
        """测试: 门店投诉 - 不指定留样标签应成功(可选关联)"""
        complaint_data = {
            "store_id": "STORE001",
            "store_name": "测试门店",
            "complaint_type": "质量问题",
            "complaint_desc": "测试投诉",
            "complaint_time": "2026-05-25T12:00:00",
            "handler": "测试员"
        }
        
        response = client.post(
            "/complaints/",
            json=complaint_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 200

    def test_orphan_temperature_not_in_report_summary(self, client, create_sample_label, status_request):
        """测试: 孤儿温度数据不应进入报表汇总"""
        label = create_sample_label("BAD_DATA_002")
        label_id = label["id"]
        
        temp_data = {
            "sample_label_id": label_id,
            "record_time": "2026-05-25T10:00:00",
            "temperature": 15.0,
            "recorder": "测试员"
        }
        temp_response = client.post(
            "/temperature-records/",
            json=temp_data,
            headers={"X-User-Id": "test_user"}
        )
        temp_id = temp_response.json()["id"]
        
        client.post(
            f"/temperature-records/{temp_id}/status",
            json=status_request("submitted")
        )
        client.post(
            f"/temperature-records/{temp_id}/status",
            json=status_request("confirmed")
        )
        
        summary_before = client.get("/reports/summary").json()
        assert summary_before["abnormal_temp_count"] == 1
        
        bad_temp_data = {
            "sample_label_id": 99999,
            "record_time": "2026-05-25T10:00:00",
            "temperature": 99.0,
            "recorder": "测试员"
        }
        client.post(
            "/temperature-records/",
            json=bad_temp_data,
            headers={"X-User-Id": "test_user"}
        )
        
        summary_after = client.get("/reports/summary").json()
        assert summary_after["abnormal_temp_count"] == summary_before["abnormal_temp_count"]
        
        assert summary_after["total_samples"] == 1

    def test_bad_data_preserves_error_reason(self, client):
        """测试: 失败记录应保留完整错误原因"""
        bad_temp_data = {
            "sample_label_id": 88888,
            "record_time": "2026-05-25T10:00:00",
            "temperature": 20.0,
            "recorder": "测试员"
        }
        
        client.post(
            "/temperature-records/",
            json=bad_temp_data,
            headers={"X-User-Id": "test_user"}
        )
        
        failed_response = client.get("/failed-records/")
        failed_records = failed_response.json()
        
        latest_failed = failed_records[-1]
        assert "留样标签ID 88888 不存在" in latest_failed["error_message"]
        assert "88888" in latest_failed["source_data"]

    def test_multiple_bad_data_all_captured(self, client):
        """测试: 多条坏数据全部被捕获到失败记录表"""
        for i in range(3):
            bad_temp_data = {
                "sample_label_id": 10000 + i,
                "record_time": "2026-05-25T10:00:00",
                "temperature": 20.0,
                "recorder": "测试员"
            }
            client.post(
                "/temperature-records/",
                json=bad_temp_data,
                headers={"X-User-Id": "test_user"}
            )
        
        failed_response = client.get("/failed-records/?source_type=temperature")
        failed_records = failed_response.json()
        
        assert len(failed_records) >= 3

    def test_good_data_not_in_failed_records(self, client, create_sample_label):
        """测试: 有效数据不应出现在失败记录表中"""
        label = create_sample_label("BAD_DATA_003")
        
        temp_data = {
            "sample_label_id": label["id"],
            "record_time": "2026-05-25T10:00:00",
            "temperature": 5.0,
            "recorder": "测试员"
        }
        client.post(
            "/temperature-records/",
            json=temp_data,
            headers={"X-User-Id": "test_user"}
        )
        
        failed_response = client.get("/failed-records/")
        failed_records = failed_response.json()
        
        for record in failed_records:
            assert f'"sample_label_id": {label["id"]}' not in record["source_data"]

    def test_inactive_sample_label_rejected(self, client, create_sample_label):
        """测试: 关联已删除的留样标签应被拦截"""
        label = create_sample_label("BAD_DATA_004")
        
        from tests.conftest import TestingSessionLocal
        from app import models
        
        db = TestingSessionLocal()
        db_label = db.query(models.SampleLabel).filter(models.SampleLabel.id == label["id"]).first()
        db_label.is_active = False
        db.commit()
        db.close()
        
        temp_data = {
            "sample_label_id": label["id"],
            "record_time": "2026-05-25T10:00:00",
            "temperature": 5.0,
            "recorder": "测试员"
        }
        
        response = client.post(
            "/temperature-records/",
            json=temp_data,
            headers={"X-User-Id": "test_user"}
        )
        
        assert response.status_code == 400
        assert "不存在" in response.json()["detail"]
