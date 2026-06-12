"""核心功能测试 - 验证各种边界情况"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import pytest

from src.ip_checker.models import (
    DataSource,
    VerificationStatus,
)
from src.ip_checker.unit_system import UnitSystem, UnitConversionError
from src.ip_checker.field_mapper import FieldMapper
from src.ip_checker.verification_engine import VerificationEngine, BoundaryCaseHandler
from src.ip_checker.calculation_spec import CalculationSpecManager
from src.ip_checker.audit_trail import AuditTrail


class TestBoundaryCaseHandler:
    def test_division_by_zero(self):
        handler = BoundaryCaseHandler()
        is_zero, msg = handler.check_division_by_zero(100, 0)
        assert is_zero is True
        assert "除零异常" in msg

        is_zero, msg = handler.check_division_by_zero(100, 0.0000000001)
        assert is_zero is True
        assert "除零边界" in msg

        is_zero, msg = handler.check_division_by_zero(100, 10)
        assert is_zero is False
        assert msg is None

    def test_negative_value(self):
        handler = BoundaryCaseHandler()
        is_neg, msg = handler.check_negative_value(-100, "quantity")
        assert is_neg is True
        assert "值为负异常" in msg

        is_neg, msg = handler.check_negative_value(100, "quantity")
        assert is_neg is False

    def test_null_value(self):
        handler = BoundaryCaseHandler()
        is_null, msg = handler.check_null_value(None, "unit_price")
        assert is_null is True
        assert "空值异常" in msg

        is_null, msg = handler.check_null_value(pd.NA, "unit_price")
        assert is_null is True

        is_null, msg = handler.check_null_value(100, "unit_price")
        assert is_null is False


class TestUnitSystem:
    def setup_method(self):
        self.us = UnitSystem()

    def test_same_unit_conversion(self):
        val, log = self.us.convert(100, "元", "元")
        assert val == 100
        assert log["factor"] == 1.0

    def test_currency_conversion(self):
        val, log = self.us.convert(1, "万元", "元")
        assert val == 10000
        assert log["dimension"] == "currency"

        val, log = self.us.convert(15000, "元", "万元")
        assert val == 1.5

    def test_weight_conversion(self):
        val, log = self.us.convert(1, "吨", "千克")
        assert val == 1000

    def test_invalid_conversion(self):
        with pytest.raises(UnitConversionError, match="量纲不一致"):
            self.us.convert(100, "元", "米")

    def test_unknown_unit(self):
        with pytest.raises(UnitConversionError, match="未知单位"):
            self.us.convert(100, "光年", "米")


class TestFieldMapper:
    def setup_method(self):
        self.fm = FieldMapper()

    def test_field_mapping_different_sources(self):
        df_a = pd.DataFrame({
            "项目编码": ["XM001"],
            "工程量": [100],
            "单价": [350],
        })
        mapped_a, log_a, _ = self.fm.map_dataframe(df_a, DataSource.DRAFT_A, "ctx001")
        assert "project_code" in mapped_a.columns
        assert "quantity" in mapped_a.columns
        assert "unit_price" in mapped_a.columns

        df_b = pd.DataFrame({
            "项目编号": ["XM001"],
            "数量": [100],
            "综合单价": [350],
        })
        mapped_b, log_b, _ = self.fm.map_dataframe(df_b, DataSource.DRAFT_B, "ctx001")
        assert "project_code" in mapped_b.columns
        assert "quantity" in mapped_b.columns
        assert "unit_price" in mapped_b.columns

    def test_source_tracking(self):
        df = pd.DataFrame({"工程量": [100]})
        mapped, log, _ = self.fm.map_dataframe(df, DataSource.DRAFT_A, "ctx001")
        assert mapped["_source"].iloc[0] == DataSource.DRAFT_A.value
        assert "_src_quantity" in mapped.columns

    def test_processing_status(self):
        df = pd.DataFrame({"工程量": [100]})
        mapped, log, status_log = self.fm.map_dataframe(df, DataSource.DRAFT_A, "ctx001")
        assert "字段已映射" in mapped["_processing_status"].iloc[0]


class TestVerificationEngine:
    def setup_method(self):
        self.us = UnitSystem()
        self.sm = CalculationSpecManager()
        self.engine = VerificationEngine(self.us, self.sm, tolerance=0.01)

    def test_normal_calculation(self):
        row = pd.Series({
            "quantity": 100,
            "unit_price": 350,
            "_source": "测试",
            "unit": "元",
        })
        rule = self.sm.get_rule("F001")
        result = self.engine.verify_record(row, rule, "ctx001", expected_value=35000)
        assert result.result_status == VerificationStatus.PASS
        assert result.calculated_value == 35000

    def test_division_by_zero(self):
        row = pd.Series({
            "quantity": 0,
            "total_price": 1000,
            "_source": "测试",
            "unit": "元",
        })
        rule = self.sm.get_rule("F004")
        result = self.engine.verify_record(row, rule, "ctx001")
        assert result.result_status == VerificationStatus.EXCEPTION
        assert result.anomaly_type == "公式计算异常"
        assert "除零异常" in result.error_message

    def test_negative_quantity(self):
        row = pd.Series({
            "quantity": -10,
            "unit_price": 100,
            "_source": "测试",
            "unit": "元",
        })
        rule = self.sm.get_rule("F001")
        result = self.engine.verify_record(row, rule, "ctx001", expected_value=-1010)
        assert result.anomaly_type == "负值异常"

    def test_null_value(self):
        row = pd.Series({
            "quantity": 100,
            "unit_price": None,
            "_source": "测试",
            "unit": "元",
        })
        rule = self.sm.get_rule("F001")
        result = self.engine.verify_record(row, rule, "ctx001")
        assert result.result_status == VerificationStatus.EXCEPTION
        assert result.anomaly_type == "空值异常"

    def test_tolerance_check(self):
        row = pd.Series({
            "quantity": 100,
            "unit_price": 100,
            "_source": "测试",
            "unit": "元",
        })
        rule = self.sm.get_rule("F001")
        result = self.engine.verify_record(row, rule, "ctx001", expected_value=9800)
        assert result.result_status == VerificationStatus.FAIL
        assert result.anomaly_type == "数值偏差"

    def test_processing_steps_trace(self):
        row = pd.Series({
            "quantity": 100,
            "unit_price": 350,
            "_source": "测试",
            "unit": "元",
        })
        rule = self.sm.get_rule("F001")
        result = self.engine.verify_record(row, rule, "ctx001", expected_value=35000)
        assert len(result.processing_steps) > 0
        step_actions = [s["action"] for s in result.processing_steps]
        assert "读取原始输入" in step_actions
        assert "执行计算公式" in step_actions
        assert "验算判定" in step_actions

    def test_rule_with_management_fee(self):
        from src.ip_checker.models import CalculationRule

        rule_with_fee = CalculationRule(
            formula_id="F001",
            formula_expression="total_price = quantity * unit_price * 1.01",
            description="合价 = 工程量 × 单价 × 1.01（含1%管理费）",
            input_fields=["quantity", "unit_price"],
            output_field="total_price",
            target_unit="元",
            created_by="小岑",
            version=2,
            params={"management_fee_rate": 0.01},
        )

        row = pd.Series({
            "quantity": 100,
            "unit_price": 100,
            "_source": "测试",
            "unit": "元",
        })

        result = self.engine.verify_record(row, rule_with_fee, "ctx001", expected_value=10100)
        assert result.calculated_value == 10100
        assert result.result_status == VerificationStatus.PASS

        step_actions = [s["action"] for s in result.processing_steps]
        assert any("v2" in a for a in step_actions)

    def test_tax_rate_parsing_various_formats(self):
        rate1, note1 = VerificationEngine._parse_tax_rate("13%")
        assert rate1 == 0.13
        assert "转换为小数" in note1

        rate2, note2 = VerificationEngine._parse_tax_rate(13)
        assert rate2 == 0.13
        assert "转换为小数" in note2

        rate3, note3 = VerificationEngine._parse_tax_rate(0.13)
        assert rate3 == 0.13
        assert note3 is None

        rate4, note4 = VerificationEngine._parse_tax_rate("9%")
        assert rate4 == 0.09
        assert "转换为小数" in note4

    def test_tax_calculation_with_percent_string(self):
        rule = self.sm.get_rule("F002")
        row = pd.Series({
            "total_price": 10000,
            "tax_rate": "13%",
            "_source": "测试",
            "unit": "元",
        })
        result = self.engine.verify_record(row, rule, "ctx001")
        assert abs(result.calculated_value - 1300) < 0.01

        step_details = [s["detail"] for s in result.processing_steps]
        assert any("税率" in d and "转换为小数" in d for d in step_details)


class TestAuditTrail:
    def setup_method(self):
        self.audit = AuditTrail(storage_path="/tmp/test_audit.json")

    def test_log_entry(self):
        entry = self.audit.log_entry(
            operator="小岑",
            action="测试操作",
            field_changed="test_field",
            old_value=1,
            new_value=2,
            reason="测试原因",
        )
        assert entry.operator == "小岑"
        assert entry.action == "测试操作"

    def test_log_tolerance_adjustment(self):
        adj = self.audit.log_tolerance_adjustment(
            operator="小岑",
            old_tolerance=0.01,
            new_tolerance=0.02,
            reason="测试调整",
            affected_formula="F001",
        )
        assert adj["old_tolerance"] == 0.01
        assert adj["new_tolerance"] == 0.02

    def test_history_retrieval(self):
        self.audit.log_entry(
            operator="小岑",
            action="测试",
            affected_record_ids=["REC001"],
        )
        history = self.audit.get_history_for_record("REC001")
        assert len(history) == 1

    def test_operator_history(self):
        self.audit.log_entry(operator="小岑", action="操作1")
        self.audit.log_entry(operator="小岑", action="操作2")
        self.audit.log_entry(operator="其他人", action="操作3")
        history = self.audit.get_history_for_operator("小岑")
        assert len(history) == 2

    def test_change_report(self):
        self.audit.log_entry(operator="小岑", action="测试操作", reason="测试原因")
        report = self.audit.generate_change_report()
        assert "小岑" in report
        assert "测试操作" in report


class TestIntegration:
    def test_full_pipeline_smoke(self):
        us = UnitSystem()
        sm = CalculationSpecManager()
        engine = VerificationEngine(us, sm)
        fm = FieldMapper()

        df = pd.DataFrame({
            "项目编码": ["XM001", "XM002"],
            "工程量": [100, 50],
            "单价": [350, 5800],
            "合价": [35000, 290000],
            "税率": [0.13, 0.13],
            "单位": ["元", "元"],
        })

        ctx = sm.create_context(
            reviewer="测试",
            description="集成测试",
            source_documents=["test.csv"],
            assumptions={"测试": True},
        )

        mapped, _, _ = fm.map_dataframe(df, DataSource.DRAFT_A, ctx.context_id)
        result = engine.batch_verify(mapped, ["F001", "F002"], ctx.context_id, "total_price")

        assert len(result) == 2
        assert "_overall_status" in result.columns

        summary = engine.get_summary()
        assert "通过" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
