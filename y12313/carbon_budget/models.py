from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DepartmentEmission:
    department_id: str
    department_name: str
    emission_baseline: Optional[float] = None
    target_reduction: Optional[float] = None
    business_volume: Optional[float] = None
    note: Optional[str] = None
    late_supplement: bool = False


@dataclass
class BudgetCap:
    department_id: str
    year: int
    budget_cap: Optional[float] = None
    adjusted: bool = False
    note: Optional[str] = None


@dataclass
class ScenarioAllocation:
    department_id: str
    allocated_budget: float
    projected_emission: float


@dataclass
class ScenarioReport:
    scenario_id: str
    scenario_name: str
    allocations: list = field(default_factory=list)
    objective_scores: dict = field(default_factory=dict)
    constraints: list = field(default_factory=list)
    note_modified: bool = False
    note: Optional[str] = None


@dataclass
class Issue:
    issue_id: str
    severity: str
    source: str
    description: str
    department_id: Optional[str] = None
    scenario_id: Optional[str] = None
    overridden_by: Optional[str] = None

    def priority_rank(self):
        order = {
            "budget_overrun": 0,
            "missing_field": 1,
            "late_supplement": 2,
            "note_modified": 3,
            "conflict": 4,
            "exclusive": 5,
        }
        return order.get(self.severity, 99)


@dataclass
class OptimizationResult:
    scenario_rankings: list = field(default_factory=list)
    sensitivity_analysis: dict = field(default_factory=dict)
    constraint_explanations: dict = field(default_factory=dict)
    constraint_version_snapshot: dict = field(default_factory=dict)
