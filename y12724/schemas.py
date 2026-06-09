from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class RecordBase(BaseModel):
    candidate_name: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None
    is_boundary: Optional[bool] = False


class RecordImport(RecordBase):
    row_no: Optional[int] = None


class RecordOut(RecordBase):
    id: int
    batch_id: int
    row_no: Optional[int] = None
    is_valid: bool
    block_reason: str
    status: str
    reviewed_by: str
    reviewed_at: Optional[datetime] = None
    boundary_arrived_late: bool
    previous_conclusion: str
    affected_conclusions: List[str] = []

    class Config:
        from_attributes = True


class RecordDetail(RecordOut):
    status_history: List["StatusHistoryOut"] = []
    calculation_drafts: List["CalculationDraftOut"] = []


class StatusHistoryOut(BaseModel):
    id: int
    record_id: int
    from_status: str
    to_status: str
    changed_by: str
    changed_at: datetime
    note: str

    class Config:
        from_attributes = True


class CalculationDraftBase(BaseModel):
    formula_name: str
    formula_expr: str
    draft_value: Optional[str] = None
    is_supplement: bool = False
    diff_note: str = ""


class CalculationDraftCreate(CalculationDraftBase):
    record_id: int


class CalculationDraftOut(CalculationDraftBase):
    id: int
    record_id: int
    computed_value: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    version: int
    prev_version_id: int

    class Config:
        from_attributes = True


class CalculationDraftUpdate(BaseModel):
    draft_value: Optional[str] = None
    computed_value: Optional[float] = None
    diff_note: str = ""


class BatchBase(BaseModel):
    name: str
    note: Optional[str] = ""


class BatchOut(BatchBase):
    id: int
    uploaded_at: datetime
    status: str
    total_records: int
    valid_records: int
    invalid_records: int
    records: List[RecordOut] = []

    class Config:
        from_attributes = True


class BatchListOut(BaseModel):
    id: int
    name: str
    uploaded_at: datetime
    status: str
    total_records: int
    valid_records: int
    invalid_records: int

    class Config:
        from_attributes = True


class BatchStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = ""


class RecordStatusUpdate(BaseModel):
    status: str
    reviewed_by: Optional[str] = "user"
    note: Optional[str] = ""


class ValidationIssue(BaseModel):
    row_no: Optional[int] = None
    candidate_name: Optional[str] = None
    issue_type: str
    issue_detail: str


class ImportResult(BaseModel):
    batch_id: int
    batch_name: str
    total_count: int
    valid_count: int
    invalid_count: int
    issues: List[ValidationIssue] = []


RecordDetail.model_rebuild()
