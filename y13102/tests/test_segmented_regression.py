import sys
import os
import json
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, engine, get_db
from app.models import (
    Parameter, ParameterHistory, Remark, Screenshot,
    CalculationRequest, CalculationResult, ChangeTrace,
    ScreenshotStatus, ResultStatus, ChangeCause
)
from app.services.parameter_service import ParameterService
from app.services.calculation_service import SegmentedRegressionService
from app.schemas import (
    ParameterCreate, ParameterUpdate, RemarkCreate,
    ScreenshotCreate, CalculationRequestCreate
)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_segmented_regression.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

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
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

class TestIdempotency:
    def test_duplicate_calculation_returns_same_result(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_param_1",
            param_name="测试参数1",
            current_value=10.0,
            unit="mg/dL",
            threshold_low=5.0,
            threshold_high=15.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6},
            {"x": 6, "y": 18}, {"x": 7, "y": 21}, {"x": 8, "y": 24}
        ]

        result1 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        result2 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result2.get("is_duplicate") == True
        assert result1["result"].id == result2["result"].id
        assert result1["result"].version == result2["result"].version

        result_count = db.query(CalculationResult).filter(
            CalculationResult.parameter_id == param.id
        ).count()
        assert result_count == 1

        db.close()

    def test_duplicate_remark_not_created(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_param_2",
            param_name="测试参数2",
            current_value=10.0,
            unit="mg/dL"
        ))

        remark1 = param_service.add_remark(RemarkCreate(
            parameter_id=param.id,
            content="这是一条后补备注",
            remark_type="后补备注",
            created_by="测试员"
        ))

        remark2 = param_service.add_remark(RemarkCreate(
            parameter_id=param.id,
            content="这是一条后补备注",
            remark_type="后补备注",
            created_by="测试员"
        ))

        assert remark1.id == remark2.id

        remark_count = db.query(Remark).filter(
            Remark.parameter_id == param.id
        ).count()
        assert remark_count == 1

        db.close()

    def test_different_remarks_created_separately(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_param_3",
            param_name="测试参数3",
            current_value=10.0,
            unit="mg/dL"
        ))

        remark1 = param_service.add_remark(RemarkCreate(
            parameter_id=param.id,
            content="第一条后补备注",
            created_by="测试员"
        ))

        remark2 = param_service.add_remark(RemarkCreate(
            parameter_id=param.id,
            content="第二条不同的后补备注",
            created_by="测试员"
        ))

        assert remark1.id != remark2.id

        remark_count = db.query(Remark).filter(
            Remark.parameter_id == param.id
        ).count()
        assert remark_count == 2

        db.close()


