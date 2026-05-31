from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CaseStatus(str, Enum):
    NORMAL = "normal"
    MISSING_FIELDS = "missing_fields"
    LATE_SUPPLEMENT = "late_supplement"
    NOTE_MODIFIED = "note_modified"


class WarningType(str, Enum):
    COST_OVERRUN = "cost_overrun"
    GROUP_MISCLASSIFICATION = "group_misclassification"
    MISSING_COST_ITEM = "missing_cost_item"


class WarningStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    DISPUTED = "disputed"


class NoteChange(BaseModel):
    old_value: str
    new_value: str
    changed_at: datetime
    changed_by: str


class DischargeCase(BaseModel):
    case_id: str
    patient_name: str
    dept_code: str = Field(description="科室编码，串码会影响科室汇总和预警追踪")
    dept_name: str
    admission_date: date
    discharge_date: date
    total_cost: float
    drg_group_code: str
    drg_group_name: str
    standard_cost: Optional[float] = None
    actual_reimbursement: Optional[float] = None
    status: CaseStatus = CaseStatus.NORMAL
    missing_fields: list[str] = Field(default_factory=list)
    supplement_date: Optional[date] = None
    note: str = ""
    note_history: list[NoteChange] = Field(default_factory=list)
    original_drg_group_code: Optional[str] = Field(
        default=None,
        description="初始DRG分组编码，病组错分重算后会与drg_group_code不同",
    )
    cost_items: dict[str, Optional[float]] = Field(
        default_factory=dict,
        description="成本项明细，值为None表示缺项",
    )
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class DRGGroup(BaseModel):
    group_code: str
    group_name: str
    mdc: str = Field(description="主要诊断大类")
    adrg: str = Field(description="核心诊断组")
    standard_cost: float
    weight: float
    is_surgical: bool = False


class WarningReport(BaseModel):
    report_id: str
    case_id: str
    warning_type: WarningType
    diff_amount: float = Field(description="差额 = 标准费用 - 实际报销")
    dept_code: str
    dept_name: str
    drg_group_code: str
    drg_group_name: str
    is_group_changed: bool = Field(
        default=False,
        description="病组是否经历过错分重算",
    )
    original_group_code: Optional[str] = Field(
        default=None,
        description="错分前的原始分组",
    )
    note: str = ""
    note_history: list[NoteChange] = Field(default_factory=list)
    status: WarningStatus = WarningStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class DeptSummary(BaseModel):
    dept_code: str
    dept_name: str
    total_cases: int
    total_diff_amount: float
    active_warnings: int
    resolved_warnings: int
    group_change_count: int = Field(
        default=0,
        description="经历过病组错分重算的病例数",
    )
    missing_cost_item_count: int = Field(
        default=0,
        description="存在成本缺项的病例数",
    )


class ReclassifyRequest(BaseModel):
    case_id: str
    new_group_code: str
    reason: str = ""


class NoteUpdateRequest(BaseModel):
    note: str
    changed_by: str = "system"


class CaseCreateRequest(BaseModel):
    patient_name: str
    dept_code: str
    dept_name: str
    admission_date: date
    discharge_date: date
    total_cost: float
    drg_group_code: str
    cost_items: dict[str, Optional[float]] = Field(default_factory=dict)
    actual_reimbursement: Optional[float] = None
