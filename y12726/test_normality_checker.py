#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import tempfile
import traceback

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from normality_checker import (
    DataProcessor,
    NormalityTester,
    NormalityVisualizer,
    ReportGenerator,
)
from normality_checker.core import NormalityVerdict


def test_data_processor_empty_cases():
    print("=" * 60)
    print("测试1: 数据处理器 - 空集合边界情况")
    print("=" * 60)

    processor = DataProcessor()
    passed = 0
    total = 0

    cases = [
        ("完全空列表", [], True),
        ("空字符串", "", True),
        ("全NaN列表", [np.nan, np.nan, np.nan], True),
        ("全非数值字符串", ["N/A", "缺失", "未记录"], True),
        ("仅2个有效值", [1.0, 2.0], False),
    ]

    for name, data, expect_empty in cases:
        total += 1
        try:
            result = processor.process(data, name, f"材料-{name}.xlsx")
            empty_ok = result.is_empty == expect_empty
            gap_ok = len(result.gaps) >= (0 if not expect_empty else 1)
            if empty_ok and gap_ok:
                passed += 1
                status = "✅ PASS"
            else:
                status = f"❌ FAIL (is_empty={result.is_empty}, gaps={len(result.gaps)})"
        except Exception as e:
            status = f"❌ ERROR: {e}"
        print(f"  {status}: {name}")

    return passed, total


def test_data_processor_bad_data():
    print("\n" + "=" * 60)
    print("测试2: 数据处理器 - 坏数据与异常值")
    print("=" * 60)

    processor = DataProcessor(remove_outliers=True, iqr_factor=1.5)
    passed = 0
    total = 0

    data_with_outliers = [
        10.1, 11.2, 9.8, 10.5, 10.0, 999.0, 10.3, 11.0, 9.5, 10.8,
        10.2, 10.6, 10.9, 9.7, 10.4, -999.0, 10.7, 10.1, 10.3, 9.9,
    ]
    constant_data = [5.0] * 10
    normal_data = list(np.random.normal(50, 10, 50))

    cases = [
        ("混入离群值(999/-999)", data_with_outliers, True, True),
        ("常数列", constant_data, False, False),
        ("正态分布数据", normal_data, False, False),
    ]

    for name, data, expect_outliers, expect_issue in cases:
        total += 1
        try:
            result = processor.process(data, name, f"材料-{name}.xlsx")
            has_outliers = result.n_removed_outliers > 0
            has_issues = len(result.issues) > 0
            outlier_ok = has_outliers == expect_outliers
            issue_ok = has_issues == expect_issue if expect_issue else True
            verdict_changed = result.preprocessing_changed_verdict
            if outlier_ok and issue_ok:
                passed += 1
                status = "✅ PASS"
            else:
                status = f"❌ FAIL (outliers={has_outliers}, issues={has_issues})"
            print(f"  {status}: {name} (n_clean={result.n_clean}, outliers_removed={result.n_removed_outliers}, verdict_changed={verdict_changed})")
        except Exception as e:
            traceback.print_exc()
            status = f"❌ ERROR: {e}"
            print(f"  {status}: {name}")

    return passed, total


def test_normality_tester():
    print("\n" + "=" * 60)
    print("测试3: 正态性检验核心")
    print("=" * 60)

    tester = NormalityTester(alpha=0.05)
    passed = 0
    total = 0

    np.random.seed(42)
    normal_data = np.random.normal(100, 15, 100)
    non_normal_data = np.random.exponential(20, 100)
    tiny_data = np.array([1.0, 2.0])

    cases = [
        ("正态分布数据", normal_data, NormalityVerdict.NORMAL),
        ("指数分布数据", non_normal_data, NormalityVerdict.NON_NORMAL),
        ("样本不足", tiny_data, NormalityVerdict.INCONCLUSIVE),
    ]

    for name, data, expected_verdict in cases:
        total += 1
        try:
            result = tester.run_all_tests(data, name, f"材料-{name}.xlsx")
            correct = result.overall_verdict == expected_verdict
            if correct:
                passed += 1
                status = "✅ PASS"
            else:
                status = f"❌ FAIL (expected={expected_verdict.value}, got={result.overall_verdict.value})"
            print(f"  {status}: {name} -> {result.overall_verdict.value} ({result.overall_confidence:.1%})")
            print(f"      成功: {result.n_tests_run}, 跳过: {result.n_tests_skipped}, 错误: {result.n_tests_error}")
        except Exception as e:
            traceback.print_exc()
            status = f"❌ ERROR: {e}"
            print(f"  {status}: {name}")

    return passed, total


