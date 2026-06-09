from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .enums import OutlierType, ResultClassification, ReviewStatus
from .base import AuditLogEntry, DataPoint, FitBounds, FitConstraint, FitResult


class OutlierRecord(BaseModel):
    outlier_type: OutlierType
    point_index: Optional[int] = None
    point: Optional[DataPoint] = None
    short_explanation: str
    detailed_explanation: str
    severity: float = Field(ge=0.0, le=1.0, default=0.5)
    suggestion: str = ""


class ConstraintViolation(BaseModel):
    constraint: FitConstraint
    actual_value: float
    short_explanation: str
    detailed_explanation: str


class ExplanationBundle(BaseModel):
    summary: str
    usable_points: list[int] = Field(default_factory=list)
    deferred_points: list[int] = Field(default_factory=list)
    recollect_points: list[int] = Field(default_factory=list)
    committee_summary: str
    editor_note: str = ""


class ReviewRecord(BaseModel):
    record_id: str
    title: str
    source_file: str
    source_sheets: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    status: ReviewStatus = ReviewStatus.PENDING
    classification: ResultClassification = ResultClassification.DEFERRED
    data_points: list[DataPoint] = Field(default_factory=list)
    fit_result: Optional[FitResult] = None
    fit_constraints: list[FitConstraint] = Field(default_factory=list)
    fit_bounds: Optional[FitBounds] = None
    outliers: list[OutlierRecord] = Field(default_factory=list)
    constraint_violations: list[ConstraintViolation] = Field(default_factory=list)
    explanation: Optional[ExplanationBundle] = None
    audit_log: list[AuditLogEntry] = Field(default_factory=list)
    editor_corrections: dict[str, object] = Field(default_factory=dict)
    rejection_reason: Optional[str] = None
