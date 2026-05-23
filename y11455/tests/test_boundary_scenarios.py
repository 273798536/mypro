import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pandas as pd
import io

from main import app
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def create_test_excel(data):
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)
    return output


class TestScenario1_DuplicateSubmission:
    """测试场景1: 重复提交"""

    def test_duplicate_batch_import(self):
        """同批次号重复导入应不创建新记录"""
        
        data = [
            {"订单号": "OD001", "团长ID": "T001", "团长名称": "张团长", "城市": "北京市", 
             "退款金额": 58.5, "退款原因": "商品少发", "异常类型": "少发"}
        ]
        excel_file = create_test_excel(data)

        response1 = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-TEST-001",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert response1.status_code == 200
        result1 = response1.json()
        assert result1["total_count"] == 1
        assert result1["success_count"] == 1
        assert result1["is_duplicate_batch"] == False

        excel_file2 = create_test_excel(data)
        response2 = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-TEST-001",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert response2.status_code == 200
        result2 = response2.json()
        assert result2["is_duplicate_batch"] == True

        receipts_response = client.get("/api/v1/receipts/")
        assert receipts_response.status_code == 200
        receipts = receipts_response.json()
        assert len(receipts) == 1


class TestScenario2_CancelAndResubmit:
    """测试场景2: 撤回后再提交"""

    def test_cancel_then_review(self):
        """已撤回的记录应能重新复核"""
        
        data = [
            {"订单号": "OD002", "团长ID": "T002", "团长名称": "李团长", "城市": "上海市",
             "退款金额": 100, "退款原因": "商品损坏", "异常类型": "坏品"}
        ]
        excel_file = create_test_excel(data)

        import_response = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-TEST-002",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert import_response.status_code == 200

        receipts_response = client.get("/api/v1/receipts/")
        receipt_id = receipts_response.json()[0]["id"]

        cancel_response = client.post(
            "/api/v1/receipts/cancel",
            json={
                "receipt_ids": [receipt_id],
                "cancel_reason": "信息有误，需要重新核对",
                "operator": "测试员B"
            }
        )
        assert cancel_response.status_code == 200
        assert cancel_response.json()["success"] == 1

        receipt_detail = client.get(f"/api/v1/receipts/{receipt_id}")
        assert receipt_detail.json()["current_status"] == "已撤回"

        review_response = client.post(
            "/api/v1/receipts/review",
            json={
                "receipt_ids": [receipt_id],
                "review_result": "已通过",
                "review_remark": "重新核对无误",
                "operator": "测试员C",
                "compensate_amount": 100
            }
        )
        assert review_response.status_code == 200
        assert review_response.json()["success"] == 1

        receipt_detail2 = client.get(f"/api/v1/receipts/{receipt_id}")
        assert receipt_detail2.json()["current_status"] == "已通过"


class TestScenario3_PartialFailure:
    """测试场景3: 部分失败"""

    def test_partial_import_failure(self):
        """部分数据解析失败应返回详细错误信息"""
        
        data = [
            {"订单号": "OD003", "团长ID": "T003", "团长名称": "王团长", "城市": "广州市",
             "退款金额": 50, "退款原因": "少发", "异常类型": "少发"},
            {"订单号": "OD004", "团长ID": "", "团长名称": "失败测试", "城市": "深圳市",
             "退款金额": 30, "退款原因": "坏品", "异常类型": "坏品"}
        ]
        excel_file = create_test_excel(data)

        response = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-TEST-003",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["total_count"] == 2
        assert result["success_count"] == 1
        assert result["fail_count"] == 1


class TestScenario4_ManualOverrule:
    """测试场景4: 人工改判"""

    def test_manual_overrule(self):
        """人工改判应保留历史记录"""
        
        data = [
            {"订单号": "OD004", "团长ID": "T004", "团长名称": "赵团长", "城市": "深圳市",
             "退款金额": 80, "退款原因": "少发", "异常类型": "少发"}
        ]
        excel_file = create_test_excel(data)

        import_response = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-TEST-004",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert import_response.status_code == 200

        receipts_response = client.get("/api/v1/receipts/")
        receipt_id = receipts_response.json()[0]["id"]

        review_response = client.post(
            "/api/v1/receipts/review",
            json={
                "receipt_ids": [receipt_id],
                "review_result": "已驳回",
                "review_remark": "证据不足",
                "operator": "测试员B"
            }
        )
        assert review_response.status_code == 200

        overrule_response = client.post(
            "/api/v1/receipts/overrule",
            json={
                "receipt_id": receipt_id,
                "new_status": "已通过",
                "overrule_reason": "补充了照片证据，确认少发",
                "new_compensate_amount": 80,
                "new_responsibility": "仓库",
                "operator": "主管A"
            }
        )
        assert overrule_response.status_code == 200
        assert overrule_response.json()["success"] == True

        receipt_detail = client.get(f"/api/v1/receipts/{receipt_id}")
        detail = receipt_detail.json()
        assert detail["current_status"] == "已通过"
        assert detail["is_manually_overruled"] == True
        assert detail["manual_review_reason"] == "补充了照片证据，确认少发"
        assert len(detail["overrule_histories"]) == 1


