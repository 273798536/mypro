"""
凸包面积参数试算 - 功能测试脚本
验证各模块功能是否正常工作
"""

import sys
import os
import tempfile
import json
import numpy as np
import pandas as pd
from convex_hull_calculator import PointData


def test_convex_hull_calculator():
    """测试凸包计算器"""
    print("=" * 50)
    print("测试 1: 凸包计算器核心功能")
    print("=" * 50)

    from convex_hull_calculator import ConvexHullCalculator, PointData

    calculator = ConvexHullCalculator()

    points = [
        PointData(id="P1", x=0.0, y=0.0),
        PointData(id="P2", x=2.0, y=0.0),
        PointData(id="P3", x=2.0, y=2.0),
        PointData(id="P4", x=0.0, y=2.0),
        PointData(id="P5", x=1.0, y=1.0),
    ]

    result = calculator.compute_convex_hull(points)

    print(f"  输入点数: {len(points)}")
    print(f"  凸包面积: {result.area}")
    print(f"  凸包顶点数: {len(result.hull_points)}")
    print(f"  计算日志行数: {len(result.calculation_trace)}")

    assert abs(result.area - 4.0) < 0.01, f"面积应为4.0（2x2正方形），实际为{result.area}"
    assert len(result.hull_points) == 4, f"顶点数应为4，实际为{len(result.hull_points)}"
    print("  ✅ 通过")

    weights = {"x": 2.0, "y": 1.0}
    result_weighted = calculator.compute_convex_hull(points, weights=weights)
    print(f"  加权后面积 (x2, y1): {result_weighted.area}")
    print("  ✅ 权重功能通过")

    points_with_dup = points + [PointData(id="P1", x=0.0, y=0.0, is_duplicate=True)]
    result_exclude_dup = calculator.compute_convex_hull(
        points_with_dup, exclude_duplicates=True
    )
    print(f"  排除重复后有效点数: {len(result_exclude_dup.used_points)}")
    assert len(result_exclude_dup.used_points) == 5
    print("  ✅ 重复样本排除功能通过")

    print()


def test_data_manager():
    """测试数据管理器"""
    print("=" * 50)
    print("测试 2: 数据管理器功能")
    print("=" * 50)

    from data_manager import DataManager

    dm = DataManager()

    points = dm.load_demo_data()
    summary = dm.get_data_summary()

    print(f"  总样本数: {summary['total']}")
    print(f"  干净数据: {summary['clean']}")
    print(f"  脏数据: {summary['dirty']}")
    print(f"  重复样本: {summary['duplicates']}")
    print(f"  数据来源: {summary['source']}")

    assert summary["total"] == 15, f"期望15条，实际{summary['total']}"
    assert summary["dirty"] > 0, "应该有脏数据"
    assert summary["duplicates"] > 0, "应该有重复样本"

    dup_points = [p for p in points if p.is_duplicate]
    print(f"  检测到重复样本数: {len(dup_points)}")
    for p in dup_points:
        print(f"    - {p.id}: {p.dirty_reason} (来源: {p.source})")

    dirty_points = [p for p in points if p.is_dirty and not p.is_duplicate]
    print(f"  检测到脏数据数: {len(dirty_points)}")
    for p in dirty_points:
        print(f"    - {p.id}: {p.dirty_reason}")

    sources = dm.get_sources()
    print(f"  数据源列表: {sources}")
    assert len(sources) >= 3, "应该至少有3个数据源"

    print("  ✅ 通过")
    print()


