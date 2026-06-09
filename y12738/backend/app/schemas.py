from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RecordStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    REJECTED = "rejected"
    NEED_REVIEW = "need_review"


class ErrorLevel(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


class IssueType(str, Enum):
    EMPTY_VALUE = "empty_value"
    DUPLICATE = "duplicate"
    REMARK_MIXED = "remark_mixed"
    LARGE_ERROR = "large_error"


class SourceModule(str, Enum):
    ERROR_ANALYSIS = "error_analysis"
    CONSTRAINT_CHECK = "constraint_check"


class QuestionRecordBase(BaseModel):
    question_id: Optional[str] = ""
    question_no: Optional[str] = ""
    question_title: Optional[str] = ""
    matrix_data: Optional[str] = ""
    eigenvalue_exact: Optional[str] = ""
    eigenvalue_approx: Optional[str] = ""
    error_value: Optional[float] = 0.0
    error_level: Optional[str] = "normal"
    remark: Optional[str] = ""
    status: Optional[str] = "pending"


class QuestionRecordOut(QuestionRecordBase):
    id: int
    batch_id: int
    content_hash: str
    constraint_pass: bool
    reviewed_by: str
    reviewed_at: Optional[datetime] = None
    has_empty: bool
    has_duplicate: bool
    remark_mixed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionRecordUpdate(BaseModel):
    question_title: Optional[str] = None
    eigenvalue_exact: Optional[str] = None
    eigenvalue_approx: Optional[str] = None
    error_value: Optional[float] = None
    error_level: Optional[str] = None
    remark: Optional[str] = None
    status: Optional[str] = None
    constraint_pass: Optional[bool] = None
    operator: Optional[str] = "排课老师"
    comment: Optional[str] = ""


class AuditLogOut(BaseModel):
    id: int
    record_id: int
    field_name: str
    old_value: str
    new_value: str
    operator: str
    operation: str
    created_at: datetime
    comment: str

    class Config:
        from_attributes = True


class ImportBatchOut(BaseModel):
    id: int
    batch_no: str
    filename: str
    source: str
    total_count: int
    duplicate_count: int
    new_count: int
    updated_count: int
    quality_issues: int
    imported_by: str
    created_at: datetime
    remark: str

    class Config:
        from_attributes = True


class QualityIssueOut(BaseModel):
    id: int
    batch_id: int
    record_id: Optional[int]
    issue_type: str
    description: str
    field_name: str
    severity: str
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    batch_no: str
    total_count: int
    duplicate_count: int
    new_count: int
    updated_count: int
    quality_issues: List[QualityIssueOut]
    warnings: List[str] = []


class ChartDataPoint(BaseModel):
    label: str
    value: float
    error: Optional[float] = 0.0
    exact: Optional[str] = ""


class ChartDataResponse(BaseModel):
    batch_no: str
    scatter_points: List[ChartDataPoint]
    error_distribution: dict
    status_distribution: dict
    quality_summary: dict


class PagedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[QuestionRecordOut]