class TestUnitMissing:
    def test_unit_missing_suspends_calculation(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_no_unit",
            param_name="无单位参数",
            current_value=10.0,
            unit=None,
            threshold_low=5.0,
            threshold_high=15.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6},
            {"x": 6, "y": 18}, {"x": 7, "y": 21}, {"x": 8, "y": 24}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result["result"].result_status == ResultStatus.SUSPENDED
        assert "单位缺失" in result["result"].suspend_reason
        assert result["result"].result_value is None
        assert result["result"].segments is None

        db.close()

    def test_unit_present_allows_calculation(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_with_unit",
            param_name="有单位参数",
            current_value=10.0,
            unit="mg/dL",
            threshold_low=5.0,
            threshold_high=15.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6},
            {"x": 6, "y": 18}, {"x": 7, "y": 21}, {"x": 8, "y": 24}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result["result"].result_status == ResultStatus.NORMAL
        assert result["result"].suspend_reason is None
        assert result["result"].result_value is not None
        assert result["result"].segments is not None

        db.close()

    def test_empty_unit_string_suspends(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_empty_unit",
            param_name="空单位参数",
            current_value=10.0,
            unit="   ",
            threshold_low=5.0,
            threshold_high=15.0
        ))

        sample_data = [
            {"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6},
            {"x": 6, "y": 18}, {"x": 7, "y": 21}, {"x": 8, "y": 24}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result["result"].result_status == ResultStatus.SUSPENDED

        db.close()


class TestBoundarySamples:
    def test_insufficient_boundary_samples_suspends(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_boundary",
            param_name="边界测试参数",
            current_value=10.0,
            unit="mg/dL",
            threshold_low=5.0,
            threshold_high=15.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 6, "y": 7}, {"x": 7, "y": 8}, {"x": 8, "y": 9},
            {"x": 10, "y": 11}, {"x": 11, "y": 12}, {"x": 12, "y": 13}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result["result"].result_status == ResultStatus.SUSPENDED
        assert "边界样本不足" in result["result"].suspend_reason

        db.close()

    def test_sufficient_boundary_samples_allowed(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_good_boundary",
            param_name="边界充足参数",
            current_value=10.0,
            unit="mg/dL",
            threshold_low=5.0,
            threshold_high=15.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 2, "y": 3}, {"x": 4, "y": 5},
            {"x": 7, "y": 8}, {"x": 10, "y": 12},
            {"x": 17, "y": 20}, {"x": 20, "y": 25}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result["result"].result_status == ResultStatus.NORMAL

        db.close()


class TestHistoryVersioning:
    def test_parameter_update_creates_history(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_history",
            param_name="历史测试参数",
            current_value=10.0,
            unit="mg/dL",
            threshold_low=5.0,
            threshold_high=15.0
        ))

        initial_history_count = db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == param.id
        ).count()
        assert initial_history_count == 1

        param_service.update_parameter(param.id, ParameterUpdate(
            current_value=20.0,
            threshold_low=3.0,
            change_reason="测试更新参数",
            changed_by="测试员"
        ))

        history_count = db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == param.id
        ).count()
        assert history_count == 2

        latest_history = db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == param.id
        ).order_by(ParameterHistory.version.desc()).first()

        assert latest_history.version == 2
        assert latest_history.value == 20.0
        assert latest_history.threshold_low == 3.0
        assert latest_history.change_reason == "测试更新参数"
        assert latest_history.changed_by == "测试员"

        db.close()

    def test_history_preserves_all_versions(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_multi_history",
            param_name="多版本测试",
            current_value=10.0,
            unit="mg/dL"
        ))

        param_service.update_parameter(param.id, ParameterUpdate(current_value=20.0))
        param_service.update_parameter(param.id, ParameterUpdate(current_value=30.0, unit="mmol/L"))
        param_service.update_parameter(param.id, ParameterUpdate(threshold_low=5.0, threshold_high=25.0))

        history = param_service.get_parameter_history(param.id)
        assert len(history) == 4
        assert history[0].version == 4
        assert history[1].version == 3
        assert history[2].version == 2
        assert history[3].version == 1

        assert history[0].threshold_low == 5.0
        assert history[1].unit == "mmol/L"
        assert history[2].value == 20.0
        assert history[3].value == 10.0

        db.close()