class TestScenario5_FreezeBeforeExport:
    """测试场景5: 导出前冻结"""

    def test_freeze_unfreeze(self):
        """冻结后应不能修改，解冻后恢复原状态"""
        
        data = [
            {"订单号": "OD005", "团长ID": "T005", "团长名称": "孙团长", "城市": "杭州市",
             "退款金额": 120, "退款原因": "坏品", "异常类型": "坏品"}
        ]
        excel_file = create_test_excel(data)

        import_response = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-TEST-005",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert import_response.status_code == 200

        receipts_response = client.get("/api/v1/receipts/")
        receipt_id = receipts_response.json()[0]["id"]

        review_response = client.post(
            "/api/v1/receipts/review",
            json={
                "receipt_ids": [receipt_id],
                "review_result": "已通过",
                "operator": "测试员B"
            }
        )
        assert review_response.status_code == 200

        freeze_response = client.post(
            "/api/v1/receipts/freeze",
            json={
                "receipt_ids": [receipt_id],
                "freeze_reason": "待导出前冻结",
                "operator": "结算员A"
            }
        )
        assert freeze_response.status_code == 200
        assert freeze_response.json()["success"] == 1

        receipt_detail = client.get(f"/api/v1/receipts/{receipt_id}")
        detail = receipt_detail.json()
        assert detail["current_status"] == "已冻结"
        assert detail["is_frozen"] == True
        assert detail["status_before_freeze"] == "已通过"

        review_while_frozen = client.post(
            "/api/v1/receipts/review",
            json={
                "receipt_ids": [receipt_id],
                "review_result": "已驳回",
                "operator": "测试员C"
            }
        )
        assert review_while_frozen.status_code == 200
        assert review_while_frozen.json()["failed"] == 1

        unfreeze_response = client.post(
            "/api/v1/receipts/unfreeze",
            json={
                "receipt_ids": [receipt_id],
                "unfreeze_reason": "导出完成，解冻",
                "operator": "结算员A"
            }
        )
        assert unfreeze_response.status_code == 200
        assert unfreeze_response.json()["success"] == 1

        receipt_detail2 = client.get(f"/api/v1/receipts/{receipt_id}")
        detail2 = receipt_detail2.json()
        assert detail2["current_status"] == "已通过"
        assert detail2["is_frozen"] == False


class TestReports:
    """测试报表功能"""

    def test_city_summary_report(self):
        """城市汇总报表应正确统计"""
        
        data1 = [
            {"订单号": "OD101", "团长ID": "T101", "团长名称": "团长A", "城市": "北京市",
             "退款金额": 50, "退款原因": "少发", "异常类型": "少发"},
            {"订单号": "OD102", "团长ID": "T102", "团长名称": "团长B", "城市": "北京市",
             "退款金额": 100, "退款原因": "坏品", "异常类型": "坏品"},
            {"订单号": "OD103", "团长ID": "T103", "团长名称": "团长C", "城市": "上海市",
             "退款金额": 75, "退款原因": "错发", "异常类型": "错发"}
        ]
        excel_file = create_test_excel(data1)

        import_response = client.post(
            "/api/v1/batches/import/leader-refunds",
            data={
                "batch_no": "BATCH-REPORT-001",
                "operator": "测试员A"
            },
            files={"file": ("test.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert import_response.status_code == 200

        summary_response = client.get("/api/v1/reports/city-summary")
        assert summary_response.status_code == 200
        summary = summary_response.json()
        
        beijing = next((x for x in summary if x["city"] == "北京市"), None)
        assert beijing is not None
        assert beijing["total_count"] == 2
        assert beijing["total_refund_amount"] == 150

        export_response = client.get("/api/v1/reports/export-summary")
        assert export_response.status_code == 200
        export_data = export_response.json()
        assert len(export_data) == 3
        assert "status_before_freeze" in export_data[0]
        assert "is_manually_overruled" in export_data[0]