def test_history_manager():
    """测试历史记录管理器"""
    print("=" * 50)
    print("测试 3: 历史记录功能")
    print("=" * 50)

    from history_manager import HistoryManager

    tmp_file = tempfile.mktemp(suffix=".json")
    hm = HistoryManager(history_file=tmp_file)

    old_weights = {"x": 1.0, "y": 1.0}
    new_weights = {"x": 1.5, "y": 1.2}

    record = hm.record_weight_change(
        old_weights=old_weights,
        new_weights=new_weights,
        operator="测试员",
        reason="测试权重变更",
        area_before=100.0,
        area_after=150.0,
    )

    print(f"  记录时间: {record.timestamp}")
    print(f"  操作人: {record.operator}")
    print(f"  变更原因: {record.reason}")

    weight_changes = hm.get_weight_change_history()
    assert len(weight_changes) == 1
    print(f"  历史记录数: {len(weight_changes)}")

    result = hm.confirm_weight_change(0, "确认人")
    assert result == True
    assert weight_changes[0].is_manual_confirmed == True
    print("  ✅ 人工确认功能通过")

    explanation = hm.get_change_explanation(0)
    assert "权重变更说明" in explanation
    assert "凸包面积" in explanation
    print("  ✅ 变更解释生成通过")

    hm.record_calculation(
        weights={"x": 1.5, "y": 1.2},
        area=150.0,
        exclude_duplicates=True,
        exclude_dirty=True,
        used_points_count=10,
        excluded_points_count=5,
        data_source="测试数据",
        operator="测试员",
    )

    calc_history = hm.get_calculation_history()
    assert len(calc_history) == 1
    print(f"  计算历史数: {len(calc_history)}")

    daily = hm.get_daily_summary()
    print(f"  今日计算次数: {daily['calculation_count']}")
    print(f"  今日权重变更: {daily['weight_change_count']}")
    assert daily["calculation_count"] == 1
    assert daily["weight_change_count"] == 1

    print("  ✅ 通过")

    if os.path.exists(tmp_file):
        os.remove(tmp_file)
    print()


def test_report_generator():
    """测试报告生成器"""
    print("=" * 50)
    print("测试 4: 报告生成功能")
    print("=" * 50)

    from report_generator import ReportGenerator
    from data_manager import DataManager
    from convex_hull_calculator import ConvexHullCalculator

    rg = ReportGenerator()
    dm = DataManager()
    calc = ConvexHullCalculator()

    points = dm.load_demo_data()
    result = calc.compute_convex_hull(points, weights={"x": 1.2, "y": 0.8})

    report = rg.generate_full_report(
        result=result,
        data_manager=dm,
        report_title="测试报告",
        operator="测试员",
    )

    assert "# 测试报告" in report
    assert "凸包面积" in report
    assert "权重参数" in report
    assert "筛选口径" in report
    assert "数据来源" in report
    assert "原始数据清单" in report

    sections = ["一、核心结论", "二、权重参数", "三、筛选口径", "四、数据来源说明", "五、凸包顶点"]
    for section in sections:
        assert section in report, f"报告缺少章节: {section}"

    print(f"  报告长度: {len(report)} 字符")
    print(f"  包含章节: {len(sections)} 个")
    print("  ✅ 完整报告生成通过")

    summary_report = rg.generate_summary_report(result, dm, "测试员")
    assert "摘要" in summary_report
    print("  ✅ 摘要报告生成通过")

    tmp_report = tempfile.mktemp(suffix=".md")
    rg.save_report(report, tmp_report)
    assert os.path.exists(tmp_report)
    print("  ✅ 报告保存功能通过")

    batch_results = [
        ({"x": 1.0, "y": 1.0}, 100.0),
        ({"x": 1.5, "y": 1.0}, 150.0),
        ({"x": 1.0, "y": 1.5}, 150.0),
    ]
    batch_report = rg.generate_batch_report(batch_results, dm, "批量试算报告")
    assert "批量试算报告" in batch_report
    assert "极值分析" in batch_report
    print("  ✅ 批量试算报告通过")

    if os.path.exists(tmp_report):
        os.remove(tmp_report)
    print()


def test_batch_calculation():
    """测试批量参数试算"""
    print("=" * 50)
    print("测试 5: 批量参数试算")
    print("=" * 50)

    from convex_hull_calculator import ConvexHullCalculator, PointData

    calculator = ConvexHullCalculator()

    points = [
        PointData(id="P1", x=0.0, y=0.0),
        PointData(id="P2", x=3.0, y=0.0),
        PointData(id="P3", x=3.0, y=4.0),
        PointData(id="P4", x=0.0, y=4.0),
    ]

    weight_ranges = {
        "x": (1.0, 2.0, 0.5),
        "y": (1.0, 2.0, 0.5),
    }

    results = calculator.batch_try_calculate(points, weight_ranges)

    print(f"  试算组合数: {len(results)}")
    assert len(results) == 9, f"期望9个组合（3x3），实际{len(results)}"

    for weights, area in results:
        print(f"    x={weights['x']:.1f}, y={weights['y']:.1f} → 面积={area:.4f}")

    print("  ✅ 通过")
    print()


