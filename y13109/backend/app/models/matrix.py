from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class MatrixStatus(str, Enum):
    PENDING = "pending"
    NORMAL = "normal"
    EMPTY = "empty"
    SINGULAR = "singular"
    OUT_OF_BOUND = "out_of_bound"
    OVERRIDDEN = "overridden"
    ERROR = "error"


class ChangeSource(str, Enum):
    AUTO_CALC = "auto_calc"
    MANUAL_OVERRIDE = "manual_override"
    THRESHOLD_CHANGE = "threshold_change"
    UNIT_CHANGE = "unit_change"
    LATE_ATTACHMENT = "late_attachment"
    GRAY_RELEASE = "gray_release"


class JumpReason(str, Enum):
    THRESHOLD = "threshold"
    UNIT = "unit"
    LATE_ATTACHMENT = "late_attachment"
    UNKNOWN = "unknown"


class MatrixData(BaseModel):
    rows: int
    cols: int
    values: List[List[float]]


class StatusChange(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    from_status: MatrixStatus
    to_status: MatrixStatus
    source: ChangeSource
    operator: Optional[str] = None
    reason: Optional[str] = None
    detail: Optional[Dict[str, Any]] = None


class JumpAnalysis(BaseModel):
    has_jump: bool = False
    reason: JumpReason = JumpReason.UNKNOWN
    description: str = ""
    previous_condition: Optional[float] = None
    current_condition: float
    change_ratio: Optional[float] = None
    related_change_id: Optional[str] = None


class MatrixRecord(BaseModel):
    id: str
    name: str
    matrix: MatrixData
    condition_number: Optional[float] = None
    status: MatrixStatus = MatrixStatus.PENDING
    status_history: List[StatusChange] = Field(default_factory=list)
    jump_analysis: Optional[JumpAnalysis] = None
    is_out_of_bound: bool = False
    bound_exceeded: Optional[float] = None
    remark: Optional[str] = None
    source_file: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BatchSummary(BaseModel):
    total: int = 0
    normal: int = 0
    empty: int = 0
    singular: int = 0
    out_of_bound: int = 0
    overridden: int = 0
    error: int = 0


class BatchJob(BaseModel):
    id: str
    name: str
    records: List[MatrixRecord] = Field(default_factory=list)
    summary: BatchSummary = Field(default_factory=BatchSummary)
    threshold: Optional[float] = None
    unit: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    gray_release_note: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
