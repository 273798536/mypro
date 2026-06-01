import copy
from typing import List, Dict, Any
from .models import (
    DepartmentEmission, BudgetCap, ScenarioReport, Issue, OptimizationResult
)
from .history import save_constraint_version, load_constraint_versions


def optimize(
    departments: List[DepartmentEmission],
    budgets: List[BudgetCap],
    scenarios: List[ScenarioReport],
    issues: List[Issue],
    constraint_explanations: Dict[str, str] = None,
) -> OptimizationResult:
    constraint_explanations = constraint_explanations or {}
    _record_constraint_versions(constraint_explanations)

    overrun_dept_ids = {
        i.department_id for i in issues if i.severity == "budget_overrun" and i.department_id
    }
    ranked = _rank_scenarios(scenarios, overrun_dept_ids)
    sensitivity = _sensitivity_analysis(scenarios, overrun_dept_ids)
    version_snapshot = _latest_constraint_versions()

    return OptimizationResult(
        scenario_rankings=ranked,
        sensitivity_analysis=sensitivity,
        constraint_explanations=constraint_explanations,
        constraint_version_snapshot=version_snapshot,
    )


def reoptimize_after_constraint_change(
    departments: List[DepartmentEmission],
    budgets: List[BudgetCap],
    scenarios: List[ScenarioReport],
    issues: List[Issue],
    new_constraint_explanations: Dict[str, str],
) -> OptimizationResult:
    return optimize(departments, budgets, scenarios, issues, new_constraint_explanations)


def _record_constraint_versions(explanations: Dict[str, str]):
    for key, explanation in explanations.items():
        save_constraint_version(key, explanation)


def _latest_constraint_versions() -> Dict[str, int]:
    versions = load_constraint_versions()
    latest = {}
    for v in versions:
        latest[v["constraint_key"]] = v["version"]
    return latest


def _rank_scenarios(
    scenarios: List[ScenarioReport],
    overrun_dept_ids: set,
) -> List[Dict[str, Any]]:
    scored = []
    for s in scenarios:
        penalty = 0.0
        has_overrun = False
        for alloc in s.allocations:
            if alloc.department_id in overrun_dept_ids:
                has_overrun = True
                penalty += 1000

        conflict_count = sum(1 for c in s.constraints if c.get("type") == "conflict")
        exclusive_count = sum(1 for c in s.constraints if c.get("type") == "exclusive")

        obj = s.objective_scores
        cost_score = obj.get("cost", 0) or 0
        emission_score = obj.get("emission_reduction", 0) or 0
        fairness_score = obj.get("fairness", 0) or 0

        total = emission_score + fairness_score - cost_score - penalty - conflict_count * 50 - exclusive_count * 50

        scored.append({
            "scenario_id": s.scenario_id,
            "scenario_name": s.scenario_name,
            "total_score": round(total, 4),
            "has_budget_overrun": has_overrun,
            "cost_score": cost_score,
            "emission_score": emission_score,
            "fairness_score": fairness_score,
            "conflict_count": conflict_count,
            "exclusive_count": exclusive_count,
            "overrun_penalty": penalty,
            "overridden_by_overrun": has_overrun and (conflict_count > 0 or exclusive_count > 0),
        })

    scored.sort(key=lambda x: x["total_score"], reverse=True)
    for rank, item in enumerate(scored, 1):
        item["rank"] = rank
    return scored


def _sensitivity_analysis(
    scenarios: List[ScenarioReport],
    overrun_dept_ids: set,
) -> Dict[str, Any]:
    weights_variants = [
        {"cost": 1.0, "emission_reduction": 1.0, "fairness": 1.0},
        {"cost": 0.5, "emission_reduction": 2.0, "fairness": 1.0},
        {"cost": 0.5, "emission_reduction": 1.0, "fairness": 2.0},
        {"cost": 2.0, "emission_reduction": 1.0, "fairness": 1.0},
    ]
    variant_names = [
        "equal_weights",
        "emission_heavy",
        "fairness_heavy",
        "cost_heavy",
    ]

    result = {}
    for vname, weights in zip(variant_names, weights_variants):
        variant_ranking = []
        for s in scenarios:
            penalty = 0.0
            for alloc in s.allocations:
                if alloc.department_id in overrun_dept_ids:
                    penalty += 1000

            obj = s.objective_scores
            cost_score = (obj.get("cost", 0) or 0) * weights["cost"]
            emission_score = (obj.get("emission_reduction", 0) or 0) * weights["emission_reduction"]
            fairness_score = (obj.get("fairness", 0) or 0) * weights["fairness"]
            total = emission_score + fairness_score - cost_score - penalty

            variant_ranking.append({
                "scenario_id": s.scenario_id,
                "scenario_name": s.scenario_name,
                "weighted_score": round(total, 4),
            })
        variant_ranking.sort(key=lambda x: x["weighted_score"], reverse=True)
        result[vname] = variant_ranking

    ranking_changes = _detect_ranking_changes(result, variant_names)
    result["ranking_stability"] = ranking_changes
    return result


def _detect_ranking_changes(
    variant_results: Dict[str, List[Dict]], variant_names: List[str]
) -> Dict[str, Any]:
    base_order = [r["scenario_id"] for r in variant_results[variant_names[0]]]
    unstable = []
    for vname in variant_names[1:]:
        v_order = [r["scenario_id"] for r in variant_results[vname]]
        if v_order != base_order:
            unstable.append(vname)

    return {
        "base_variant": variant_names[0],
        "is_stable": len(unstable) == 0,
        "variants_cause_reorder": unstable,
    }
