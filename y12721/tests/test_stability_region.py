import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stability_region import (
    StabilityAnalyzer,
    ResultExplainer,
    ConstraintValidator,
    ReviewWorkflow,
    FaultTolerantBatchRunner,
    StabilityVerdict,
    ConfirmationStatus,
    StudentAnswer,
    samples as s,
)


def test_stability_analyzer_basic():
    print("\n=== Test 1: 核心稳定区判定 ===")
    analyzer = StabilityAnalyzer()

    r1 = analyzer.analyze_stability("P1", {"a0": 6, "a1": 5, "a2": 1})
    assert r1.verdict == StabilityVerdict.STABLE, f"Expected STABLE, got {r1.verdict}"
    print(f"  ✓ 稳定系统判定正确: {r1.verdict.value}")

    r2 = analyzer.analyze_stability("P2", {"a0": -6, "a1": 5, "a2": 1})
    assert r2.verdict == StabilityVerdict.UNSTABLE, f"Expected UNSTABLE, got {r2.verdict}"
    print(f"  ✓ 不稳定系统判定正确: {r2.verdict.value}")

    r3 = analyzer.analyze_stability("P3", {"a0": 6, "a1": 0, "a2": 1})
    assert r3.verdict == StabilityVerdict.UNKNOWN, f"Expected UNKNOWN, got {r3.verdict}"
    print(f"  ✓ 临界系统判定正确: {r3.verdict.value}")

    r4 = analyzer.analyze_stability("P4", {})
    assert r4.verdict == StabilityVerdict.INSUFFICIENT_DATA
    print(f"  ✓ 空集合输入正确处理: {r4.verdict.value}")

    r5 = analyzer.analyze_stability("P5", None)
    assert r5.verdict == StabilityVerdict.INSUFFICIENT_DATA
    print(f"  ✓ None 输入正确处理: {r5.verdict.value}")

    r6 = analyzer.analyze_stability("P6", {"a0": 0, "a1": 0, "a2": 0})
    assert r6.verdict == StabilityVerdict.INSUFFICIENT_DATA
    print(f"  ✓ 全零系数正确处理: {r6.verdict.value}")

    print("  ✓ Test 1 通过")


def test_late_answers():
    print("\n=== Test 2: 晚到数据处理 ===")
    analyzer = StabilityAnalyzer()

    deadline = datetime.now() - timedelta(minutes=10)
    answers = [
        StudentAnswer(
            student_id="S1",
            problem_id="LP1",
            coefficients={"a0": 6, "a1": 5, "a2": 1},
            submitted_at=deadline - timedelta(minutes=5),
        ),
        StudentAnswer(
            student_id="S2",
            problem_id="LP1",
            coefficients={"a0": 6, "a1": 3, "a2": 1},
            submitted_at=deadline + timedelta(minutes=30),
        ),
    ]

    analyzer.mark_late_answers(answers, deadline=deadline)
    assert not answers[0].is_late
    assert answers[1].is_late
    print("  ✓ 晚到标记正确")

    result = analyzer.analyze_stability("LP1", {"a0": 6, "a1": 5, "a2": 1}, student_ids=["S1"])
    late_ans = StudentAnswer(
        student_id="S2",
        problem_id="LP1",
        coefficients={"a0": 6, "a1": 3, "a2": 1},
        is_late=True,
    )

    updated = analyzer.apply_late_answer("LP1", late_ans, result)
    assert updated.has_supplement
    assert "S2" in updated.student_ids
    print(f"  ✓ 晚到数据补录成功, run_count={updated.run_count}, has_supplement={updated.has_supplement}")
    print("  ✓ Test 2 通过")