class TestJumpDetection:
    def test_threshold_change_causes_jump(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_jump_threshold",
            param_name="跳变测试-阈值",
            current_value=50.0,
            unit="mg/dL",
            threshold_low=10.0,
            threshold_high=90.0,
            segment_count=3
        ))

        sample_data = [
            {"x": 1, "y": 5}, {"x": 5, "y": 25}, {"x": 10, "y": 55},
            {"x": 50, "y": 200}, {"x": 90, "y": 350}, {"x": 95, "y": 380}
        ]

        result1 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        param_service.update_parameter(param.id, ParameterUpdate(
            threshold_low=30.0,
            threshold_high=70.0,
            change_reason="阈值调整",
            changed_by="医生"
        ))

        result2 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result2["result"].is_jump == True
        assert result2["result"].jump_cause == ChangeCause.THRESHOLD
        assert "阈值" in result2["result"].jump_description

        change_traces = db.query(ChangeTrace).filter(
            ChangeTrace.result_id == result2["result"].id
        ).all()
        assert len(change_traces) >= 1
        assert change_traces[0].change_cause == ChangeCause.THRESHOLD

        db.close()

    def test_unit_change_causes_jump(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_jump_unit",
            param_name="跳变测试-单位",
            current_value=100.0,
            unit="mg/dL",
            threshold_low=10.0,
            threshold_high=200.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 1, "y": 10}, {"x": 5, "y": 50}, {"x": 10, "y": 100},
            {"x": 20, "y": 200}, {"x": 30, "y": 300}, {"x": 40, "y": 400}
        ]

        result1 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        param_service.update_parameter(param.id, ParameterUpdate(
            unit="mmol/L",
            current_value=5.55,
            change_reason="单位换算",
            changed_by="检验师"
        ))

        result2 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result2["result"].is_jump == True
        assert result2["result"].jump_cause == ChangeCause.UNIT

        db.close()

    def test_remark_change_causes_jump(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_jump_remark",
            param_name="跳变测试-备注",
            current_value=50.0,
            unit="mg/dL",
            threshold_low=10.0,
            threshold_high=90.0,
            segment_count=2
        ))

        sample_data = [
            {"x": 1, "y": 5}, {"x": 5, "y": 25}, {"x": 10, "y": 55},
            {"x": 50, "y": 200}, {"x": 90, "y": 350}, {"x": 95, "y": 380}
        ]

        result1 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        param_service.add_remark(RemarkCreate(
            parameter_id=param.id,
            content="重要：该批次样本检测仪器经过校准，结果整体偏高5%",
            created_by="复核员"
        ))

        param_service.update_parameter(param.id, ParameterUpdate(
            current_value=52.5,
            change_reason="根据备注调整",
            changed_by="系统"
        ))

        result2 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=sample_data
        ))

        assert result2["result"].is_jump == True
        assert result2["result"].jump_cause in [ChangeCause.REMARK, ChangeCause.THRESHOLD]

        db.close()


class TestScreenshotStatus:
    def test_screenshot_status_classification(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_screenshot",
            param_name="截图测试参数",
            current_value=10.0,
            unit="mg/dL"
        ))

        param_service.add_screenshot(ScreenshotCreate(
            parameter_id=param.id,
            file_path="/screenshots/processed.png",
            description="已处理截图",
            status=ScreenshotStatus.PROCESSED
        ))

        param_service.add_screenshot(ScreenshotCreate(
            parameter_id=param.id,
            file_path="/screenshots/pending.png",
            description="待补材料截图",
            status=ScreenshotStatus.PENDING_MATERIAL
        ))

        param_service.add_screenshot(ScreenshotCreate(
            parameter_id=param.id,
            file_path="/screenshots/manual.png",
            description="人工改判截图",
            status=ScreenshotStatus.MANUAL_JUDGMENT
        ))

        all_screenshots = param_service.get_screenshots(param.id)
        assert len(all_screenshots) == 3

        processed = param_service.get_screenshots(param.id, ScreenshotStatus.PROCESSED)
        assert len(processed) == 1
        assert processed[0].status == ScreenshotStatus.PROCESSED

        pending = param_service.get_screenshots(param.id, ScreenshotStatus.PENDING_MATERIAL)
        assert len(pending) == 1
        assert pending[0].status == ScreenshotStatus.PENDING_MATERIAL

        manual = param_service.get_screenshots(param.id, ScreenshotStatus.MANUAL_JUDGMENT)
        assert len(manual) == 1
        assert manual[0].status == ScreenshotStatus.MANUAL_JUDGMENT

        by_status = param_service.get_screenshots_by_status(param.id)
        assert len(by_status["processed"]) == 1
        assert len(by_status["pending"]) == 1
        assert len(by_status["manual"]) == 1

        db.close()

    def test_update_screenshot_status(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="test_screenshot_update",
            param_name="截图状态更新",
            current_value=10.0,
            unit="mg/dL"
        ))

        screenshot = param_service.add_screenshot(ScreenshotCreate(
            parameter_id=param.id,
            file_path="/screenshots/test.png",
            description="测试截图",
            status=ScreenshotStatus.PENDING_MATERIAL
        ))

        assert screenshot.status == ScreenshotStatus.PENDING_MATERIAL

        updated = param_service.update_screenshot_status(screenshot.id, ScreenshotUpdate(
            status=ScreenshotStatus.PROCESSED,
            description="测试截图-已复核"
        ))

        assert updated.status == ScreenshotStatus.PROCESSED
        assert updated.description == "测试截图-已复核"

        db.close()


