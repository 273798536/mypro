import json
from datetime import datetime
from typing import List
from .models import Issue, OptimizationResult


def export_report(
    issues: List[Issue],
    optimization: OptimizationResult,
    run_id: str,
    output_path: str,
) -> str:
    report = {
        "report_id": run_id,
        "generated_at": datetime.now().isoformat(),
        "problem_list": _serialize_issues(issues),
        "optimization": _serialize_optimization(optimization),
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    return output_path


def _serialize_issues(issues: List[Issue]) -> list:
    return [
        {
            "issue_id": i.issue_id,
            "severity": i.severity,
            "source": i.source,
            "description": i.description,
            "department_id": i.department_id,
            "scenario_id": i.scenario_id,
            "overridden_by": i.overridden_by,
            "priority_rank": i.priority_rank(),
        }
        for i in issues
    ]


def _serialize_optimization(opt: OptimizationResult) -> dict:
    return {
        "scenario_rankings": opt.scenario_rankings,
        "sensitivity_analysis": opt.sensitivity_analysis,
        "constraint_explanations": opt.constraint_explanations,
        "constraint_version_snapshot": opt.constraint_version_snapshot,
    }
