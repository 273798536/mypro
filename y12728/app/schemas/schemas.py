from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class ImportBatchBase(BaseModel):
    file_name: str
    remark: Optional[str] = None


class ImportBatchCreate(ImportBatchBase):
    pass


class ImportBatch(ImportBatchBase):
    id: int
    batch_no: str
    file_hash: Optional[str] = None
    uploaded_by: str
    total_rows: int = 0
    valid_rows: int = 0
    duplicate_rows: int = 0
    issue_rows: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ImportBatchDetail(ImportBatch):
    record_count: int = 0
    issue_count: int = 0


class ScoreRecordBase(BaseModel):
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    subject: Optional[str] = None
    unit_name: Optional[str] = None
    score_origin: Optional[float] = None
    score_extrapolated: Optional[float] = None
    alarm_level: Optional[str] = None
    alarm_flag: bool = False
    remark_raw: Optional[str] = None


class ScoreRecordCreate(ScoreRecordBase):
    batch_id: int
    row_no: Optional[int] = None


class ScoreRecord(ScoreRecordBase):
    id: int
    batch_id: int
    row_no: Optional[int] = None
    unit_missing: bool = False
    remark_clean: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of_id: Optional[int] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    score_original_value: Optional[float] = None
    score_corrected_value: Optional[float] = None
    alarm_original_level: Optional[str] = None
    alarm_corrected_level: Optional[str] = None
    corrected_by: Optional[str] = None
    corrected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScoreRecordDetail(ScoreRecord):
    batch: Optional[ImportBatch] = None
    issues: List[Any] = []
    review_logs: List[Any] = []


class ScoreRecordUpdate(BaseModel):
    score_corrected_value: Optional[float] = None
    alarm_corrected_level: Optional[str] = None
    review_note: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str
    review_note: Optional[str] = None
    operator: str = "teacher"


class DataIssueBase(BaseModel):
    issue_type: str
    issue_detail: Optional[str] = None
    column_name: Optional[str] = None
    row_no: Optional[int] = None


class DataIssue(DataIssueBase):
    id: int
    batch_id: int
    record_id: Optional[int] = None
    resolved: bool = False
    resolved_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewLogBase(BaseModel):
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    operator: str = "teacher"
    note: Optional[str] = None


class ReviewLog(ReviewLogBase):
    id: int
    record_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    batch_id: int
    batch_no: str
    total_rows: int
    valid_rows: int
    duplicate_rows: int
    issue_rows: int
    issues: List[DataIssue] = []


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


class TraceRecord(BaseModel):
    record: ScoreRecord
    source_batch: ImportBatch
    issues: List[DataIssue] = []
    review_logs: List[ReviewLog] = []
    related_duplicates: List[ScoreRecord] = []


class HistoryCompareItem(BaseModel):
    batch_no: str
    file_name: str
    created_at: datetime
    total_records: int
    pass_count: int
    pending_count: int
    issue_count: int
