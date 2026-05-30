"""多目标减碳配额优化系统 - CLI入口"""
import argparse
import pandas as pd
import os
import sys
from datetime import datetime
from typing import Optional

from .data_cleaner import DataCleaner
from .optimizer import MultiObjectiveOptimizer
from .conflict_detector import ConflictDetector
from .report_exporter import ResultExporter
from .sensitivity_analyzer import SensitivityAnalyzer
from .models import (
    OptimizationConstraint, ObjectiveType,
    DepartmentEmission, BudgetLimit, ReductionProject, BusinessIndicator
)


def load_data(emission_path: str,
              budget_path: str,
              project_path: str,
              indicator_path: Optional[str] = None) -> tuple:
    """加载数据文件"""
    emissions_df = pd.read_csv(emission_path)
    budgets_df = pd.read_csv(budget_path)
    projects_df = pd.read_csv(project_path)

    indicators_df = None
    if indicator_path and os.path.exists(indicator_path):
        indicators_df = pd.read_csv(indicator_path)

    return emissions_df, budgets_df, projects_df, indicators_df


def run_analysis(args) -> int:
    """运行完整分析流程"""
    print("=" * 60)
    print("多目标减碳配额优化系统")
    print("=" * 60)
    print()

    if not os.path.exists(args.emissions):
        print(f"错误: 部门排放文件不存在: {args.emissions}")
        return 1
    if not os.path.exists(args.budgets):
        print(f"错误: 预算上限文件不存在: {args.budgets}")
        return 1
    if not os.path.exists(args.projects):
        print(f"错误: 减碳项目文件不存在: {args.projects}")
        return 1

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    print("[1/6] 加载数据...")
    emissions_df, budgets_df, projects_df, indicators_df = load_data(
        args.emissions, args.budgets, args.projects, args.indicators
    )
    print(f"  - 部门排放: {len(emissions_df)} 条记录")
    print(f"  - 预算上限: {len(budgets_df)} 条记录")
    print(f"  - 减碳项目: {len(projects_df)} 条记录")
    if indicators_df is not None:
        print(f"  - 业务指标: {len(indicators_df)} 条记录")
    else:
        print(f"  - 业务指标: 未提供（可选）")

    print()
    print("[2/6] 数据清洗和异常检测...")
    cleaner = DataCleaner()

    emissions, emission_anomalies = cleaner.clean_department_emissions(emissions_df)
    budgets, budget_anomalies = cleaner.clean_budget_limits(budgets_df)
    projects, project_anomalies = cleaner.clean_reduction_projects(projects_df)
    indicators, indicator_anomalies = cleaner.clean_business_indicators(indicators_df)

    all_anomalies = emission_anomalies + budget_anomalies + project_anomalies + indicator_anomalies

    by_severity = {}
    for a in all_anomalies:
        by_severity[a.severity] = by_severity.get(a.severity, 0) + 1
    print(f"  共发现 {len(all_anomalies)} 个异常:")
    for sev, count in by_severity.items():
        print(f"    - {sev}: {count} 个")

    errors = [a for a in all_anomalies if a.severity == "error"]
    if errors and not args.ignore_errors:
        print()
        print("错误: 发现严重异常，无法继续优化。请修复数据或使用 --ignore-errors 忽略。")
        print("严重异常列表:")
        for e in errors:
            print(f"  - [{e.data_type}] {e.record_id}: {e.description}")
            if e.suggested_fix:
                print(f"    建议: {e.suggested_fix}")
        return 1

    print()
    print("[3/6] 检测项目冲突...")
    conflict_detector = ConflictDetector(emissions, budgets, projects, indicators)
    project_conflicts = conflict_detector.detect_project_conflicts()
    print(f"  发现 {len(project_conflicts)} 个项目级冲突")

    print()
    print("[4/6] 执行多目标优化...")
    optimizer = MultiObjectiveOptimizer(emissions, budgets, projects, indicators)

    objective_map = {
        "minimize_emission": ObjectiveType.MINIMIZE_EMISSION,
        "minimize_cost": ObjectiveType.MINIMIZE_COST,
        "maximize_reduction": ObjectiveType.MAXIMIZE_REDUCTION,
        "balance": ObjectiveType.BALANCE
    }
    objective_type = objective_map.get(args.objective, ObjectiveType.BALANCE)

    constraint = OptimizationConstraint(
        max_budget_utilization=args.max_budget,
        min_reduction_ratio=args.min_reduction,
        max_project_count=args.max_projects,
        allow_over_budget=args.allow_over_budget,
        required_departments=args.required_depts.split(",") if args.required_depts else [],
        excluded_departments=args.excluded_depts.split(",") if args.excluded_depts else []
    )

    print(f"  优化目标: {objective_type.value}")
    print(f"  预算使用率上限: {constraint.max_budget_utilization * 100:.0f}%")
    print(f"  最低减排比例: {constraint.min_reduction_ratio * 100:.0f}%")
    print(f"  允许超限: {'是' if constraint.allow_over_budget else '否'}")

    opt_result = optimizer.optimize(constraint, objective_type, generate_pareto=True)

    primary = opt_result.get("primary_result")
    if primary:
        print()
        print("  优化结果:")
        print(f"    - 选中项目: {len(primary['selected_projects'])} 个")
        print(f"    - 总成本: {primary['total_cost']:.2f} 元")
        print(f"    - 总减排: {primary['total_reduction']:.2f} 吨CO₂e")
        print(f"    - 净排放: {primary['net_emission']:.2f} 吨CO₂e")
        print(f"    - 预算使用率: {primary['budget_utilization'] * 100:.2f}%")

        over_amount = primary.get("over_budget_amount", 0)
        budget_limit = optimizer.total_budget * constraint.max_budget_utilization
        total_cost = primary.get("total_cost", 0)
        over_ratio = over_amount / budget_limit if budget_limit > 0 else 0

        if over_amount <= 0:
            status = "within_budget"
            conclusion = f"预算使用合规，剩余预算 {abs(over_amount):.2f} 元 ({abs(over_amount/budget_limit*100 if budget_limit>0 else 0):.2f}%)"
        else:
            status = "over_budget"
            conclusion = f"预算超限 {over_amount:.2f} 元 ({over_ratio*100:.2f}%)，需调整方案或申请追加预算"

        budget_check = {
            "status": status,
            "total_cost": total_cost,
            "budget_limit": budget_limit,
            "over_amount": over_amount,
            "over_ratio": over_ratio,
            "conclusion": conclusion,
            "is_over_budget": over_amount > 0
        }
        print(f"    - 预算状态: {budget_check['conclusion']}")

        if primary.get("constraint_violations"):
            print(f"    - 约束违规: {len(primary['constraint_violations'])} 项")
            for v in primary["constraint_violations"]:
                print(f"      * {v}")

        from .models import OptimizationResult as OR
        primary_result_obj = OR(
            selected_projects=primary['selected_projects'],
            total_cost=primary['total_cost'],
            total_reduction=primary['total_reduction'],
            net_emission=primary['net_emission'],
            budget_utilization=primary['budget_utilization'],
            objective_scores={ObjectiveType(k): v for k, v in primary['objective_scores'].items()},
            rank=primary.get('rank', 0),
            is_feasible=primary.get('is_feasible', True),
            over_budget_amount=primary.get('over_budget_amount', 0),
            constraint_violations=primary.get('constraint_violations', [])
        )

        print()
        print("[5/6] 检测目标冲突并生成修正建议...")
        objective_conflicts = conflict_detector.detect_objective_conflicts(
            primary_result_obj, constraint
        )
        all_conflicts = project_conflicts + objective_conflicts
        print(f"  共发现 {len(all_conflicts)} 个冲突")

        if all_conflicts:
            correction_plan = conflict_detector.generate_correction_plan(all_conflicts, primary_result_obj)
            print(f"  生成 {len(correction_plan['action_items'])} 条修正建议")

            print()
            print("  首要修正建议:")
            print(f"    {correction_plan['estimated_impact']['recommended_first_step']}")

        if args.run_sensitivity:
            print()
            print("[6/6] 执行敏感性分析...")
            analyzer = SensitivityAnalyzer(emissions, budgets, projects, indicators)
            sens_result = analyzer.run_full_analysis(constraint, objective_type)

            print(f"  最敏感参数: {sens_result['summary']['most_sensitive_parameter']}")
            print(f"  最敏感项目:")
            for p in sens_result['summary']['most_sensitive_projects'][:3]:
                print(f"    - {p['project_name']}: {p['sensitivity_score']:.4f}")
        else:
            print("[6/6] 跳过敏感性分析（使用 --run-sensitivity 启用）")

        print()
        print("[导出] 生成报告和图表...")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        exporter = ResultExporter(
            emissions, budgets, projects, all_anomalies, all_conflicts, opt_result, indicators
        )

        charts = exporter.generate_all_charts(output_dir)
        for name, path in charts.items():
            if path:
                print(f"  - {name}图表: {os.path.basename(path)}")

        excel_path = os.path.join(output_dir, f"优化结果_{timestamp}.xlsx")
        exporter.export_to_excel(excel_path, charts)
        print(f"  - Excel报告: {os.path.basename(excel_path)}")

        json_path = os.path.join(output_dir, f"优化结果_{timestamp}.json")
        exporter.export_to_json(json_path)
        print(f"  - JSON报告: {os.path.basename(json_path)}")

        report_path = os.path.join(output_dir, f"优化报告_{timestamp}.txt")
        exporter.export_text_report(report_path)
        print(f"  - 文本报告: {os.path.basename(report_path)}")

        if args.run_sensitivity:
            sens_charts = analyzer.generate_sensitivity_charts(sens_result, output_dir)
            for name, path in sens_charts.items():
                if path:
                    print(f"  - 敏感性{name}图表: {os.path.basename(path)}")

            sens_excel = os.path.join(output_dir, f"敏感性分析_{timestamp}.xlsx")
            analyzer.export_sensitivity_report(sens_result, sens_excel)
            print(f"  - 敏感性分析报告: {os.path.basename(sens_excel)}")

        print()
        print("=" * 60)
        print("分析完成！所有结果已导出到:", output_dir)
        print("=" * 60)

        if primary.get("over_budget_amount", 0) > 0:
            print()
            print("⚠️  重要提醒: 当前方案超出预算，请查看修正建议调整方案。")

        return 0
    else:
        print()
        print("错误: 未能找到可行的优化方案。请尝试调整约束条件。")
        print("建议:")
        print("  1. 使用 --allow-over-budget 允许超限查看可行方案")
        print("  2. 降低 --min-reduction 最低减排比例要求")
        print("  3. 提高 --max-budget 预算使用率上限")
        return 1


