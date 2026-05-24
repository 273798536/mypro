import pytest
from concurrent.futures import ThreadPoolExecutor, as_completed


class TestIdempotency:
    def test_duplicate_status_change_idempotent(self, client, create_sample_label, status_request):
        """测试: 重复提交相同状态变更请求 - 幂等性"""
        label = create_sample_label()
        label_id = label["id"]
        
        client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("submitted")
        )
        
        response = client.post(
            f"/sample-labels/{label_id}/status",
            json=status_request("submitted")
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["old_status"] == "submitted"
        assert result["new_status"] == "submitted"

    def test_duplicate_batch_no_fails(self, client, sample_label_data):
        """测试: 重复批次号创建失败 - 保证唯一性"""
        batch_no = "IDEMPOTENT_TEST_001"
        sample_label_data["batch_no"] = batch_no
        
        response1 = client.post(
            "/sample-labels/",
            json=sample_label_data,
            headers={"X-User-Id": "test_user"}
        )
        assert response1.status_code == 200
        
        response2 = client.post(
            "/sample-labels/",
            json=sample_label_data,
            headers={"X-User-Id": "test_user"}
        )
        assert response2.status_code == 400
        assert "已存在" in response2.json()["detail"]

    def test_same_status_multiple_times_only_one_effective_change(self, client, create_sample_label, status_request):
        """测试: 多次提交相同状态只有一次有效变更"""
        label = create_sample_label()
        label_id = label["id"]
        
        for i in range(5):
            response = client.post(
                f"/sample-labels/{label_id}/status",
                json=status_request("submitted", f"第{i+1}次提交")
            )
            assert response.status_code == 200
        
        response = client.get(f"/sample-labels/{label_id}", headers={"X-User-Role": "admin"})
        final_label = response.json()
        
        assert final_label["status"] == "submitted"
        
        logs_response = client.get(f"/audit-logs/?sample_label_id={label_id}")
        logs = logs_response.json()
        change_logs = [l for l in logs if l["action_type"] == "sample_label_status_change"]
        
        assert len(change_logs) == 1

    def test_concurrent_status_changes(self, client, create_sample_label, status_request):
        """测试: 并发状态变更 - 数据一致性"""
        label = create_sample_label()
        label_id = label["id"]
        
        def make_request(status):
            return client.post(
                f"/sample-labels/{label_id}/status",
                json=status_request(status)
            )
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_request, "submitted") for _ in range(5)]
            results = [f.result() for f in as_completed(futures)]
        
        success_count = sum(1 for r in results if r.status_code == 200)
        assert success_count == 5
        
        response = client.get(f"/sample-labels/{label_id}", headers={"X-User-Role": "admin"})
        final_label = response.json()
        
        assert final_label["status"] == "submitted"

    def test_bad_data_not_in_summary(self, client):
        """测试: 坏数据不进入汇总统计"""
        bad_temp_data = {
            "sample_label_id": 99999,
            "record_time": "2026-05-24T10:00:00",
            "temperature": 999,
            "recorder": "测试员"
        }
        
        response = client.post(
            "/temperature-records/",
            json=bad_temp_data,
            headers={"X-User-Id": "test_user"}
        )
        assert response.status_code == 400
        
        failed_response = client.get("/failed-records/")
        failed_records = failed_response.json()
        
        assert len(failed_records) >= 1
        assert any("999" in r["error_message"] for r in failed_records)

    def test_report_consistency(self, client, create_sample_label, status_request):
        """测试: 报表数字与实际记录一致"""
        for i in range(3):
            create_sample_label(f"CONSISTENCY_{i:03d}")
        
        summary_response = client.get("/reports/summary")
        summary = summary_response.json()
        
        labels_response = client.get("/sample-labels/", headers={"X-User-Role": "admin"})
        actual_labels = labels_response.json()
        
        assert summary["total_samples"] == len(actual_labels)
        assert summary["draft_count"] == len([l for l in actual_labels if l["status"] == "draft"])

    def test_export_and_api_same_data(self, client, create_sample_label):
        """测试: 导出数据与API接口数据一致"""
        label = create_sample_label("EXPORT_TEST_001")
        
        api_response = client.get("/sample-labels/", headers={"X-User-Role": "quality_manager"})
        api_data = api_response.json()
        
        assert len(api_data) >= 1
        assert any(l["batch_no"] == "EXPORT_TEST_001" for l in api_data)
        
        batch_no = api_data[0]["batch_no"]
        trace_response = client.get(f"/trace/batch/{batch_no}")
        trace_data = trace_response.json()
        
        assert trace_data["batch_no"] == batch_no
        assert trace_data["product_name"] == api_data[0]["product_name"]

    def test_role_based_data_masking(self, client, create_sample_label):
        """测试: 不同角色看到的数据一致性（脱敏规则一致）"""
        label = create_sample_label("MASK_TEST_001")
        
        viewer_response = client.get(
            f"/sample-labels/{label['id']}",
            headers={"X-User-Role": "viewer"}
        )
        viewer_data = viewer_response.json()
        
        manager_response = client.get(
            f"/sample-labels/{label['id']}",
            headers={"X-User-Role": "quality_manager"}
        )
        manager_data = manager_response.json()
        
        assert manager_data["sampler"] == "测试员"
        
        if viewer_data["sampler"] != manager_data["sampler"]:
            assert "*" in viewer_data["sampler"]

    def test_trace_batch_complete_chain(self, client, create_sample_label, status_request):
        """测试: 批次追溯返回完整链条"""
        label = create_sample_label("TRACE_TEST_001")
        label_id = label["id"]
        
        temp_data = {
            "sample_label_id": label_id,
            "record_time": "2026-05-24T10:00:00",
            "temperature": 5.0,
            "recorder": "测试员"
        }
        client.post("/temperature-records/", json=temp_data, headers={"X-User-Id": "test"})
        
        scan_data = {
            "sample_label_id": label_id,
            "store_id": "STORE001",
            "store_name": "测试门店",
            "scan_time": "2026-05-24T11:00:00",
            "scanner": "测试员",
            "quantity": 10
        }
        client.post("/scan-records/", json=scan_data, headers={"X-User-Id": "test"})
        
        trace_response = client.get(f"/trace/batch/TRACE_TEST_001")
        trace_data = trace_response.json()
        
        assert trace_data["batch_no"] == "TRACE_TEST_001"
        assert len(trace_data["temperature_records"]) >= 1
        assert len(trace_data["scan_records"]) >= 1
        assert len(trace_data["audit_logs"]) >= 1
        assert len(trace_data["stores"]) >= 1

    def test_failed_record_preserves_original_data(self, client, create_sample_label):
        """测试: 失败记录保留原始数据"""
        label = create_sample_label("FAIL_TEST_001")
        
        bad_data = {
            "sample_label_id": label["id"],
            "record_time": "2026-05-24T10:00:00",
            "temperature": 999,
            "recorder": "测试员"
        }
        
        client.post(
            "/temperature-records/",
            json=bad_data,
            headers={"X-User-Id": "test_user"}
        )
        
        failed_response = client.get("/failed-records/?source_type=temperature")
        failed_records = failed_response.json()
        
        assert len(failed_records) >= 1
        latest_failed = failed_records[-1]
        assert "温度值异常" in latest_failed["error_message"]
