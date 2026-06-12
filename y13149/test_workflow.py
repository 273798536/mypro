import json
import sys
import os
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mc_verify.importer import load_questions_from_file, add_boundary_sample
from mc_verify.engine import simulate
from mc_verify.history import HistoryStore
from mc_verify.report import generate_report, format_report_text
from mc_verify.models import ProcessStatus, UnitStatus
from mc_verify.field_mapper import map_record, build_reverse_map
from mc_verify.unit_checker import check_unit, extract_unit_from_value, extract_unit_from_description


def _write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def test_field_mapper():
    print("[测试] 字段名自适应映射")
    r1 = map_record({"公式": "a+b", "标准答案": 3, "单位": "m", "题干": "加法"})
    assert r1["formula"] == "a+b", f"映射公式失败: {r1}"
    assert r1["expected_value"] == 3, f"映射期望值失败: {r1}"
    assert r1["unit"] == "m", f"映射单位失败: {r1}"
    assert r1["source_description"] == "加法", f"映射描述失败: {r1}"

    r2 = map_record({"equation": "x*2", "correct_answer": 10, "content": "乘法"})
    assert r2["formula"] == "x*2"
    assert r2["expected_value"] == 10
    assert "content" in r2["source_fields"]

    r3 = map_record({"weird_col": "val", "formula": "1+1"})
    assert r3["formula"] == "1+1"
    assert "weird_col" in r3["source_fields"]
    print("  ✓ 字段映射正常")


def test_unit_checker():
    print("[测试] 单位检测与追踪")
    from mc_verify.models import QuestionItem

    item_ok = QuestionItem(formula="a+b", unit="m", source_fields={"ans": "5 m"})
    ut = check_unit(item_ok)
    assert ut.status == UnitStatus.OK, f"单位OK判断失败: {ut}"

    item_missing = QuestionItem(formula="a+b", unit=None, source_fields={"val": "42"}, source_description="纯数值计算")
    ut2 = check_unit(item_missing)
    assert ut2.status == UnitStatus.MISSING, f"单位缺失判断失败: {ut2}"
    assert ut2.original_field, f"来源字段为空: {ut2}"

    item_hint = QuestionItem(formula="a+b", unit=None, source_fields={"val": "42"}, source_description="结果单位为牛顿")
    ut3 = check_unit(item_hint)
    assert ut3.status == UnitStatus.MISMATCH, f"中文单位提示判断失败: {ut3}"
    assert ut3.expected_unit == "N", f"中文→英文单位推断失败: {ut3}"

    assert extract_unit_from_value("3.14 kg") == "kg"
    assert extract_unit_from_value("100") is None
    assert extract_unit_from_description("速度为5米每秒") == "m"
    print("  ✓ 单位检测与追踪正常")


def test_mc_engine():
    print("[测试] 蒙特卡洛仿真引擎")
    from mc_verify.models import QuestionItem

    item = QuestionItem(formula="a + b", expected_value=2.0, unit=None, source_fields={})
    item.unit_trace = check_unit(item)
    result = simulate(item, sample_count=5000, seed=42)
    assert result.sample_count > 0, "采样数为0"
    assert abs(result.mc_mean - 2.0) < 0.5, f"MC均值偏差过大: {result.mc_mean}"
    print(f"  ✓ MC仿真: mean={result.mc_mean:.4f} std={result.mc_std:.4f} samples={result.sample_count}")


