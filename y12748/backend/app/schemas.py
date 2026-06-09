from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ImportBatchBase(BaseModel):
    batch_name: str
    file_name: Optional[str] = None
    remark: Optional[str] = None


class ImportBatchCreate(ImportBatchBase):
    pass


class ImportBatch(ImportBatchBase):
    id: int
    imported_by: str
    imported_at: datetime
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    status: str

    class Config:
        from_attributes = True


class QuestionRecordBase(BaseModel):
    question_id: Optional[str] = None
    question_content: Optional[str] = None
    material_name: Optional[str] = None
    material_type: Optional[str] = None
    stress_level: Optional[float] = None
    temperature: Optional[float] = None
    lifetime_hours: Optional[float] = None
    unit: Optional[str] = None
    student_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    constraint_condition: Optional[str] = None
    remark: Optional[str] = None
    source: Optional[str] = None


class QuestionRecordCreate(QuestionRecordBase):
    batch_id: Optional[int] = None


class QuestionRecordUpdate(BaseModel):
    field_name: str
    new_value: Any
    comment: Optional[str] = None


class QuestionRecord(QuestionRecordBase):
    id: int
    batch_id: Optional[int] = None
    is_duplicate: bool = False
    duplicate_of_id: Optional[int] = None
    has_unit_issue: bool = False
    has_empty_value: bool = False
    has_mixed_remark: bool = False
    has_conflict: bool = False
    conflict_detail: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CorrectionHistoryBase(BaseModel):
    record_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    comment: Optional[str] = None


class CorrectionHistoryCreate(CorrectionHistoryBase):
    pass


class CorrectionHistory(CorrectionHistoryBase):
    id: int
    corrected_by: str
    corrected_at: datetime

    class Config:
        from_attributes = True


class ReviewSessionBase(BaseModel):
    batch_id: int
    session_name: str
    session_type: str = "daily"
    include_wrong_answers: bool = True
    include_historical_answers: bool = True
    include_conflicts: bool = True
    remark: Optional[str] = None


class ReviewSessionCreate(ReviewSessionBase):
    pass


class ReviewSession(ReviewSessionBase):
    id: int
    created_by: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str
    total_items: int = 0
    reviewed_items: int = 0
    passed_items: int = 0
    pending_items: int = 0

    class Config:
        from_attributes = True


class ReviewResultBase(BaseModel):
    session_id: int
    record_id: int
    before_status: str
    after_status: str
    review_comment: Optional[str] = None
    is_conflict_resolved: bool = False
    conflict_resolution: Optional[str] = None


class ReviewResultCreate(ReviewResultBase):
    pass


class ReviewResult(ReviewResultBase):
    id: int
    reviewer: str
    reviewed_at: datetime

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    session_id: int
    batch_id: int
    report_type: str = "student"


class ReportCreate(ReportBase):
    pass


class Report(ReportBase):
    id: int
    generated_by: str
    generated_at: datetime
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None
    curve_data: Optional[Dict[str, Any]] = None
    status: str

    class Config:
        from_attributes = True


class ReliabilityCurveBase(BaseModel):
    record_id: int
    batch_id: int
    session_id: Optional[int] = None
    material_name: str


class ReliabilityCurveCreate(ReliabilityCurveBase):
    pass


class ReliabilityCurve(ReliabilityCurveBase):
    id: int
    weibull_shape: Optional[float] = None
    weibull_scale: Optional[float] = None
    mean_lifetime: Optional[float] = None
    median_lifetime: Optional[float] = None
    b10_lifetime: Optional[float] = None
    curve_points: Optional[Dict[str, Any]] = None
    calculated_at: datetime
    status: str

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    batch_id: int
    total: int
    valid: int
    invalid: int
    issues: List[Dict[str, Any]] = []


class DataQualityIssue(BaseModel):
    record_id: Optional[int] = None
    question_id: Optional[str] = None
    issue_type: str
    description: str
    detail: Optional[str] = None


class StatusTransition(BaseModel):
    record_id: int
    from_status: str
    to_status: str
    comment: Optional[str] = None