class TestSegmentedRegression:
    def test_basic_segmented_regression(self):
        db = TestingSessionLocal()
        calc_service = SegmentedRegressionService(db)

        sample_data = [
            {"x": 1, "y": 2.1}, {"x": 2, "y": 3.9}, {"x": 3, "y": 6.2},
            {"x": 6, "y": 18.1}, {"x": 7, "y": 21.0}, {"x": 8, "y": 23.8}
        ]

        result = calc_service.perform_segmented_regression(
            sample_data,
            segment_count=2,
            threshold_low=4.0,
            threshold_high=5.0
        )

        assert result["success"] == True
        assert len(result["segments"]) >= 2
        assert result["overall_r_squared"] is not None
        assert result["overall_r_squared"] > 0.9
        assert result["result_value"] is not None

        for seg in result["segments"]:
            assert "slope" in seg
            assert "intercept" in seg
            assert "r_squared" in seg
            assert seg["sample_count"] >= 2

        db.close()

    def test_insufficient_samples_returns_error(self):
        db = TestingSessionLocal()
        calc_service = SegmentedRegressionService(db)

        sample_data = [{"x": 1, "y": 2}, {"x": 2, "y": 4}]

        result = calc_service.perform_segmented_regression(
            sample_data,
            segment_count=2
        )

        assert result["success"] == False
        assert "样本数量不足" in result["error"]

        db.close()