def test_demo_data_integrity():
    """验证演示数据满足需求：有重复样本、有后补备注、有脏数据"""
    print("=" * 50)
    print("测试 6: 演示数据完整性验证")
    print("=" * 50)

    from data_manager import DataManager

    dm = DataManager()
    points = dm.load_demo_data()

    has_duplicate = any(p.is_duplicate for p in points)
    has_dirty = any(p.is_dirty for p in points)
    has_note = any("后补" in p.note or "补考" in p.note for p in points)
    has_multiple_sources = len(dm.get_sources()) >= 3
    has_missing_x = any(p.original_x is None for p in points)
    has_missing_y = any(p.original_y is None for p in points)

    print(f"  有重复样本: {'✅' if has_duplicate else '❌'}")
    print(f"  有脏数据: {'✅' if has_dirty else '❌'}")
    print(f"  有后补备注: {'✅' if has_note else '❌'}")
    print(f"  有多个数据源: {'✅' if has_multiple_sources else '❌'}")
    print(f"  有X值缺失(原始为None): {'✅' if has_missing_x else '❌'}")
    print(f"  有Y值缺失(原始为None): {'✅' if has_missing_y else '❌'}")

    assert has_duplicate, "演示数据应有重复样本"
    assert has_dirty, "演示数据应有脏数据"
    assert has_note, "演示数据应有后补备注"
    assert has_multiple_sources, "演示数据应有多个数据源"
    assert has_missing_x, "演示数据应有X值缺失（原始None，不应被替换）"
    assert has_missing_y, "演示数据应有Y值缺失（原始None，不应被替换）"

    # 验证 S009 的 x 原始值为 None（缺失）
    s009 = next(p for p in points if p.id == "S009")
    assert s009.original_x is None, f"S009 的 original_x 应为 None，实际为 {s009.original_x}"
    assert np.isnan(s009.x), f"S009 的 x 应为 NaN，实际为 {s009.x}"
    print(f"  ✅ S009 验证通过: original_x=None, x=NaN")

    # 验证 S010 的 y 原始值为 None（缺失）
    s010 = next(p for p in points if p.id == "S010")
    assert s010.original_y is None, f"S010 的 original_y 应为 None，实际为 {s010.original_y}"
    assert np.isnan(s010.y), f"S010 的 y 应为 NaN，实际为 {s010.y}"
    print(f"  ✅ S010 验证通过: original_y=None, y=NaN")

    print()
    print("  演示数据明细:")
    for p in points:
        status = " "
        if p.is_duplicate:
            status += "🔄"
        if p.is_dirty:
            status += "❌"
        if not p.is_dirty and not p.is_duplicate:
            status += "✅"
        disp_x = p.original_x if p.original_x is not None else "(缺失)"
        disp_y = p.original_y if p.original_y is not None else "(缺失)"
        print(f"    {status} {p.id} | x={disp_x}, y={disp_y} | {p.source} | {p.note}")

    print("  ✅ 演示数据通过")
    print()


