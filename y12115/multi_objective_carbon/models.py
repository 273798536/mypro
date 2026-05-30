"""数据模型定义"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class ProjectStatus(Enum):
    """项目状态"""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ObjectiveType(Enum):
    """优化目标类型"""
    MINIMIZE_EMISSION = "minimize_emission"
    MINIMIZE_COST = "minimize_cost"
    MAXIMIZE_REDUCTION = "maximize_reduction"
    BALANCE = "balance"


@dataclass
class DepartmentEmission:
    """部门排放数据"""
    department_id: str
    department_name: str
    emission: float
    period: str
    unit: str = "ton_CO2e"
    remark: Optional[str] = None
    source: Optional[str] = None
    last_updated: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "department_id": self.department_id,
            "department_name": self.department_name,
            "emission": self.emission,
            "period": self.period,
            "unit": self.unit,
            "remark": self.remark,
            "source": self.source,
            "last_updated": self.last_updated.isoformat()
        }


@dataclass
class BudgetLimit:
    """预算上限数据"""
    department_id: Optional[str]
    budget_amount: float
    period: str
    budget_type: str = "carbon"
    currency: str = "CNY"
    department_name: Optional[str] = None
    remark: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "department_id": self.department_id,
            "department_name": self.department_name,
            "budget_amount": self.budget_amount,
            "period": self.period,
            "budget_type": self.budget_type,
            "currency": self.currency,
            "remark": self.remark
        }


@dataclass
class ReductionProject:
    """减碳项目数据"""
    project_id: str
    project_name: str
    department_id: str
    cost: float
    reduction_potential: float
    duration_months: int
    status: ProjectStatus = ProjectStatus.PLANNED
    priority: int = 3
    dependencies: List[str] = field(default_factory=list)
    mutually_exclusive: List[str] = field(default_factory=list)
    remark: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "project_name": self.project_name,
            "department_id": self.department_id,
            "cost": self.cost,
            "reduction_potential": self.reduction_potential,
            "duration_months": self.duration_months,
            "status": self.status.value,
            "priority": self.priority,
            "dependencies": self.dependencies,
            "mutually_exclusive": self.mutually_exclusive,
            "remark": self.remark
        }


@dataclass
class BusinessIndicator:
    """业务指标数据"""
    department_id: str
    indicator_name: str
    indicator_value: float
    period: str
    unit: str = ""
    arrival_delay: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "department_id": self.department_id,
            "indicator_name": self.indicator_name,
            "indicator_value": self.indicator_value,
            "period": self.period,
            "unit": self.unit,
            "arrival_delay": self.arrival_delay
        }


@dataclass
class OptimizationConstraint:
    """优化约束条件"""
    max_budget_utilization: float = 1.0
    min_reduction_ratio: float = 0.1
    max_project_count: Optional[int] = None
    allow_over_budget: bool = False
    required_departments: List[str] = field(default_factory=list)
    excluded_departments: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "max_budget_utilization": self.max_budget_utilization,
            "min_reduction_ratio": self.min_reduction_ratio,
            "max_project_count": self.max_project_count,
            "allow_over_budget": self.allow_over_budget,
            "required_departments": self.required_departments,
            "excluded_departments": self.excluded_departments
        }


@dataclass
class OptimizationResult:
    """优化结果"""
    selected_projects: List[str]
    total_cost: float
    total_reduction: float
    net_emission: float
    budget_utilization: float
    objective_scores: Dict[ObjectiveType, float]
    rank: int = 0
    is_feasible: bool = True
    over_budget_amount: float = 0.0
    constraint_violations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "selected_projects": self.selected_projects,
            "total_cost": self.total_cost,
            "total_reduction": self.total_reduction,
            "net_emission": self.net_emission,
            "budget_utilization": self.budget_utilization,
            "objective_scores": {k.value: v for k, v in self.objective_scores.items()},
            "rank": self.rank,
            "is_feasible": self.is_feasible,
            "over_budget_amount": self.over_budget_amount,
            "constraint_violations": self.constraint_violations
        }


@dataclass
class Anomaly:
    """异常数据说明"""
    data_type: str
    record_id: str
    anomaly_type: str
    description: str
    severity: str = "warning"
    suggested_fix: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "data_type": self.data_type,
            "record_id": self.record_id,
            "anomaly_type": self.anomaly_type,
            "description": self.description,
            "severity": self.severity,
            "suggested_fix": self.suggested_fix
        }


@dataclass
class Conflict:
    """目标冲突或项目互斥"""
    conflict_type: str
    involved_items: List[str]
    description: str
    suggestions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "conflict_type": self.conflict_type,
            "involved_items": self.involved_items,
            "description": self.description,
            "suggestions": self.suggestions
        }
