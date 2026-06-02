import hashlib
from typing import List, Dict, Tuple
from .models import DepartmentEmission, BudgetCap, ScenarioReport, Issue


def _did(severity: str, description: str) -> str:
    raw = f"{severity}:{description}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:8]


def validate_all(
    departments: List[DepartmentEmission],
    budgets: List[BudgetCap],
    scenarios: List[ScenarioReport],
) -> List[Issue]:
    issues = []
    issues.extend(_check_missing_fields(departments, budgets, scenarios))
    issues.extend(_check_late_supplements(departments, budgets))
    issues.extend(_check_note_modified(scenarios))
    issues.extend(_check_budget_overrun(budgets, scenarios))
    issues.extend(_check_conflicts(scenarios))
    issues.extend(_check_exclusive(scenarios))
    _apply_overrun_priority(issues)
    issues.sort(key=lambda i: (i.priority_rank(), i.issue_id))
    return issues


def _check_missing_fields(
    departments: List[DepartmentEmission],
    budgets: List[BudgetCap],
    scenarios: List[ScenarioReport],
) -> List[Issue]:
    issues = []
    for d in departments:
        if d.emission_baseline is None:
            desc = f"部门 {d.department_name}({d.department_id}) 缺少排放基线(emission_baseline)"
            issues.append(Issue(issue_id=_did("missing_field", desc), severity="missing_field", source="department", description=desc, department_id=d.department_id))
        if d.target_reduction is None:
            desc = f"部门 {d.department_name}({d.department_id}) 缺少减排目标(target_reduction)"
            issues.append(Issue(issue_id=_did("missing_field", desc), severity="missing_field", source="department", description=desc, department_id=d.department_id))
        if d.business_volume is None:
            desc = f"部门 {d.department_name}({d.department_id}) 缺少业务量(business_volume)"
            issues.append(Issue(issue_id=_did("missing_field", desc), severity="missing_field", source="department", description=desc, department_id=d.department_id))
    for b in budgets:
        if b.budget_cap is None:
            desc = f"部门 {b.department_id} {b.year}年 缺少预算上限(budget_cap)"
            issues.append(Issue(issue_id=_did("missing_field", desc), severity="missing_field", source="budget", description=desc, department_id=b.department_id))
    for s in scenarios:
        if not s.allocations:
            desc = f"方案 {s.scenario_name}({s.scenario_id}) 缺少分配明细(allocations)"
            issues.append(Issue(issue_id=_did("missing_field", desc), severity="missing_field", source="scenario", description=desc, scenario_id=s.scenario_id))
    return issues


def _check_late_supplements(
    departments: List[DepartmentEmission],
    budgets: List[BudgetCap],
) -> List[Issue]:
    issues = []
    for d in departments:
        if d.late_supplement:
            desc = f"部门 {d.department_name}({d.department_id}) 为晚补数据"
            issues.append(Issue(issue_id=_did("late_supplement", desc), severity="late_supplement", source="department", description=desc, department_id=d.department_id))
    for b in budgets:
        if b.adjusted:
            desc = f"部门 {b.department_id} {b.year}年 预算为晚补/调整数据"
            issues.append(Issue(issue_id=_did("late_supplement", desc), severity="late_supplement", source="budget", description=desc, department_id=b.department_id))
    return issues


def _check_note_modified(scenarios: List[ScenarioReport]) -> List[Issue]:
    issues = []
    for s in scenarios:
        if s.note_modified:
            desc = f"方案 {s.scenario_name}({s.scenario_id}) 备注已被修改"
            issues.append(Issue(issue_id=_did("note_modified", desc), severity="note_modified", source="scenario", description=desc, scenario_id=s.scenario_id))
    return issues


def _check_budget_overrun(
    budgets: List[BudgetCap],
    scenarios: List[ScenarioReport],
) -> List[Issue]:
    issues = []
    budget_map: Dict[Tuple[str, int], float] = {}
    for b in budgets:
        if b.budget_cap is not None:
            budget_map[(b.department_id, b.year)] = b.budget_cap
    for s in scenarios:
        for alloc in s.allocations:
            for key, cap in budget_map.items():
                dept_id, year = key
                if alloc.department_id == dept_id and alloc.projected_emission > cap:
                    desc = f"方案 {s.scenario_name}({s.scenario_id}) 中 部门 {dept_id} 预测排放 {alloc.projected_emission} 超过预算上限 {cap}"
                    issues.append(Issue(issue_id=_did("budget_overrun", desc), severity="budget_overrun", source="scenario", description=desc, department_id=dept_id, scenario_id=s.scenario_id))
    return issues


def _check_conflicts(scenarios: List[ScenarioReport]) -> List[Issue]:
    issues = []
    for s in scenarios:
        for c in s.constraints:
            if c.get("type") == "conflict":
                dept_ids = c.get("department_ids", [])
                if dept_ids:
                    for dept_id in dept_ids:
                        desc = f"方案 {s.scenario_name}({s.scenario_id}) 存在目标冲突(部门 {dept_id}): {c.get('description', '')}"
                        issues.append(Issue(issue_id=_did("conflict", desc), severity="conflict", source="scenario", description=desc, department_id=dept_id, scenario_id=s.scenario_id))
                else:
                    desc = f"方案 {s.scenario_name}({s.scenario_id}) 存在目标冲突: {c.get('description', '')}"
                    issues.append(Issue(issue_id=_did("conflict", desc), severity="conflict", source="scenario", description=desc, scenario_id=s.scenario_id))
    return issues


def _check_exclusive(scenarios: List[ScenarioReport]) -> List[Issue]:
    issues = []
    for s in scenarios:
        for c in s.constraints:
            if c.get("type") == "exclusive":
                dept_ids = c.get("department_ids", [])
                if dept_ids:
                    for dept_id in dept_ids:
                        desc = f"方案 {s.scenario_name}({s.scenario_id}) 存在项目互斥(部门 {dept_id}): {c.get('description', '')}"
                        issues.append(Issue(issue_id=_did("exclusive", desc), severity="exclusive", source="scenario", description=desc, department_id=dept_id, scenario_id=s.scenario_id))
                else:
                    desc = f"方案 {s.scenario_name}({s.scenario_id}) 存在项目互斥: {c.get('description', '')}"
                    issues.append(Issue(issue_id=_did("exclusive", desc), severity="exclusive", source="scenario", description=desc, scenario_id=s.scenario_id))
    return issues


def _apply_overrun_priority(issues: List[Issue]):
    overrun_depts = {
        i.department_id for i in issues if i.severity == "budget_overrun" and i.department_id
    }
    for i in issues:
        if i.severity in ("conflict", "exclusive") and i.department_id in overrun_depts:
            i.overridden_by = "budget_overrun"