def test_filter_parameters_recorded():
    """测试筛选参数被正确记录到结果中，不依赖反推"""
    print("=" * 50)
    print("测试 7: 筛选参数记录验证")
    print("=" * 50)

    from data_manager import DataManager
    from convex_hull_calculator import ConvexHullCalculator

    dm = DataManager()
    calculator = ConvexHullCalculator()
    points = dm.load_demo_data()

    # 场景1: 排除重复、排除脏数据
    result1 = calculator.compute_convex_hull(
        points, exclude_duplicates=True, exclude_dirty=True
    )
    assert result1.exclude_duplicates == True
    assert result1.exclude_dirty == True
    print(f"  场景1(排除/排除): exclude_dup={result1.exclude_duplicates}, exclude_dirty={result1.exclude_dirty}")
    print(f"    排除点数: {len(result1.excluded_points)}")

    # 场景2: 保留重复、排除脏数据
    result2 = calculator.compute_convex_hull(
        points, exclude_duplicates=False, exclude_dirty=True
    )
    assert result2.exclude_duplicates == False
    assert result2.exclude_dirty == True
    print(f"  场景2(保留/排除): exclude_dup={result2.exclude_duplicates}, exclude_dirty={result2.exclude_dirty}")
    print(f"    排除点数: {len(result2.excluded_points)}")

    # 场景3: 只选择"补考数据"数据源（无重复），但设置排除重复
    # 此时 exclude_duplicates 应为 True，但 excluded_points 中没有重复样本
    from data_manager import DataManager
    dm2 = DataManager()
    pts_bukao = dm2.load_from_dataframe(
        pd.DataFrame([
            {"id": "B001", "x": 70.0, "y": 80.0, "note": "补考1", "source": "补考数据"},
            {"id": "B002", "x": 65.0, "y": 72.0, "note": "补考2", "source": "补考数据"},
            {"id": "B003", "x": 75.0, "y": 68.0, "note": "补考3", "source": "补考数据"},
        ]),
        source_name="补考数据"
    )
    result3 = calculator.compute_convex_hull(
        pts_bukao, exclude_duplicates=True, exclude_dirty=True
    )
    # 验证筛选参数是 True（用户设置的），而非从 excluded_points 反推的 False
    assert result3.exclude_duplicates == True, "筛选参数应记录用户实际设置，而非反推"
    assert result3.exclude_dirty == True
    print(f"  场景3(补考数据无重复): exclude_dup={result3.exclude_duplicates}, exclude_dirty={result3.exclude_dirty}")
    print(f"    排除点数: {len(result3.excluded_points)}")
    print(f"    ✅ 即使没有重复样本被排除，筛选参数仍为 True（记录用户实际设置）")

    print("  ✅ 筛选参数记录通过")
    print()


def test_report_filter_parameters():
    """测试报告中的筛选口径与用户设置一致"""
    print("=" * 50)
    print("测试 8: 报告筛选口径验证")
    print("=" * 50)

    from data_manager import DataManager
    from convex_hull_calculator import ConvexHullCalculator
    from report_generator import ReportGenerator

    dm = DataManager()
    calculator = ConvexHullCalculator()
    rg = ReportGenerator()

    # 构造无重复但设置排除重复的场景
    pts_clean = [
        PointData(id="C001", x=70.0, y=80.0),
        PointData(id="C002", x=65.0, y=72.0),
        PointData(id="C003", x=75.0, y=68.0),
    ]
    result = calculator.compute_convex_hull(
        pts_clean, exclude_duplicates=True, exclude_dirty=True
    )

    report = rg.generate_full_report(result, dm, "测试报告", "测试员")

    # 报告中应写"重复样本: 排除"和"脏数据: 排除"，而不是"保留"
    assert "重复样本: 排除" in report, f"报告筛选口径错误，应为'排除'，报告内容：\n{report}"
    assert "脏数据（缺失/异常）: 排除" in report
    print(f"  ✅ 报告筛选口径与用户设置一致：排除重复、排除脏数据")

    # 再测一次保留的情况
    result2 = calculator.compute_convex_hull(
        pts_clean, exclude_duplicates=False, exclude_dirty=False
    )
    report2 = rg.generate_full_report(result2, dm, "测试报告2", "测试员")
    assert "重复样本: 保留" in report2
    assert "脏数据（缺失/异常）: 保留" in report2
    print(f"  ✅ 报告筛选口径与用户设置一致：保留重复、保留脏数据")

    print("  ✅ 报告筛选口径验证通过")
    print()


def run_all_tests():
    """运行所有测试"""
    print("\n")
    print("🚀 开始运行凸包面积参数试算 - 功能测试")
    print("\n")

    all_passed = True

    try:
        test_convex_hull_calculator()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        all_passed = False

    try:
        test_data_manager()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        all_passed = False

    try:
        test_history_manager()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        all_passed = False

    try:
        test_report_generator()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        all_passed = False

    try:
        test_batch_calculation()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        all_passed = False

    try:
        test_demo_data_integrity()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False

    try:
        test_filter_parameters_recorded()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False

    try:
        test_report_filter_parameters()
    except Exception as e:
        print(f"  ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False

    print("=" * 50)
    if all_passed:
        print("🎉 所有测试通过！")
    else:
        print("⚠️  部分测试未通过，请检查")
    print("=" * 50)

    return all_passed


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