class TestAPIEndpoints:
    def test_create_parameter_api(self):
        response = client.post("/api/parameters/", json={
            "param_key": "api_test_1",
            "param_name": "API测试参数",
            "current_value": 15.5,
            "unit": "mmol/L",
            "threshold_low": 3.9,
            "threshold_high": 6.1,
            "segment_count": 3
        })
        assert response.status_code == 200
        data = response.json()
        assert data["param_key"] == "api_test_1"
        assert data["param_name"] == "API测试参数"
        assert data["unit"] == "mmol/L"

    def test_list_parameters_api(self):
        client.post("/api/parameters/", json={
            "param_key": "api_list_1",
            "param_name": "列表测试1",
            current_value: 10.0,
            "unit": "mg/dL"
        })
        client.post("/api/parameters/", json={
            "param_key": "api_list_2",
            "param_name": "列表测试2",
            current_value: 20.0,
            "unit": "mg/dL"
        })

        response = client.get("/api/parameters/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_calculate_api(self):
        param_response = client.post("/api/parameters/", json={
            "param_key": "api_calc",
            "param_name": "计算测试",
            "current_value": 10.0,
            "unit": "mg/dL",
            "threshold_low": 5.0,
            "threshold_high": 15.0
        })
        param_id = param_response.json()["id"]

        sample_data = [
            {"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6},
            {"x": 6, "y": 18}, {"x": 7, "y": 21}, {"x": 8, "y": 24}
        ]

        response = client.post("/api/calculate/", json={
            "parameter_id": param_id,
            "sample_data": sample_data
        })
        assert response.status_code == 200
        data = response.json()
        assert data["result_status"] == "正常"
        assert data["result_value"] is not None
        assert len(data["segments"]) >= 2

    def test_calculate_api_idempotency(self):
        param_response = client.post("/api/parameters/", json={
            "param_key": "api_idempotent",
            "param_name": "幂等测试",
            "current_value": 10.0,
            "unit": "mg/dL",
            "threshold_low": 5.0,
            "threshold_high": 15.0
        })
        param_id = param_response.json()["id"]

        sample_data = [
            {"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6},
            {"x": 6, "y": 18}, {"x": 7, "y": 21}, {"x": 8, "y": 24}
        ]

        response1 = client.post("/api/calculate/", json={
            "parameter_id": param_id,
            "sample_data": sample_data
        })
        result1 = response1.json()

        response2 = client.post("/api/calculate/", json={
            "parameter_id": param_id,
            "sample_data": sample_data
        })
        result2 = response2.json()

        assert result1["id"] == result2["id"]
        assert result1["version"] == result2["version"]

    def test_jump_analysis_api(self):
        param_response = client.post("/api/parameters/", json={
            "param_key": "api_jump",
            "param_name": "跳变分析测试",
            "current_value": 50.0,
            "unit": "mg/dL",
            "threshold_low": 10.0,
            threshold_high: 90.0,
            "segment_count": 3
        })
        param_id = param_response.json()["id"]

        sample_data = [
            {"x": 1, "y": 5}, {"x": 5, "y": 25}, {"x": 10, "y": 55},
            {"x": 50, "y": 200}, {"x": 90, "y": 350}, {"x": 95, "y": 380}
        ]

        client.post("/api/calculate/", json={
            "parameter_id": param_id,
            "sample_data": sample_data
        })

        client.put(f"/api/parameters/{param_id}", json={
            "threshold_low": 30.0,
            "threshold_high": 70.0,
            "change_reason": "API测试阈值调整",
            "changed_by": "测试员"
        })

        response2 = client.post("/api/calculate/", json={
            "parameter_id": param_id,
            "sample_data": sample_data
        })
        result2 = response2.json()

        if result2["is_jump"]:
            analysis_response = client.get(f"/api/results/{result2['id']}/jump-analysis")
            assert analysis_response.status_code == 200
            analysis = analysis_response.json()
            assert analysis["is_jump"] == True
            assert "jump_cause" in analysis
            assert len(analysis["change_traces"]) >= 1

    def test_add_remark_api(self):
        param_response = client.post("/api/parameters/", json={
            "param_key": "api_remark",
            "param_name": "备注测试",
            "current_value": 10.0,
            "unit": "mg/dL"
        })
        param_id = param_response.json()["id"]

        response = client.post("/api/remarks/", json={
            "parameter_id": param_id,
            "content": "API测试后补备注",
            "remark_type": "后补备注",
            "created_by": "API测试员"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "API测试后补备注"
        assert data["idempotency_key"] is not None
        assert len(data["idempotency_key"]) == 64

    def test_get_parameter_detail_api(self):
        param_response = client.post("/api/parameters/", json={
            "param_key": "api_detail",
            "param_name": "详情测试",
            "current_value": 10.0,
            "unit": "mg/dL",
            "threshold_low": 5.0,
            "threshold_high": 15.0
        })
        param_id = param_response.json()["id"]

        client.post("/api/remarks/", json={
            "parameter_id": param_id,
            "content": "详情测试备注",
            "created_by": "测试员"
        })

        client.post("/api/screenshots/", json={
            "parameter_id": param_id,
            "file_path": "/screenshots/detail_test.png",
            "description": "详情测试截图",
            "status": "已处理"
        })

        response = client.get(f"/api/parameters/{param_id}")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert "remarks" in data
        assert "screenshots" in data
        assert len(data["history"]) >= 1
        assert len(data["remarks"]) >= 1
        assert len(data["screenshots"]) >= 1


class TestThreeDemoCases:
    def test_case_1_successful_record(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="demo_glucose",
            param_name="血糖浓度",
            current_value=5.6,
            unit="mmol/L",
            threshold_low=3.9,
            threshold_high=6.1,
            segment_count=3
        ))

        samples = [
            {"x": 2, "y": 4.2}, {"x": 3, "y": 5.8}, {"x": 4, "y": 7.5},
            {"x": 5, "y": 9.8}, {"x": 7, "y": 12.5}, {"x": 10, "y": 18.2},
            {"x": 12, "y": 22.1}, {"x": 15, "y": 28.5}, {"x": 18, "y": 35.2}, {"x": 20, "y": 40.1}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=samples
        ))

        assert result["result"].result_status == ResultStatus.NORMAL
        assert result["result"].result_value is not None
        assert result["result"].r_squared is not None
        assert result["result"].segments is not None
        assert result["boundary_check"]["has_enough_boundary"] == True

        db.close()

    def test_case_2_supplement_record(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="demo_blood_pressure",
            param_name="血压收缩压",
            current_value=125,
            unit=None,
            threshold_low=90,
            threshold_high=140,
            segment_count=2
        ))

        samples = [
            {"x": 1, "y": 118}, {"x": 2, "y": 122}, {"x": 3, "y": 128}
        ]

        result = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=samples
        ))

        assert result["result"].result_status == ResultStatus.SUSPENDED
        assert result["result"].suspend_reason is not None
        assert "单位缺失" in result["result"].suspend_reason

        remark = param_service.add_remark(RemarkCreate(
            parameter_id=param.id,
            content="2024年6月临床数据回溯，该批次样本采集时间存在偏差",
            created_by="复核人-小孟"
        ))

        screenshot1 = param_service.add_screenshot(ScreenshotCreate(
            parameter_id=param.id,
            file_path="/screenshots/bp_v1.png",
            description="2024年1月原始数据截图",
            status=ScreenshotStatus.PENDING_MATERIAL
        ))

        screenshot2 = param_service.add_screenshot(ScreenshotCreate(
            parameter_id=param.id,
            file_path="/screenshots/bp_v2.png",
            description="2024年6月修正数据截图",
            status=ScreenshotStatus.PROCESSED
        ))

        remarks = param_service.get_remarks(param.id)
        screenshots = param_service.get_screenshots(param.id)
        assert len(remarks) == 1
        assert len(screenshots) == 2

        by_status = param_service.get_screenshots_by_status(param.id)
        assert len(by_status["pending"]) == 1
        assert len(by_status["processed"]) == 1
        assert len(by_status["manual"]) == 0

        db.close()

    def test_case_3_abnormal_record(self):
        db = TestingSessionLocal()
        param_service = ParameterService(db)
        calc_service = SegmentedRegressionService(db)

        param = param_service.create_parameter(ParameterCreate(
            param_key="demo_heart_rate",
            param_name="心率",
            current_value=75,
            unit="次/分",
            threshold_low=60,
            threshold_high=100,
            segment_count=3
        ))

        samples1 = [
            {"x": 1, "y": 65}, {"x": 2, "y": 68}, {"x": 3, "y": 72},
            {"x": 4, "y": 75}, {"x": 5, "y": 78}, {"x": 6, "y": 82},
            {"x": 7, "y": 88}, {"x": 8, "y": 95}, {"x": 9, "y": 105}, {"x": 10, "y": 110}
        ]

        result1 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=samples1
        ))

        param_service.update_parameter(param.id, ParameterUpdate(
            threshold_low=50,
            threshold_high=90,
            change_reason="临床指南更新，调整心率参考范围",
            changed_by="张医生"
        ))

        samples2 = [
            {"x": 1, "y": 65}, {"x": 2, "y": 68}, {"x": 3, "y": 72},
            {"x": 4, "y": 75}, {"x": 5, "y": 78}, {"x": 6, "y": 82},
            {"x": 7, "y": 88}, {"x": 8, "y": 95}, {"x": 9, "y": 105}, {"x": 10, "y": 110}
        ]

        result2 = calc_service.calculate(CalculationRequestCreate(
            parameter_id=param.id,
            sample_data=samples2
        ))

        assert result2["result"].is_jump == True
        assert result2["result"].jump_cause == ChangeCause.THRESHOLD

        change_traces = db.query(ChangeTrace).filter(
            ChangeTrace.result_id == result2["result"].id
        ).all()
        assert len(change_traces) >= 1

        history = param_service.get_parameter_history(param.id)
        assert len(history) == 2

        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
