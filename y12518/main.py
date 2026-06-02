#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
凸优化仓位约束器 - 主运行脚本
先跑顺利材料，再跑约束冲突的材料，报告把两类情况分开
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from datetime import datetime

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from portfolio_optimizer import (
    ConvexOptimizer,
    ConstraintExplainer,
    HistoryManager,
    ReportGenerator,
)
from portfolio_optimizer.data_models import SolverStatus
from test_cases import get_smooth_cases, get_conflict_cases


def print_separator(title: str = ""):
    """打印分隔线"""
    width = 70
    if title:
        padding = (width - len(title) - 2) // 2
        print("\n" + "=" * padding + " " + title + " " + "=" * padding)
    else:
        print("\n" + "=" * width)


def run_case(case: dict, optimizer: ConvexOptimizer, explainer: ConstraintExplainer,
             history: HistoryManager, save_history: bool = True) -> dict:
    """运行单个测试用例"""
    case_name = case["name"]
    case_input = case["input"]

    print(f"\n▶ 正在运行: {case_name}")
    print(f"  描述: {case['description']}")

    result = optimizer.solve(case_input)

    turnover = 0.0
    if result.optimal_weights:
        current_weights = case_input.get_current_weights_array()
        stock_codes = case_input.get_stock_codes()
        opt_weights = np.array([result.optimal_weights.get(s, 0.0) for s in stock_codes])
        turnover = float(np.sum(np.abs(opt_weights - current_weights)))

    explanation = ""
    if result.is_success() or result.status == SolverStatus.INFEASIBLE:
        explanation = explainer.explain(case_input, result)

    if save_history:
        history_record = history.save_record(
            case_input,
            result,
            notes=f"测试用例: {case_name}",
        )
        print(f"  历史记录ID: {history_record.record_id}")

    print(f"  求解状态: {result.status.value}")
    print(f"  求解耗时: {result.solve_time_ms:.2f} ms")

    if result.is_success():
        print(f"  ✓ 求解成功")
        if result.optimal_weights:
            total = sum(result.optimal_weights.values())
            print(f"  最优权重合计: {total:.4f}")
    else:
        print(f"  ✗ 求解失败/异常")
        if result.error_message:
            print(f"  原因: {result.error_message[:100]}...")

    if result.conflicts:
        print(f"  数据冲突: {len(result.conflicts)} 条")
    if result.violations:
        print(f"  约束违反: {len(result.violations)} 条")

    return {
        **case,
        "result": result,
        "explanation": explanation,
        "turnover": turnover,
    }


def run_smooth_cases(optimizer: ConvexOptimizer, explainer: ConstraintExplainer,
                     history: HistoryManager) -> list:
    """运行顺利样例"""
    print_separator("第一部分: 顺利样例 (正常求解)")

    smooth_cases = get_smooth_cases()
    results = []

    for case in smooth_cases:
        result = run_case(case, optimizer, explainer, history)
        results.append(result)

    return results


def run_conflict_cases(optimizer: ConvexOptimizer, explainer: ConstraintExplainer,
                       history: HistoryManager) -> list:
    """运行约束冲突样例"""
    print_separator("第二部分: 约束冲突样例 (异常情况诊断)")

    conflict_cases = get_conflict_cases()
    results = []

    for case in conflict_cases:
        result = run_case(case, optimizer, explainer, history)
        results.append(result)

    return results


def verify_determinism(optimizer: ConvexOptimizer, case: dict, report_gen: ReportGenerator) -> str:
    """验证复算一致性"""
    print_separator("复算一致性验证")

    case_name = case["name"]
    case_input = case["input"]

    print(f"\n▶ 验证样例: {case_name}")
    print("  运行3次求解，验证结果一致性...")

    is_consistent, results = optimizer.verify_determinism(case_input, num_runs=3)

    if is_consistent:
        print("  ✓ 复算验证通过 - 结果完全一致")
    else:
        print("  ✗ 复算验证失败 - 结果不一致")

    report_path = report_gen.generate_determinism_report(case_name, is_consistent, results)
    print(f"  详细报告: {report_path}")

    return report_path