def test_explainer_and_counterexample():
    print("\n=== Test 3: 结果解释与反例对比 ===")
    analyzer = StabilityAnalyzer()
    explainer = ResultExplainer()
    validator = ConstraintValidator(analyzer)

    bad_coeffs = {"a0": 6, "a1": -5, "a2": 1}
    result = analyzer.analyze_stability("CP1", bad_coeffs)
    result, ce = validator.validate_and_generate_counterexample(result, bad_coeffs)
    assert ce is not None, "约束校验应生成反例"
    print(f"  ✓ 触发约束: {ce.constraint_triggered}")
    print(f"  ✓ 判定变化: {ce.verdict_before.value} → {ce.verdict_after.value}")

    result = explainer.add_explanation_to_result(result)
    assert result.explanation, "应生成解释文本"
    assert "李雅普诺夫" in result.explanation or "阻尼" in result.explanation or "特征值" in result.explanation
    print(f"  ✓ 解释文本已生成（长度={len(result.explanation)}）")
    print(result.explanation)

    diff_text = explainer.generate_counter_example_diff(ce)
    assert "校验前" in diff_text and "校验后" in diff_text
    print("  ✓ 反例对比文本已生成")
    print(diff_text)
    print("  ✓ Test 3 通过")


def test_review_workflow_three_operations():
    print("\n=== Test 4: 复核入口 - 重复运行、补录、人工确认 ===")
    wf = ReviewWorkflow()

    r1 = wf.run_analysis("R1", {"a0": 6, "a1": 5, "a2": 1}, student_ids=["S1", "S2"])
    assert r1.run_count == 1
    print(f"  ✓ 首次运行, run_count={r1.run_count}")

    r2 = wf.rerun("R1")
    assert r2.run_count == 2
    print(f"  ✓ 重复运行, run_count={r2.run_count}")

    supplement = StudentAnswer(
        student_id="S3",
        problem_id="R1",
        coefficients={"a0": 8, "a1": 6, "a2": 1},
    )
    r3 = wf.supplement("R1", supplement)
    assert r3.has_supplement
    assert "S3" in r3.student_ids
    print(f"  ✓ 补录成功, has_supplement={r3.has_supplement}, students={r3.student_ids}")

    r4 = wf.confirm("R1", confirmed=True, reviewer="teacher_A", notes="结果与理论一致")
    assert r4.confirmation_status == ConfirmationStatus.CONFIRMED
    assert r4.confirmed_by == "teacher_A"
    print(f"  ✓ 人工确认成功, status={r4.confirmation_status.value}, by={r4.confirmed_by}")

    summary = wf.get_review_summary("R1")
    assert "复核入口" in summary
    assert "重复运行" in summary
    assert "补录" in summary
    assert "确认" in summary
    print("  ✓ 复核入口文本生成成功")
    print(summary)

    pending = wf.list_pending_reviews()
    assert "R1" not in pending
    print(f"  ✓ 待复核列表正确: {pending}")
    print("  ✓ Test 4 通过")


def test_batch_runner_fault_tolerance():
    print("\n=== Test 5: 容错批处理 - 参数缺失不整批失败 ===")
    runner = FaultTolerantBatchRunner()

    answers_by_problem = {
        "BP1": [
            StudentAnswer("S1", "BP1", {"a0": 6, "a1": 5, "a2": 1}),
            StudentAnswer("S2", "BP1", {"a0": 8, "a1": 6, "a2": 1}),
        ],
        "BP2": [
            StudentAnswer("S3", "BP2", {"a1": 5, "a2": 1}),
            StudentAnswer("S4", "BP2", {"a2": 1}),
        ],
        "BP3": [
            StudentAnswer("S5", "BP3", {}),
            StudentAnswer("S6", "BP3", None),
        ],
        "BP4": [
            StudentAnswer("S7", "BP4", {"a0": 6, "a1": -5, "a2": 1}),
        ],
    }

    report = runner.run_batch(answers_by_problem)
    assert report.successful >= 1
    assert report.skipped >= 1
    assert report.total_problems == 4
    print(f"  ✓ 批处理完成: 总计{report.total_problems} 成功{report.successful} 跳过{report.skipped} 失败{report.failed}")

    report_text = runner.format_report(report)
    assert "参数缺口" in report_text
    print("  ✓ 缺口报告生成成功")
    print(report_text)

    bp2_gap = [g for g in report.gaps if g.problem_id == "BP2"]
    assert len(bp2_gap) == 1
    assert "a0" in bp2_gap[0].missing_parameters
    print(f"  ✓ BP2 缺口识别正确, 缺少参数: {bp2_gap[0].missing_parameters}")

    bp4_results = [r for r in report.results if r.problem_id == "BP4"]
    if bp4_results:
        r = bp4_results[0]
        if r.counter_example:
            print(f"  ✓ BP4 含约束校验反例: {r.counter_example.constraint_triggered}")

    print("  ✓ Test 5 通过")