def main():
    """主入口函数"""
    parser = argparse.ArgumentParser(
        description="多目标减碳配额优化系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用默认参数运行
  python -m multi_objective_carbon.cli \\
      --emissions examples/department_emissions.csv \\
      --budgets examples/budget_limits.csv \\
      --projects examples/reduction_projects.csv

  # 触发预算超限分析
  python -m multi_objective_carbon.cli \\
      --emissions examples/department_emissions.csv \\
      --budgets examples/budget_limits.csv \\
      --projects examples/reduction_projects.csv \\
      --min-reduction 0.3 --max-budget 0.8

  # 运行完整分析（含敏感性分析）
  python -m multi_objective_carbon.cli \\
      --emissions examples/department_emissions.csv \\
      --budgets examples/budget_limits.csv \\
      --projects examples/reduction_projects.csv \\
      --indicators examples/business_indicators.csv \\
      --run-sensitivity --objective maximize_reduction
        """
    )

    parser.add_argument("--emissions", required=True,
                        help="部门排放数据CSV文件路径")
    parser.add_argument("--budgets", required=True,
                        help="预算上限数据CSV文件路径")
    parser.add_argument("--projects", required=True,
                        help="减碳项目数据CSV文件路径")
    parser.add_argument("--indicators", default=None,
                        help="业务指标数据CSV文件路径（可选）")
    parser.add_argument("--output-dir", default="output",
                        help="输出目录，默认为 output")

    parser.add_argument("--objective", default="balance",
                        choices=["minimize_emission", "minimize_cost", "maximize_reduction", "balance"],
                        help="优化目标，默认为 balance（平衡）")
    parser.add_argument("--max-budget", type=float, default=1.0,
                        help="最大预算使用率，默认为 1.0（100%）")
    parser.add_argument("--min-reduction", type=float, default=0.1,
                        help="最低减排比例，默认为 0.1（10%）")
    parser.add_argument("--max-projects", type=int, default=None,
                        help="最大项目数量，默认为不限制")
    parser.add_argument("--allow-over-budget", action="store_true",
                        help="允许预算超限，默认为不允许")
    parser.add_argument("--required-depts", default=None,
                        help="必须包含的部门ID，多个用逗号分隔")
    parser.add_argument("--excluded-depts", default=None,
                        help="排除的部门ID，多个用逗号分隔")

    parser.add_argument("--run-sensitivity", action="store_true",
                        help="运行敏感性分析")
    parser.add_argument("--ignore-errors", action="store_true",
                        help="忽略数据错误继续运行")

    args = parser.parse_args()

    try:
        sys.exit(run_analysis(args))
    except Exception as e:
        print(f"错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