def test_full_workflow():
    print("\n[测试] 端到端工作流")

    tmpdir = tempfile.mkdtemp(prefix="mc_verify_test_")
    try:
        sample_data = [
            {
                "题目编号": "Q001",
                "公式": "sqrt(a**2 + b**2)",
                "标准答案": 1.4142136,
                "单位": "m",
                "题目描述": "直角三角形斜边长度",
            },
            {
                "id": "Q002",
                "formula": "a * b * sin(c)",
                "expected_value": 0.5,
                "units": "m²",
                "desc": "三角形面积，单位待补",
            },
            {
                "题号": "Q003",
                "表达式": "2 * pi * r",
                "期望值": 6.2831853,
                "题干": "圆的周长，半径r=1米",
            },
            {
                "no": "Q004",
                "equation": "4 * pi * r**2",
                "correct_answer": 12.5663706,
                "content": "球表面积 r=1，结果单位未标注",
            },
            {
                "question_id": "Q005",
                "formula": "e**x",
                "expected_value": 2.7182818,
                "unit": None,
                "source_description": "自然指数 e^1，无单位纯数值",
            },
        ]
        sample_path = os.path.join(tmpdir, "questions.json")
        _write_json(sample_path, sample_data)

        print("  步骤1: 导入旧材料")
        items = load_questions_from_file(sample_path)
        print(f"    导入 {len(items)} 条")
        for item in items:
            ut = item.unit_trace
            print(f"    {item.question_id}: unit_status=[{ut.status.value}] field='{ut.original_field}'")

        print("  步骤2: 补入边界样本")
        boundary = add_boundary_sample(
            items,
            formula="1/r",
            expected_value=None,
            unit=None,
            source_description="除零边界: r趋于0时1/r发散，无单位",
        )
        ut = boundary.unit_trace
        print(f"    边界 {boundary.question_id}: unit_status=[{ut.status.value}] field='{ut.original_field}'")

        print("  步骤3: 蒙特卡洛批量验算")
        results = []
        for item in items:
            result = simulate(item, sample_count=5000, seed=42, tolerance=0.05)
            is_unit_blocked = (
                item.unit_trace is not None
                and item.unit_trace.status in (UnitStatus.MISSING, UnitStatus.MISMATCH)
            )
            if is_unit_blocked:
                item.process_status = ProcessStatus.UNIT_BLOCKED
            elif result.anomalies:
                item.process_status = ProcessStatus.FAILED
            else:
                item.process_status = ProcessStatus.PASSED
            results.append(result)

        passed = sum(1 for i in items if i.process_status == ProcessStatus.PASSED)
        blocked = sum(1 for i in items if i.process_status == ProcessStatus.UNIT_BLOCKED)
        failed = sum(1 for i in items if i.process_status == ProcessStatus.FAILED)
        print(f"    通过={passed} 失败={failed} 单位受阻={blocked}")

        print("  步骤4: 历史记录与人工确认")
        history = HistoryStore(store_path=os.path.join(tmpdir, "history.json"))
        history.record_import(items)
        for item, result in zip(items, results):
            history.record_verify(item, result)

        history.record_confirm(
            question_id=items[0].question_id,
            before={"process_status": items[0].process_status.value},
            after={"process_status": ProcessStatus.PASSED.value},
            confirmed_by="reviewer_aning",
            explanation="人工确认: 公式正确，单位已核对",
        )

        all_h = history.get_history()
        confirm_h = [h for h in all_h if h.change_type == "confirm"]
        assert len(confirm_h) > 0, "未找到确认记录"
        print(f"    历史记录总数={len(all_h)} 确认记录={len(confirm_h)}")
        ch = confirm_h[0]
        print(f"    确认者={ch.confirmed_by} 说明={ch.explanation}")
        print(f"    before={ch.before} after={ch.after}")

        print("  步骤5: 复核报告生成")
        report = generate_report(
            items, results,
            param_version="1.0.0",
            mc_sample_count=5000,
            mc_seed=42,
            output_path=os.path.join(tmpdir, "report.json"),
        )
        assert report.total_questions == len(items)
        assert report.unit_blocked == blocked
        print(f"    报告: passed={report.passed} failed={report.failed} unit_blocked={report.unit_blocked}")

        if report.unit_missing_details:
            print("    单位缺失详细追踪:")
            for d in report.unit_missing_details:
                print(f"      题目 {d['question_id']}:")
                print(f"        状态={d['unit_status']} 来源字段='{d['original_field']}'")
                print(f"        原始说法='{d['original_value']}'")
                print(f"        期望单位={d['expected_unit'] or '(无法推断)'} 实际单位={d['actual_unit'] or '(缺失)'}")
                print(f"        说明: {d['trace_detail']}")

        report_text = format_report_text(report)
        with open(os.path.join(tmpdir, "report.txt"), "w", encoding="utf-8") as f:
            f.write(report_text)

        print("  步骤6: 检查接口返回是否说清变化")
        unit_blocked_items = [
            (item, result) for item, result in zip(items, results)
            if item.unit_trace and item.unit_trace.status in (UnitStatus.MISSING, UnitStatus.MISMATCH)
        ]
        if unit_blocked_items:
            print("    单位缺失卡点:")
            for item, result in unit_blocked_items:
                ut = item.unit_trace
                print(f"      题目 {item.question_id}: 单位=[{ut.status.value}] "
                      f"卡在来源字段='{ut.original_field}' "
                      f"原始说法='{ut.original_value}' "
                      f"期望单位={ut.expected_unit or '(无法推断)'} "
                      f"实际单位={ut.actual_unit or '(缺失)'}")
                print(f"        → {ut.detail}")
            print(f"    共 {len(unit_blocked_items)} 条题目因单位问题受阻")
        else:
            print("    全部通过，无单位缺失")

        print("\n  ✓ 端到端工作流测试通过")

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    test_field_mapper()
    test_unit_checker()
    test_mc_engine()
    test_full_workflow()
    print("\n" + "=" * 60)
    print("全部测试通过")
    print("=" * 60)