def test_visualizer():
    print("\n" + "=" * 60)
    print("测试4: 可视化模块 - 容错生成")
    print("=" * 60)

    processor = DataProcessor()
    tester = NormalityTester()
    visualizer = NormalityVisualizer(dpi=80)

    passed = 0
    total = 0

    np.random.seed(42)
    normal_data = np.random.normal(50, 10, 50)
    empty_data = []
    constant_data = [5.0] * 10

    cases = [
        ("正常数据", normal_data, 6, 0),
        ("空集合", empty_data, 1, 3),
        ("常数列", constant_data, 5, 0),
    ]

    for name, data, expect_min_figs, expect_min_fails in cases:
        total += 1
        try:
            processed = processor.process(data, name, f"材料-{name}.xlsx")
            if processed.can_test:
                result = tester.run_all_tests(processed.cleaned_data, name, f"材料-{name}.xlsx")
            else:
                result = None
            vis = visualizer.generate_all(processed, result)
            n_figs = vis.success_count
            n_fails = vis.fail_count
            figs_ok = n_figs >= expect_min_figs
            fails_ok = n_fails >= expect_min_fails
            if figs_ok and fails_ok:
                passed += 1
                status = "✅ PASS"
            else:
                status = f"❌ FAIL (figs={n_figs}≥{expect_min_figs}, fails={n_fails}≥{expect_min_fails})"
            print(f"  {status}: {name}")
            print(f"      成功图表: {n_figs}, 失败: {n_fails}")
            print(f"      图表列表: {vis.list_figures()}")
            vis.close_all()
        except Exception as e:
            traceback.print_exc()
            status = f"❌ ERROR: {e}"
            print(f"  {status}: {name}")

    return passed, total


def test_report_generator():
    print("\n" + "=" * 60)
    print("测试5: 报告生成 - 导出Excel/CSV")
    print("=" * 60)

    processor = DataProcessor()
    tester = NormalityTester()
    reporter = ReportGenerator()

    passed = 0
    total = 0

    edge_cases = DataProcessor.create_edge_case_datasets()
    processed_list = []
    results_list = []

    for ds in edge_cases:
        processed = processor.process(ds["data"], ds["name"], ds["source"], known_gaps=ds.get("gaps", []))
        processed_list.append(processed)
        if processed.can_test:
            results_list.append(tester.run_all_tests(
                processed.cleaned_data, processed.dataset_name,
                processed.source_material, gaps=processed.gaps,
            ))
        else:
            results_list.append(None)

    report = reporter.generate_batch_report(processed_list, results_list)

    print(f"  报告编号: {report.report_id}")
    print(f"  数据集: {report.n_datasets}, 成功: {report.n_success}, 空集: {report.n_empty}, 含缺口: {report.n_with_gaps}")

    with tempfile.TemporaryDirectory() as tmpdir:
        total += 1
        try:
            excel_path = reporter.export_to_excel(report, os.path.join(tmpdir, "test_report.xlsx"))
            if os.path.exists(excel_path) and os.path.getsize(excel_path) > 0:
                passed += 1
                print(f"  ✅ PASS: Excel导出成功 ({os.path.getsize(excel_path)} bytes)")
            else:
                print(f"  ❌ FAIL: Excel导出失败")
        except Exception as e:
            traceback.print_exc()
            print(f"  ❌ ERROR: {e}")

        total += 1
        try:
            csv_files = reporter.export_to_csv(report, tmpdir)
            if len(csv_files) > 0:
                passed += 1
                print(f"  ✅ PASS: CSV导出成功 ({len(csv_files)} 个文件)")
            else:
                print(f"  ❌ FAIL: CSV导出失败")
        except Exception as e:
            traceback.print_exc()
            print(f"  ❌ ERROR: {e}")

    total += 1
    try:
        gaps_df = report.gap_df
        issues_df = report.issues_df
        has_gaps = len(gaps_df) >= 3
        has_issues = len(issues_df) >= 1
        if has_gaps and has_issues:
            passed += 1
            print(f"  ✅ PASS: 缺口追踪 ({len(gaps_df)}项缺口, {len(issues_df)}项问题)")
            if len(gaps_df) > 0:
                print(f"      首个缺口: {gaps_df.iloc[0]['数据集名称']} - {gaps_df.iloc[0]['缺口描述']}")
        else:
            print(f"  ❌ FAIL: 缺口追踪不足 (gaps={len(gaps_df)}, issues={len(issues_df)})")
    except Exception as e:
        traceback.print_exc()
        print(f"  ❌ ERROR: {e}")

    total += 1
    try:
        text = reporter.generate_text_summary(report)
        has_report_id = report.report_id in text
        has_gaps_mention = "缺口" in text
        has_material_ref = "材料" in text
        if has_report_id and has_gaps_mention and has_material_ref:
            passed += 1
            print(f"  ✅ PASS: 文字摘要包含报告编号、缺口、材料来源")
        else:
            print(f"  ❌ FAIL: 文字摘要缺失关键信息 (id={has_report_id}, gaps={has_gaps_mention}, material={has_material_ref})")
    except Exception as e:
        traceback.print_exc()
        print(f"  ❌ ERROR: {e}")

    return passed, total


