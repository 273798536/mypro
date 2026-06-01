import csv
import json
from typing import List
from .models import DepartmentEmission, BudgetCap, ScenarioReport, ScenarioAllocation


def import_departments_from_csv(path: str) -> List[DepartmentEmission]:
    records = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(DepartmentEmission(
                department_id=row.get("department_id", "").strip(),
                department_name=row.get("department_name", "").strip(),
                emission_baseline=_float_or_none(row.get("emission_baseline")),
                target_reduction=_float_or_none(row.get("target_reduction")),
                business_volume=_float_or_none(row.get("business_volume")),
                note=row.get("note", "").strip() or None,
                late_supplement=_bool_field(row.get("late_supplement")),
            ))
    return records


def import_budgets_from_csv(path: str) -> List[BudgetCap]:
    records = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(BudgetCap(
                department_id=row.get("department_id", "").strip(),
                year=int(row.get("year", "0")),
                budget_cap=_float_or_none(row.get("budget_cap")),
                adjusted=_bool_field(row.get("adjusted")),
                note=row.get("note", "").strip() or None,
            ))
    return records


def import_scenarios_from_json(path: str) -> List[ScenarioReport]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    records = []
    for item in data:
        allocations = [
            ScenarioAllocation(
                department_id=a["department_id"],
                allocated_budget=a["allocated_budget"],
                projected_emission=a["projected_emission"],
            )
            for a in item.get("allocations", [])
        ]
        records.append(ScenarioReport(
            scenario_id=item.get("scenario_id", ""),
            scenario_name=item.get("scenario_name", ""),
            allocations=allocations,
            objective_scores=item.get("objective_scores", {}),
            constraints=item.get("constraints", []),
            note_modified=item.get("note_modified", False),
            note=item.get("note"),
        ))
    return records


def _float_or_none(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _bool_field(val):
    if val is None:
        return False
    return str(val).strip().lower() in ("true", "1", "yes")
