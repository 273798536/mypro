from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ConicRecordBase(BaseModel):
    record_no: str
    student_name: str
    question_id: Optional[str] = None
    curve_type: Optional[str] = None
    a: Optional[float] = None
    b: Optional[float] = None
    c: Optional[float] = None
    focus_x: Optional[float] = None
    focus_y: Optional[float] = None
    directrix: Optional[str] = None
    eccentricity: Optional[float] = None
    unit: Optional[str] = None
    raw_formula: Optional[str] = None


class ConicRecordCreate(ConicRecordBase):
    pass


class ConicRecordOut(ConicRecordBase):
    id: int
    status: str
    chart_updated_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecordVersionOut(BaseModel):
    id: int
    record_id: int
    version_no: int
    a: Optional[float] = None
    b: Optional[float] = None
    c: Optional[float] = None
    curve_type: Optional[str] = None
    eccentricity: Optional[float] = None
    formula: Optional[str] = None
    computed_results: Optional[Dict[str, Any]] = None
    chart_supplied: bool
    created_by: Optional[str] = None
    created_at: datetime
    remark: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewIssueOut(BaseModel):
    id: int
    record_id: int
    issue_type: str
    severity: str
    description: str
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewIssueResolve(BaseModel):
    resolved: bool


class StudentAnswerIn(BaseModel):
    answer_type: str
    answer_content: str
    is_correct: Optional[bool] = None
    source: Optional[str] = None


class StudentAnswerOut(StudentAnswerIn):
    id: int
    record_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    target_status: str
    remark: Optional[str] = None
    operator: Optional[str] = None


class ChartSupplement(BaseModel):
    chart_supplied: bool = True
    updated_by: Optional[str] = None


class LateParamIn(BaseModel):
    param_name: str
    new_value: str


class LateParamOut(BaseModel):
    id: int
    record_id: int
    param_name: str
    old_value: Optional[str] = None
    new_value: str
    impacted_conclusions: List[str]
    merged: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RecordDetailOut(BaseModel):
    record: ConicRecordOut
    versions: List[RecordVersionOut]
    issues: List[ReviewIssueOut]
    answers: List[StudentAnswerOut]
    late_params: List[LateParamOut]


class ImportResponse(BaseModel):
    success: int
    failed: int
    message: str
    records: List[ConicRecordOut] = []
