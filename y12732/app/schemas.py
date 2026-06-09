from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class BatchBase(BaseModel):
    source_file: str
    imported_by: Optional[str] = "system"
    remark: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchOut(BatchBase):
    id: int
    batch_no: str
    imported_at: datetime
    status: str
    total_records: int
    anomaly_count: int

    class Config:
        from_attributes = True


class DerivativeRecordBase(BaseModel):
    indicator_name: str
    indicator_code: Optional[str] = None
    period: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    first_derivative: Optional[float] = None
    first_derivative_sign: Optional[str] = None
    second_derivative: Optional[float] = None
    second_derivative_sign: Optional[str] = None
    sign_change_type: Optional[str] = None


class DerivativeRecordCreate(DerivativeRecordBase):
    row_no: int
    raw_data: Optional[Dict[str, Any]] = None


class DerivativeRecordOut(DerivativeRecordBase):
    id: int
    batch_id: int
    row_no: int
    is_anomaly: bool
    anomaly_type: Optional[str] = None
    anomaly_detail: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DerivativeRecordDetail(DerivativeRecordOut):
    raw_data: Optional[Dict[str, Any]] = None
    review_logs: List["ReviewLogOut"] = []


class ReviewLogBase(BaseModel):
    reviewer: str = "anonymous"
    action: str
    comment: Optional[str] = None


class ReviewLogCreate(ReviewLogBase):
    record_id: int
    before_status: Optional[str] = None
    after_status: Optional[str] = None
    field_changes: Optional[Dict[str, Any]] = None


class ReviewLogOut(ReviewLogBase):
    id: int
    record_id: int
    before_status: Optional[str] = None
    after_status: Optional[str] = None
    field_changes: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


DerivativeRecordDetail.model_rebuild()


class StatusTransitionBase(BaseModel):
    operator: str = "system"
    comment: Optional[str] = None


class StatusTransitionCreate(StatusTransitionBase):
    batch_id: int
    from_status: Optional[str] = None
    to_status: str


class StatusTransitionOut(StatusTransitionBase):
    id: int
    batch_id: int
    from_status: Optional[str] = None
    to_status: str
    transitioned_at: datetime

    class Config:
        from_attributes = True


class BatchStatusUpdate(BaseModel):
    new_status: str
    operator: str = "system"
    comment: Optional[str] = None


class RecordReview(BaseModel):
    action: str
    reviewer: str = "anonymous"
    comment: Optional[str] = None
    unit: Optional[str] = None
    value: Optional[float] = None


class RecordFix(BaseModel):
    unit: Optional[str] = None
    value: Optional[float] = None
    indicator_code: Optional[str] = None
    reviewer: str = "anonymous"
    comment: Optional[str] = None


class ReportSnapshotBase(BaseModel):
    snapshot_type: str
    title: str
    plain_explanation: Optional[str] = None
    chart_data: Optional[Dict[str, Any]] = None
    summary_data: Optional[Dict[str, Any]] = None
    created_by: str = "system"


class ReportSnapshotCreate(ReportSnapshotBase):
    batch_id: int


class ReportSnapshotOut(ReportSnapshotBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    batch_no: str
    batch_id: int
    total_records: int
    anomaly_count: int
    anomalies: List[Dict[str, Any]] = []


class TraceResult(BaseModel):
    record: DerivativeRecordDetail
    batch: BatchOut
    status_transitions: List[StatusTransitionOut] = []
    question_list: List[Dict[str, Any]] = []
    handling_opinions: List[Dict[str, Any]] = []


class HistoryCompareItem(BaseModel):
    batch_no: str
    imported_at: datetime
    total_records: int
    anomaly_count: int
    status: str
    sign_change_summary: Dict[str, int] = {}


class HistoryCompareResult(BaseModel):
    batches: List[HistoryCompareItem] = []
    common_indicators: List[str] = []
    comparison_table: List[Dict[str, Any]] = []
