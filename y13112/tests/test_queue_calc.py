import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from queue_window_calc import (
    QuestionItem, Unit, CalculationStatus, ConfirmationStatus,
    ManualConfirmation, calculate_single, run_batch,
    HistoryTracker, export_report_to_csv, export_report_to_json,
)
from queue_window_calc.unit_converter import convert_value, are_units_compatible, detect_unit_shift
from queue_window_calc.extrapolation import check_extrapolation_bounds
from queue_window_calc.formula_engine import safe_eval_formula


def assert_eq(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(f"{msg} 期望 {expected}, 实际 {actual}")


def test_unit_conversion():
    print("[TEST] 单位转换模块...", end=" ")
    val, exc = convert_value(1.5, Unit.HOUR, Unit.MINUTE)
    assert val == 90.0, "1.5小时应等于90分钟"
    assert exc is None
    val, exc = convert_value(120, Unit.SECOND, Unit.MINUTE)
    assert abs(val - 2.0) < 1e-6, "120秒应等于2分钟"
    assert exc is None
    assert are_units_compatible(Unit.MINUTE, Unit.HOUR) is True
    assert are_units_compatible(Unit.MINUTE, Unit.PERSON) is False
    _, exc = convert_value(10, Unit.METER, Unit.PERSON)
    assert exc is not None and exc.exception_type.value == "unit_mismatch"
    print("OK")


def test_formula_engine():
    print("[TEST] 公式引擎...", end=" ")
    val, exc, trace = safe_eval_formula("a + b * 2", {"a": 3, "b": 5})
    assert val == 13.0
    assert exc is None
    val, exc, _ = safe_eval_formula("ceil(x / y)", {"x": 10, "y": 3})
    assert val == 4.0
    _, exc, _ = safe_eval_formula("a / b", {"a": 1, "b": 0})
    assert exc is not None and exc.exception_type.value == "formula_error"
    _, exc, _ = safe_eval_formula("undefined_var", {"a": 1})
    assert exc is not None
    print("OK")


def test_extrapolation_check():
    print("[TEST] 外推越界检测...", end=" ")
    out, exc, conf = check_extrapolation_bounds(
        10.0, {"average": 8.0}, None, "Q-TEST"
    )
    assert out is False, "在正常范围内不应触发"
    out, exc, conf = check_extrapolation_bounds(
        500.0, {"average": 50.0}, None, "Q-TEST"
    )
    assert out is True, "超 5 倍应触发越界"
    assert exc is not None and exc.exception_type.value == "extrapolation_out_of_range"
    assert conf is not None and conf.status == ConfirmationStatus.PENDING
    print("OK")


def test_single_calculation_normal():
    print("[TEST] 单题计算-正常流程...", end=" ")
    q = QuestionItem(
        question_id="T1",
        name="测试-平均等待时长",
        description="",
        formula_expression="arrival / (rate * windows)",
        input_params={"arrival": 120, "rate": 2, "windows": 5},
        input_unit=Unit.MINUTE,
        expected_output_unit=Unit.MINUTE,
        supplementary_note="测试备注",
        historical_reference={"average": 8},
        source_trace={"arrival": "样例表"},
    )
    result = calculate_single(q)
    assert result.status == CalculationStatus.SUCCESS
    assert abs(result.final_value - 12.0) < 1e-6
    assert result.linked_note == "测试备注"
    assert "测试备注" in result.conclusion
    assert len(result.value_trace) > 0
    print("OK")


def test_single_calculation_unit_conversion():
    print("[TEST] 单题计算-单位自动换算...", end=" ")
    q = QuestionItem(
        question_id="T2",
        name="测试-小时转分钟",
        description="",
        formula_expression="hours",
        input_params={"hours": 2.5},
        input_unit=Unit.HOUR,
        expected_output_unit=Unit.MINUTE,
        supplementary_note=None,
        historical_reference={"average": 150},
    )
    result = calculate_single(q)
    assert result.status == CalculationStatus.SUCCESS
    assert abs(result.final_value - 150.0) < 1e-6
    assert result.final_unit == Unit.MINUTE
    print("OK")


def test_single_calculation_unit_incompatible():
    print("[TEST] 单题计算-单位不兼容异常...", end=" ")
    q = QuestionItem(
        question_id="T3",
        name="测试-量纲错误",
        description="",
        formula_expression="a * b",
        input_params={"a": 10, "b": 20},
        input_unit=Unit.METER,
        expected_output_unit=Unit.PERSON,
        historical_reference={},
    )
    result = calculate_single(q)
    assert any(e.exception_type.value == "unit_mismatch" for e in result.exceptions)
    print("OK")


def test_single_calculation_needs_confirmation():
    print("[TEST] 单题计算-触发人工确认...", end=" ")
    q = QuestionItem(
        question_id="T4",
        name="测试-越界待确认",
        description="",
        formula_expression="x",
        input_params={"x": 1000},
        input_unit=Unit.PERSON,
        expected_output_unit=Unit.PERSON,
        historical_reference={"average": 50},
    )
    result = calculate_single(q)
    assert result.status == CalculationStatus.NEEDS_CONFIRMATION
    assert any(c.status == ConfirmationStatus.PENDING for c in result.confirmations)
    print("OK")


def test_manual_confirmation_applied():
    print("[TEST] 单题计算-人工确认已生效...", end=" ")
    q = QuestionItem(
        question_id="T5",
        name="测试-已确认越界",
        description="",
        formula_expression="x",
        input_params={"x": 1000},
        input_unit=Unit.PERSON,
        expected_output_unit=Unit.PERSON,
        historical_reference={"average": 50},
    )
    conf = ManualConfirmation(
        question_id="T5",
        reason="极端测试，确认有效",
        original_value=1000,
        original_unit=Unit.PERSON,
        adjusted_value=1000,
        adjusted_unit=Unit.PERSON,
        operator="测试主管",
        status=ConfirmationStatus.CONFIRMED,
        next_step="可使用",
    )
    result = calculate_single(q, manual_confirmations={"T5": conf})
    assert result.status in (CalculationStatus.SUCCESS, CalculationStatus.WARNING)
    assert result.status != CalculationStatus.NEEDS_CONFIRMATION
    assert result.final_value == 1000
    print("OK")


def test_batch_run_and_history():
    print("[TEST] 批量计算与历史记录...", end=" ")
    q1 = QuestionItem(
        question_id="B1", name="批量-1", description="",
        formula_expression="a + 1", input_params={"a": 1},
        input_unit=Unit.PERSON, expected_output_unit=Unit.PERSON,
        historical_reference={"average": 2},
    )
    q2 = QuestionItem(
        question_id="B2", name="批量-2", description="",
        formula_expression="b * 10", input_params={"b": 3},
        input_unit=Unit.PERSON, expected_output_unit=Unit.PERSON,
        historical_reference={"average": 30},
    )
    with tempfile.TemporaryDirectory() as tmp:
        hist_path = os.path.join(tmp, "history.json")
        tracker = HistoryTracker(storage_path=hist_path)
        report = run_batch([q1, q2], history_tracker=tracker)
        assert report.total_questions == 2
        assert report.success_count == 2
        assert len(tracker.records) == 2
        assert os.path.isfile(hist_path)
        json_path = os.path.join(tmp, "report.json")
        csv_path = os.path.join(tmp, "report.csv")
        export_report_to_json(report, json_path)
        export_report_to_csv(report, csv_path)
        assert os.path.isfile(json_path) and os.path.isfile(csv_path)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert data["batch_id"] == report.batch_id
            assert len(data["results"]) == 2
    print("OK")


def test_cli_with_samples():
    print("[TEST] 命令行接口-样例数据...", end=" ")
    from run_queue_calc import main
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    q_file = os.path.join(base, "samples", "questions_sample.json")
    c_file = os.path.join(base, "samples", "confirmations_sample.json")
    with tempfile.TemporaryDirectory() as tmp:
        hist_file = os.path.join(tmp, "history.json")
        code = main([
            "--questions_file", q_file,
            "--confirmations_file", c_file,
            "--output_dir", tmp,
            "--format", "both",
            "--history_file", hist_file,
            "--summary_only",
        ])
        assert code in (0, 1)
        outputs = os.listdir(tmp)
        assert any(n.endswith(".json") for n in outputs)
        assert any(n.endswith(".csv") for n in outputs)
        assert "history.json" in outputs
    print("OK")


def main():
    tests = [
        test_unit_conversion,
        test_formula_engine,
        test_extrapolation_check,
        test_single_calculation_normal,
        test_single_calculation_unit_conversion,
        test_single_calculation_unit_incompatible,
        test_single_calculation_needs_confirmation,
        test_manual_confirmation_applied,
        test_batch_run_and_history,
        test_cli_with_samples,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"FAIL: {t.__name__}: {e}")
    print("\n" + "=" * 50)
    print(f"通过 {passed}/{passed + failed} 个测试")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