def test_preprocessing_verdict_change():
    print("\n" + "=" * 60)
    print("测试6: 预处理改变结论检测")
    print("=" * 60)

    processor = DataProcessor(remove_outliers=True)
    tester = NormalityTester()
    visualizer = NormalityVisualizer(dpi=80)

    passed = 0
    total = 0

    data_with_outliers = list(np.random.normal(10, 1, 30)) + [999.0, -999.0, 1000.0, -1000.0]

    total += 1
    try:
        processed = processor.process(
            data_with_outliers, "有离群值的数据",
            "建模社-真实草稿-测试.xlsx",
            known_gaps=["第31-34行疑似录入错误"],
        )
        if processed.can_test:
            result = tester.run_all_tests(processed.cleaned_data, "有离群值的数据",
                                          "建模社-真实草稿-测试.xlsx",
                                          gaps=processed.gaps)
        else:
            result = None

        vis = visualizer.generate_all(processed, result, include_comparison=True)
        has_comparison = "直方图-清洗前后对比" in vis.list_figures()
        has_qq_comparison = "Q-Q图-清洗前后对比" in vis.list_figures()
        verdict_changed_flag = processed.preprocessing_changed_verdict

        print(f"  清洗前样本量: {processed.n_raw}, 清洗后: {processed.n_clean}")
        print(f"  移除异常值: {processed.n_removed_outliers}")
        print(f"  预处理可能改变结论: {verdict_changed_flag}")
        print(f"  有对比图: 直方图={has_comparison}, Q-Q图={has_qq_comparison}")

        if has_comparison and has_qq_comparison:
            passed += 1
            print(f"  ✅ PASS: 对比图表正确生成")
        else:
            print(f"  ❌ FAIL: 对比图表缺失")

        vis.close_all()
    except Exception as e:
        traceback.print_exc()
        print(f"  ❌ ERROR: {e}")

    return passed, total


def main():
    print("\n" + "🧪 正态性检验说明器 - 综合测试套件" + "\n")

    all_passed = 0
    all_total = 0

    tests = [
        test_data_processor_empty_cases,
        test_data_processor_bad_data,
        test_normality_tester,
        test_visualizer,
        test_report_generator,
        test_preprocessing_verdict_change,
    ]

    for test_fn in tests:
        try:
            p, t = test_fn()
            all_passed += p
            all_total += t
        except Exception as e:
            traceback.print_exc()
            print(f"\n❌ 测试函数异常: {e}")

    print("\n" + "=" * 60)
    print(f"  测试总览: {all_passed}/{all_total} 通过")
    if all_passed == all_total:
        print("  🎉 全部测试通过！")
    else:
        print(f"  ⚠️  {all_total - all_passed} 项测试失败")
    print("=" * 60)

    return all_passed == all_total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
