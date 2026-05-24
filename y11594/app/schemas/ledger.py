from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime


class LedgerBase(BaseModel):
    wave_no: str
    sku_code: str
    sku_name: Optional[str] = None
    picker_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    diff_qty: Optional[int] = 0
    diff_type: Optional[str] = None
    diff_reason: Optional[str] = None
    handle_opinion: Optional[str] = None


class LedgerCreate(BaseModel):
    wave_no: str
    sku_code: str
    auto_detect: bool = True


class LedgerUpdate(BaseModel):
    sku_name: Optional[str] = None
    picker_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    pick_qty: Optional[int] = None
    actual_pick_qty: Optional[int] = None
    review_qty: Optional[int] = None
    diff_qty: Optional[int] = None
    diff_type: Optional[str] = None
    diff_reason: Optional[str] = None
    handle_opinion: Optional[str] = None


class LedgerResponse(BaseModel):
    id: int
    ledger_no: str
    wave_no: str
    sku_code: str
    sku_name: Optional[str] = None
    picker_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    pick_zone: Optional[str] = None
    wave_date: Optional[datetime] = None
    pick_qty: int = 0
    actual_pick_qty: int = 0
    review_qty: int = 0
    diff_qty: int = 0
    diff_type: Optional[str] = None
    diff_reason: Optional[str] = None
    status: str
    submit_time: Optional[datetime] = None
    review_time: Optional[datetime] = None
    audit_time: Optional[datetime] = None
    is_dirty: bool = False
    dirty_type: Optional[str] = None
    dirty_note: Optional[str] = None
    performance_impact: Optional[float] = None
    inventory_impact: Optional[float] = None
    data_sources: Optional[Dict] = None
    version: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatusTransition(BaseModel):
    ledger_id: int
    reason: str
    note: Optional[str] = None


class StatusHistoryResponse(BaseModel):
    id: int
    ledger_no: str
    from_status: Optional[str] = None
    to_status: str
    operator_name: Optional[str] = None
    operate_time: datetime
    reason: Optional[str] = None
    change_note: Optional[str] = None
    changed_fields: Optional[Dict] = None

    class Config:
        from_attributes = True


class DirtyRecordResponse(BaseModel):
    id: int
    ledger_no: str
    dirty_type: str
    field_name: Optional[str] = None
    original_value: Optional[str] = None
    current_value: Optional[str] = None
    expected_value: Optional[str] = None
    error_message: Optional[str] = None
    source_data: Optional[Dict] = None
    is_resolved: bool
    resolved_by: Optional[str] = None
    resolved_time: Optional[datetime] = None
    handle_opinion: Optional[str] = None

    class Config:
        from_attributes = True


class DirtyRecordResolve(BaseModel):
    handle_opinion: str
    resolved_value: Optional[str] = None


class ImportResult(BaseModel):
    success: List[Dict]
    failed: List[Dict]
    duplicates: List[Dict]
    dirty_count: int


class LedgerQuery(BaseModel):
    wave_no: Optional[str] = None
    sku_code: Optional[str] = None
    picker_name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_dirty: Optional[bool] = None


class TraceAnalysis(BaseModel):
    performance_impact: Dict
    inventory_impact: Dict
    data_sources: Dict
    deformation_detected: bool


class LedgerDetailResponse(BaseModel):
    ledger: LedgerResponse
    status_histories: List[StatusHistoryResponse]
    dirty_records: List[DirtyRecordResponse]
    comments: List[Dict]
    trace_analysis: TraceAnalysis
