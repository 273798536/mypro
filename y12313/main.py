import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from carbon_budget import (
    init_db, start_run, finish_run, append_history, load_history,
    import_departments_from_csv, import_budgets_from_csv, import_scenarios_from_json,
    validate_all, optimize, reoptimize_after_constraint_change, export_report,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_data")
REPORT_DIR = os.path.join(BASE_DIR, "reports")


def run_pipeline(constraint_explanations=None):
    init_db()

    run_id = start_run()
    print(f"[RUN] 开始执行 run_id={run_id}")

    departments = import_departments_from_csv(os.path.join(SAMPLE_DIR, "departments.csv"))
    budgets = import_budgets_from_csv(os.path.join(SAMPLE_DIR, "budgets.csv"))
    scenarios = import_scenarios_from_json(os.path.join(SAMPLE_DIR, "scenarios.json"))
    print(f"[IMPORT] 部门: {len(departments)}, 预算: {len(budgets)}, 方案: {len(scenarios)}")

    append_history(run_id, "import", {
        "departments": len(departments),
        "budgets": len(budgets),
        "scenarios": len(scenarios),
    })

    issues = validate_all(departments, budgets, scenarios)
    print(f"[VALIDATE] 问题清单: {len(issues)} 条")
    for i in issues:
        overridden = f" (被 {i.overridden_by} 覆盖)" if i.overridden_by else ""
        print(f"  [{i.severity}] {i.description}{overridden}")

    append_history(run_id, "validation", {
        "issue_count": len(issues),
        "issues": [
            {"id": i.issue_id, "severity": i.severity, "desc": i.description, "overridden_by": i.overridden_by}
            for i in issues
        ],
    })

    result = optimize(departments, budgets, scenarios, issues, constraint_explanations)
    print(f"[OPTIMIZE] 方案排序:")
    for r in result.scenario_rankings:
        overridden_mark = " ⚠ 预算超限覆盖了冲突/互斥" if r.get("overridden_by_overrun") else ""
        print(f"  #{r['rank']} {r['scenario_name']} (得分={r['total_score']}){overridden_mark}")

    print(f"[OPTIMIZE] 敏感性分析 - 排序稳定性: {result.sensitivity_analysis.get('ranking_stability', {})}")

    append_history(run_id, "optimization", {
        "rankings": result.scenario_rankings,
        "sensitivity": result.sensitivity_analysis,
        "constraint_versions": result.constraint_version_snapshot,
    })

    os.makedirs(REPORT_DIR, exist_ok=True)
    report_path = os.path.join(REPORT_DIR, f"report_{run_id[:8]}.json")
    export_report(issues, result, run_id, report_path)
    print(f"[REPORT] 报告已导出: {report_path}")

    append_history(run_id, "report", {"exported": True})

    finish_run(run_id)
    print(f"[RUN] 完成 run_id={run_id}")
    return run_id


def show_history():
    init_db()
    records = load_history()
    print(f"\n===== 历史记录 ({len(records)} 条) =====")
    for r in records:
        print(f"  [{r['record_type']}] run={r['run_id'][:8]} fp={r['fingerprint'][:12]}... @ {r['created_at']}")


if __name__ == "__main__":
    constraint_explanations = {
        "budget_cap": "各部门年度碳排放不得超过预算上限，预算超限为最高优先级约束",
        "conflict": "当部门预算超限时，目标冲突不掩盖预算超限问题",
        "exclusive": "当部门预算超限时，项目互斥不掩盖预算超限问题",
    }

    print("=" * 60)
    print("第一次运行")
    print("=" * 60)
    run_pipeline(constraint_explanations)

    print("\n" + "=" * 60)
    print("第二次运行（相同数据，验证不产生重复结论）")
    print("=" * 60)
    run_pipeline(constraint_explanations)

    print("\n" + "=" * 60)
    print("约束变化后重新优化")
    print("=" * 60)
    init_db()
    departments = import_departments_from_csv(os.path.join(SAMPLE_DIR, "departments.csv"))
    budgets = import_budgets_from_csv(os.path.join(SAMPLE_DIR, "budgets.csv"))
    scenarios = import_scenarios_from_json(os.path.join(SAMPLE_DIR, "scenarios.json"))
    issues = validate_all(departments, budgets, scenarios)

    new_explanations = {
        "budget_cap": "预算上限可适度放宽5%，超限部门需提交追加减排计划",
        "conflict": "冲突约束已重新解释：允许部分部门延迟达标以换取整体减排",
        "exclusive": "互斥项目可在不同阶段分期实施",
    }
    result = reoptimize_after_constraint_change(
        departments, budgets, scenarios, issues, new_explanations
    )
    print(f"[REOPTIMIZE] 约束变化后方案排序:")
    for r in result.scenario_rankings:
        print(f"  #{r['rank']} {r['scenario_name']} (得分={r['total_score']})")
    print(f"[REOPTIMIZE] 敏感性分析 - 排序稳定性: {result.sensitivity_analysis.get('ranking_stability', {})}")
    print(f"[REOPTIMIZE] 约束版本快照: {result.constraint_version_snapshot}")

    show_history()
