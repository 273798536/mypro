"""端到端测试脚本"""
import sys
sys.path.insert(0, ".")

from pathlib import Path
from ci_compare.core.data_import import (
    load_answers, save_snapshot, load_snapshot, list_snapshots, diff_snapshots
)
from ci_compare.core.analysis import run_full_analysis
from ci_compare.core.exporter import export_excel
from ci_compare.core.models import ComparisonSummary


def main():
    print("=" * 60)
    print("  置信区间口径对比 - 端到端测试")
    print("=" * 60)

    # 1. 加载 v1 数据
    print("\n[1/5] 加载 v1 数据...")
    answers1 = load_answers("data/sample_data_v1.xlsx")
    n_rated_v1 = sum(1 for a in answers1 if a.is_correct is not None)
    print(f"  记录总数: {len(answers1)}")
    print(f"  已评分: {n_rated_v1}")
    print(f"  未评分: {len(answers1) - n_rated_v1}")
    snap1 = save_snapshot(answers1, source_name="sample_data_v1.xlsx")
    print(f"  快照ID: {snap1.snapshot_id}")

    # 2. 加载 v2 数据
    print("\n[2/5] 加载 v2 数据（含晚到错题和评分补录）...")
    answers2 = load_answers("data/sample_data_v2.xlsx")
    n_rated_v2 = sum(1 for a in answers2 if a.is_correct is not None)
    print(f"  记录总数: {len(answers2)}")
    print(f"  已评分: {n_rated_v2}")
    snap2 = save_snapshot(answers2, source_name="sample_data_v2.xlsx")
    print(f"  快照ID: {snap2.snapshot_id}")

    # 3. 差异对比
    print("\n[3/5] 版本差异对比...")
    diff = diff_snapshots(answers1, answers2)
    print(f"  新增记录: {len(diff.added_records)}")
    print(f"  删除记录: {len(diff.removed_records)}")
    print(f"  评分更新: {len(diff.updated_records)}")
    print(f"  受影响分组: {len(diff.affected_groups)}")
    if diff.affected_groups:
        print(f"    例: {diff.affected_groups[:5]}")

    # 4. 运行完整分析
    print("\n[4/5] 运行置信区间分析与异常检测...")
    results = run_full_analysis(answers2)
    print(f"  置信区间结果: {len(results['ci_results'])} 条")
    print(f"  异常检测: {len(results['anomalies'])} 项")
    for a in results["anomalies"]:
        print(f"    [{a.anomaly_type.display_name}] ({a.severity.value}) {a.title}")
    print(f"  误差分析: {len(results['error_analyses'])} 组")
    n_large = sum(1 for e in results["error_analyses"] if e.is_approx_error_too_large)
    print(f"    其中近似误差过大（已拦截）: {n_large} 组")
    print(f"  反例（口径分歧）: {len(results['counter_examples'])} 个")
    for ce in results["counter_examples"]:
        print(f"    [{ce.impact_level}] {ce.group_key}")

    # 5. 导出
    print("\n[5/5] 导出 Excel 报告...")
    summary = ComparisonSummary(
        answers=answers2,
        ci_results=results["ci_results"],
        anomalies=results["anomalies"],
        error_analyses=results["error_analyses"],
        counter_examples=results["counter_examples"],
        snapshot=snap2,
        previous_snapshot=snap1,
        diff=diff,
    )
    path = export_excel(summary)
    print(f"  导出文件: {path}")
    print(f"  文件大小: {path.stat().st_size / 1024:.1f} KB")

    # 验证快照持久化
    print("\n[验证] 快照列表...")
    snaps = list_snapshots()
    print(f"  快照总数: {len(snaps)}")

    print("\n" + "=" * 60)
    print("  ✓ 所有测试通过！")
    print("=" * 60)


if __name__ == "__main__":
    main()
