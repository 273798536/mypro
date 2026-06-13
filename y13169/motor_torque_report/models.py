from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


class Direction(enum.Enum):
    CW = "CW"
    CCW = "CCW"

    @classmethod
    def from_str(cls, s: str) -> "Direction":
        mapping = {
            "CW": cls.CW, "cw": cls.CW, "顺时针": cls.CW, "正转": cls.CW,
            "CCW": cls.CCW, "ccw": cls.CCW, "逆时针": cls.CCW, "反转": cls.CCW,
        }
        if s not in mapping:
            raise ValueError(f"无法识别的方向符号: {s!r}")
        return mapping[s]

    def opposite(self) -> "Direction":
        return Direction.CCW if self is Direction.CW else Direction.CW


class AnomalyType(enum.Enum):
    DIRECTION_REVERSED = "方向符号写反"
    UNIT_MAGNITUDE_SHIFT = "单位数量级偏移"
    LATE_ATTACHMENT = "晚到附件"
    MISSING_ATTACHMENT = "缺失附件"


class JudgmentAction(enum.Enum):
    CONFIRM_ANOMALY = "确认异常"
    OVERRIDE_RELEASE = "覆盖放行"
    REQUEST_SUPPLEMENT = "要求补料"
    ADJUST_PARAMETER = "参数调档"
    CORRECT_DIRECTION = "修正方向"


BASE_UNIT = "N·m"

UNIT_TO_BASE: dict[str, float] = {
    "N·m": 1.0,
    "Nm": 1.0,
    "N.m": 1.0,
    "mN·m": 0.001,
    "mNm": 0.001,
    "kN·m": 1000.0,
    "kNm": 1000.0,
    "kgf·cm": 0.0980665,
    "gf·cm": 0.0000980665,
    "ozf·in": 0.00706155,
    "lbf·ft": 1.35582,
    "lbf·in": 0.112987,
}

MAGNITUDE_ORDER = ["gf·cm", "mN·m", "ozf·in", "N·m", "kgf·cm", "lbf·ft", "kN·m"]


@dataclass
class ExperimentalRecord:
    record_id: str
    motor_id: str
    test_date: str
    direction: Direction
    torque_raw: float
    torque_unit: str
    rpm: Optional[float] = None
    temperature: Optional[float] = None
    attachment_file: Optional[str] = None
    is_late_attachment: bool = False
    operator: Optional[str] = None
    notes: Optional[str] = None

    def torque_in_base_unit(self) -> float:
        factor = UNIT_TO_BASE.get(self.torque_unit)
        if factor is None:
            raise ValueError(f"不支持的扭矩单位: {self.torque_unit!r}")
        return self.torque_raw * factor


@dataclass
class Anomaly:
    anomaly_type: AnomalyType
    record_id: str
    description: str
    impact_scope: list[str] = field(default_factory=list)
    severity: str = "medium"
    suggested_action: str = ""
    confirmed: bool = False
    resolution: Optional[str] = None


@dataclass
class JudgmentEntry:
    timestamp: str
    operator: str
    action: JudgmentAction
    target_record_id: str
    anomaly_type: Optional[AnomalyType] = None
    reason: str = ""
    previous_value: Any = None
    new_value: Any = None
    parameter_name: Optional[str] = None
    formula_used: Optional[str] = None


@dataclass
class RecalcImpact:
    parameter_name: str
    old_value: Any
    new_value: Any
    formula: str
    boundary_records_affected: list[str] = field(default_factory=list)
    result_before: float = 0.0
    result_after: float = 0.0
    delta_percent: float = 0.0
    explanation: str = ""


@dataclass
class FilterCriteria:
    motor_ids: Optional[list[str]] = None
    directions: Optional[list[Direction]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    torque_min: Optional[float] = None
    torque_max: Optional[float] = None
    include_late_attachments: bool = True
    exclude_anomalies: bool = False


@dataclass
class StatisticResult:
    direction: Direction
    count: int
    mean: float
    std: float
    min_val: float
    max_val: float
    unit: str = BASE_UNIT
    boundary_low_ids: list[str] = field(default_factory=list)
    boundary_high_ids: list[str] = field(default_factory=list)


@dataclass
class ReportConfig:
    title: str = "电机扭矩报告"
    operator: str = ""
    output_unit: str = BASE_UNIT
    include_anomaly_details: bool = True
    include_recalc_impact: bool = True
    include_audit_trail: bool = True
    include_actionable_summary: bool = True


@dataclass
class ReportBundle:
    config: ReportConfig
    filter_criteria: FilterCriteria
    statistics: list[StatisticResult] = field(default_factory=list)
    detail_rows: list[dict] = field(default_factory=list)
    anomalies: list[Anomaly] = field(default_factory=list)
    recalc_impacts: list[RecalcImpact] = field(default_factory=list)
    audit_trail: list[JudgmentEntry] = field(default_factory=list)
    supplement_needed: list[str] = field(default_factory=list)
    release_allowed: list[str] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