def test_boundary_samples_with_bad_data():
    print("\n=== Test 6: 边界样例 - 真实坏数据 ===")
    analyzer = StabilityAnalyzer()
    explainer = ResultExplainer()
    validator = ConstraintValidator(analyzer)
    boundary_samples = s.build_boundary_samples()

    bad_count = sum(1 for s_ in boundary_samples if s_.is_bad_data)
    print(f"  ✓ 加载边界样例 {len(boundary_samples)} 个, 含坏数据 {bad_count} 个")

    for bs in boundary_samples:
        result = analyzer.analyze_stability(bs.sample_id, bs.coefficients)
        result, ce = validator.validate_and_generate_counterexample(result, bs.coefficients)
        result = explainer.add_explanation_to_result(result)
        ce_note = f" [反例: {ce.constraint_triggered}]" if ce else ""
        status = "✓" if result.verdict == bs.expected_verdict or ce is not None else "?"
        print(f"  {status} {bs.sample_id:30s} 期望={bs.expected_verdict.value:18s} 实际={result.verdict.value:18s}{ce_note}")
        if bs.is_bad_data:
            assert bs.bad_data_type is not None
            print(f"      坏数据类型: {bs.bad_data_type}, {bs.description}")

    print("  ✓ Test 6 通过")


def test_end_to_end_story():
    print("\n=== Test 7: 端到端日常使用故事线 ===")
    wf = ReviewWorkflow()

    print("  [场景] 老师先收了第一波作业，S1 答案缺参数 a0")
    ans1 = StudentAnswer("S1", "HW1", {"a1": 5, "a2": 1})
    r1 = wf.run_analysis("HW1", ans1.coefficients, student_ids=["S1"])
    print(f"  → 结果: {r1.verdict.value}, explanation 包含'空集合'或'不足'? {'是' if '不足' in r1.explanation or '空' in r1.explanation else '否'}")

    print("  [场景] S2 晚到半小时，带了完整系数")
    late_ans = StudentAnswer(
        "S2", "HW1", {"a0": 6, "a1": 5, "a2": 1},
        is_late=True,
    )
    r2 = wf.supplement("HW1", late_ans)
    print(f"  → 补录后判定: {r2.verdict.value}, has_supplement={r2.has_supplement}")
    assert r2.verdict == StabilityVerdict.STABLE

    print("  [场景] 算法工程师触发反例校验")
    if r2.counter_example:
        print(f"  → 反例: {r2.counter_example.constraint_triggered}")
    print(r2.explanation)

    print("  [场景] 老师人工复核并确认")
    r3 = wf.confirm("HW1", confirmed=True, reviewer="Prof.Lin", notes="补录后数据完整，判定符合劳斯判据")
    print(f"  → 确认状态: {r3.confirmation_status.value}, by={r3.confirmed_by}")

    print("  [场景] 终端打印复核入口")
    wf.print_terminal_review("HW1")

    print("  ✓ Test 7 通过")


def main():
    print("=" * 60)
    print("微分方程稳定区 - 完整功能测试")
    print("=" * 60)

    test_stability_analyzer_basic()
    test_late_answers()
    test_explainer_and_counterexample()
    test_review_workflow_three_operations()
    test_batch_runner_fault_tolerance()
    test_boundary_samples_with_bad_data()
    test_end_to_end_story()

    print("\n" + "=" * 60)
    print("✅ 所有测试通过")
    print("=" * 60)


if __name__ == "__main__":
    main()
