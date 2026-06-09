from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .enums import ReviewStatus, ReviewerRole


class AuditLogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    reviewer: str
    role: ReviewerRole
    from_status: Optional[ReviewStatus] = None
    to_status: ReviewStatus
    note: str = ""
    field_changes: dict[str, tuple[object, object]] = Field(default_factory=dict)


class DataPoint(BaseModel):
    x: float
    y: float
    index: int
    source_sheet: Optional[str] = None
    source_cell: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None


class FitConstraint(BaseModel):
    param_name: str
    lower: Optional[float] = None
    upper: Optional[float] = None
    description: str = ""


class FitBounds(BaseModel):
    x_min: Optional[float] = None
    x_max: Optional[float] = None
    y_min: Optional[float] = None
    y_max: Optional[float] = None


class FitResult(BaseModel):
    model_config = {"protected_namespaces": ()}
    params: list[float]
    param_names: list[str]
    param_errors: list[float]
    r_squared: float
    residuals: list[float]
    x_data: list[float]
    y_data: list[float]
    y_predicted: list[float]
    model_formula: str
