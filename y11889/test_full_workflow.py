#!/usr/bin/env python3
import os
import shutil

from feed_optimizer import (
    FormulationRunner,
    SolutionComparator,
    HistoryManager,
    ReportGenerator
)

def cleanup_history():
    if os.path.exists('./history'):
        shutil.rmtree('./history')
    os.makedirs('./history', exist_ok=True)

def test_full_workflow():
    print("=" * 70)
    print("饲料配方线性规划助手 - 完整流程测试")
    print("=" * 70)
    
    cleanup_history()
    
    runner = FormulationRunner()
    history_mgr = HistoryManager()
    comparator = SolutionComparator()
    reporter = ReportGenerator()
    
    constraints = {
        '目标产量': 1000,
        '粗蛋白最低': 18.0,
        '消化能最低': 3.2
    }
    
    print("\n📋 测试1: 基础配方运行")
    print("-" * 70)
    result1 = runner.run_formulation('examples/ingredients_base.csv', constraints, "基础配方")
    history_mgr.save_run(result1)
    print(reporter.generate_text_report(result1, show_details=False))
    
    print("\n📋 测试2: 原料涨价后重新配方")
    print("-" * 70)
    result2 = runner.run_formulation('examples/ingredients_price_rise.csv', constraints, "涨价后配方")
    history_mgr.save_run(result2)
    print(reporter.generate_text_report(result2, show_details=False))
    
    print("\n📋 测试3: 两个方案对比")
    print("-" * 70)
    runs = history_mgr.list_runs()
    if len(runs) >= 2:
        run1 = history_mgr.load_run(runs[1]['filepath'])
        run2 = history_mgr.load_run(runs[0]['filepath'])
        comparison = comparator.compare(run1, run2)
        print(reporter.generate_comparison_report(comparison))
    
    print("\n📋 测试4: 库存不足场景测试")
    print("-" * 70)
    constraints_high_prod = {
        '目标产量': 2000,
        '粗蛋白最低': 18.0,
        '消化能最低': 3.2
    }
    result3 = runner.run_formulation('examples/ingredients_price_rise.csv', constraints_high_prod, "库存不足测试")
    print(reporter.generate_text_report(result3, show_details=False))
    
    print("\n📋 测试5: 坏数据过滤测试")
    print("-" * 70)
    result4 = runner.run_formulation('examples/ingredients_with_bad_data.csv', constraints, "坏数据测试")
    print(reporter.generate_text_report(result4, show_details=False))
    
    print("\n📋 测试6: 历史记录和月度汇总")
    print("-" * 70)
    history_mgr.save_run(result3)
    history_mgr.save_run(result4)
    
    summary = history_mgr.get_monthly_summary(2026, 5)
    print(f"月度汇总 (2026年5月):")
    print(f"  总运行次数: {summary['总运行次数']}")
    print(f"  可行方案数: {summary['可行方案数']}")
    print(f"  成功率: {summary['成功率']}%")
    print(f"  平均成本: {summary['成本统计']['平均成本']:.2f} 元")
    
    print("\n✅ 所有测试完成!")
    print("=" * 70)

if __name__ == '__main__':
    test_full_workflow()
