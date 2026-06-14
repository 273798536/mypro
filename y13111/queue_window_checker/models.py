from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class Unit(Enum):
    SECOND = "秒"
    MINUTE = "分钟"
    PERSON = "人"
    COUNT = "个"


class CheckStatus(Enum):
    PASS = "通过"
    FAIL = "不通过"
    PENDING = "待复核"
    SUSPENDED = "挂起"


class AnomalyType(Enum):
    NAME_MISMATCH = "名称不一致"
    EMPTY_SET = "空集合"
    BOUNDARY_BREACH = "越界"
    UNIT_MISMATCH = "单位不匹配"
    FORMULA_ERROR = "公式错误"
    SORT_UNSTABLE = "排序不稳定"
    BAD_DATA = "坏数据"


@dataclass
class Material:
    material_id: str
    name: str
    expected_name: str
    quantity: float
    unit: Unit
    source_line: Optional[int] = None
    raw_data: Optional[dict[str, Any]] = None

    @property
    def is_name_matched(self) -> bool:
        return self.name.strip() == self.expected_name.strip()


@dataclass
class WindowConfig:
    window_size: float
    window_unit: Unit
    lower_bound: float
    upper_bound: float
    value_unit: Unit
    formula: str = "avg_throughput = total_count / window_size"
    tolerance: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "window_size": self.window_size,
            "window_unit": self.window_unit.value,
            "lower_bound": self.lower_bound,
            "upper_bound": self.upper_bound,
            "value_unit": self.value_unit.value,
            "formula": self.formula,
            "tolerance": self.tolerance,
        }


@dataclass
class HistoricalAnswer:
    answer_id: str
    materials: list[Material]
    expected_window_count: int
    source_file: Optional[str] = None
    raw_rows: list[dict[str, Any]] = field(default_factory=list)

    def get_material_by_id(self, mid: str) -> Optional[Material]:
        for m in self.materials:
            if m.material_id == mid:
                return m
        return None

    def has_empty_materials(self) -> bool:
        return len(self.materials) == 0


@dataclass
class CheckStep:
    step_id: str
    step_name: str
    description: str
    config_snapshot: dict[str, Any]
    result_before: Any
    result_after: Any
    changed: bool
    detail: str = ""


@dataclass
class Anomaly:
    anomaly_type: AnomalyType
    message: str
    material: Optional[Material] = None
    source_line: Optional[int] = None
    raw_reference: Optional[str] = None


@dataclass
class BoundarySample:
    label: str
    value: float
    bound_type: str
    unit: Unit
    within_bound: bool


@dataclass
class CheckResult:
    status: CheckStatus
    anomalies: list[Anomaly] = field(default_factory=list)
    boundary_samples: list[BoundarySample] = field(default_factory=list)
    steps: list[CheckStep] = field(default_factory=list)
    computed_value: Optional[float] = None
    computed_unit: Optional[Unit] = None
    formula_applied: str = ""
    sort_stable: Optional[bool] = None
    historical_answer_id: Optional[str] = None

    def add_anomaly(self, anomaly: Anomaly) -> None:
        self.anomalies.append(anomaly)
        target = _anomaly_target_status(anomaly.anomaly_type)
        if target is None:
            return
        if _status_priority(target) >= _status_priority(self.status):
            self.status = target

    def add_step(self, step: CheckStep) -> None:
        self.steps.append(step)

    def summary(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "anomaly_count": len(self.anomalies),
            "anomaly_types": [a.anomaly_type.value for a in self.anomalies],
            "computed_value": self.computed_value,
            "computed_unit": self.computed_unit.value if self.computed_unit else None,
            "sort_stable": self.sort_stable,
            "step_count": len(self.steps),
        }


_STATUS_PRIORITY = {
    CheckStatus.PASS: 0,
    CheckStatus.PENDING: 10,
    CheckStatus.SUSPENDED: 20,
    CheckStatus.FAIL: 30,
}


def _status_priority(status: CheckStatus) -> int:
    return _STATUS_PRIORITY.get(status, 0)


_ANOMALY_STATUS_MAP: dict[AnomalyType, CheckStatus] = {
    AnomalyType.NAME_MISMATCH: CheckStatus.FAIL,
    AnomalyType.UNIT_MISMATCH: CheckStatus.FAIL,
    AnomalyType.FORMULA_ERROR: CheckStatus.FAIL,
    AnomalyType.BOUNDARY_BREACH: CheckStatus.FAIL,
    AnomalyType.BAD_DATA: CheckStatus.FAIL,
    AnomalyType.EMPTY_SET: CheckStatus.SUSPENDED,
    AnomalyType.SORT_UNSTABLE: CheckStatus.SUSPENDED,
}


def _anomaly_target_status(atype: AnomalyType) -> CheckStatus | None:
    return _ANOMALY_STATUS_MAP.get(atype)