def demonstrate_history_features(history: HistoryManager, record_id: str = None):
    """演示历史记录功能"""
    print_separator("历史记录功能演示")

    print("\n【一、原始材料、处理结论、人工修正】")

    if record_id is None:
        records = history.list_records(limit=1)
        if records:
            record_id = records[0].record_id
        else:
            print("  暂无历史记录")
            return

    print(f"\n▶ 查看历史记录: {record_id}")
    display = history.display_record(record_id)
    print(display)

    print("\n▶ 添加人工修正")
    correction = {
        "manual_weights": {"000001": 0.16, "000002": 0.13},
        "reason": "研究员根据最新信息调整权重",
        "adjusted_by": "基金研究员A",
    }
    updated = history.update_manual_correction(
        record_id,
        correction,
        notes="限制名单晚到，先根据经验调整",
    )
    if updated:
        print("  ✓ 人工修正已保存")
        print(f"  修正内容: {json.dumps(correction, ensure_ascii=False, indent=4)}")

    print("\n▶ 历史记录列表 (最近3条):")
    records = history.list_records(limit=3)
    for i, rec in enumerate(records, 1):
        summary = history.get_record_summary(rec)
        print(f"  {i}. {rec.record_id[:8]}... "
              f"状态: {summary['status']}, "
              f"股票数: {summary['stock_count']}, "
              f"冲突: {summary['conflicts_count']}, "
              f"有修正: {'是' if summary['has_manual_correction'] else '否'}")


def main():
    """主函数"""
    print("\n" + "=" * 70)
    print("凸优化仓位约束器 - 完整测试流程")
    print("=" * 70)
    print(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    optimizer = ConvexOptimizer(enable_deterministic=True)
    explainer = ConstraintExplainer()
    history = HistoryManager()
    report_gen = ReportGenerator()

    history.clear_all()
    print("\n✓ 历史记录已清空")

    smooth_results = run_smooth_cases(optimizer, explainer, history)

    conflict_results = run_conflict_cases(optimizer, explainer, history)

    if smooth_results:
        verify_determinism(optimizer, get_smooth_cases()[0], report_gen)

    if smooth_results and conflict_results:
        first_record = history.list_records(limit=1)
        if first_record:
            demonstrate_history_features(history, first_record[0].record_id)

    print_separator("生成综合报告")

    report_path = report_gen.generate_full_report(
        smooth_results,
        conflict_results,
        include_explanations=True,
    )
    print(f"\n✓ 综合报告已生成: {report_path}")

    json_data = {
        "generated_at": datetime.now().isoformat(),
        "smooth_cases": [
            {
                "name": r["name"],
                "description": r["description"],
                "status": r["result"].status.value,
                "optimal_weights": r["result"].optimal_weights,
                "conflicts": [c.model_dump() for c in r["result"].conflicts],
                "violations": [v.model_dump() for v in r["result"].violations],
            }
            for r in smooth_results
        ],
        "conflict_cases": [
            {
                "name": r["name"],
                "description": r["description"],
                "status": r["result"].status.value,
                "error_message": r["result"].error_message,
                "infeasibility_causes": r["result"].solver_details.get("infeasibility_causes", []),
                "conflicts": [c.model_dump() for c in r["result"].conflicts],
                "violations": [v.model_dump() for v in r["result"].violations],
            }
            for r in conflict_results
        ],
    }
    json_path = report_gen.save_json_report(json_data, "optimizer_results")
    print(f"✓ JSON数据已保存: {json_path}")

    print_separator("执行结果汇总")
    print("\n【顺利样例】")
    for i, r in enumerate(smooth_results, 1):
        status = "✓" if r["result"].is_success() else "✗"
        print(f"  {i}. {status} {r['name']}: {r['result'].status.value}")

    print("\n【冲突样例】")
    for i, r in enumerate(conflict_results, 1):
        status = "✓" if r["result"].is_success() else "✗"
        detail = ""
        if not r["result"].is_success():
            causes = r["result"].solver_details.get("infeasibility_causes", [])
            if causes:
                detail = f" - {causes[0][:50]}..."
        print(f"  {i}. {status} {r['name']}: {r['result'].status.value}{detail}")

    print("\n" + "=" * 70)
    print("测试执行完成！")
    print("=" * 70 + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
