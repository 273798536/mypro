from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class BatchResponse(BaseModel):
    batch_no: str
    total_records: int
    success_count: int
    failed_count: int
    failed_details: List[Dict[str, Any]] = []
    process_time: float
    idempotency_strategy: str


class ReconciliationRequest(BaseModel):
    batch_no: Optional[str] = None
    checkin_no: Optional[str] = None
    checkin_nos: Optional[List[str]] = None
    reconciliation_types: Optional[List[str]] = None
    operator: str = "system"


class ReconciliationResponse(BaseModel):
    reconciliation_no: str
    batch_no: Optional[str] = None
    checkin_no: str
    reconciliation_type: str
    status: str
    is_matched: bool
    expected_amount: float
    actual_amount: float
    diff_amount: float
    diff_details: Optional[Dict[str, Any]] = None
    issues: Optional[List[str]] = None
    reconciliation_time: datetime
    is_manually_adjusted: bool = False


class ExportRequest(BaseModel):
    batch_no: Optional[str] = None
    export_type: str = Field(..., description="checkin|deposit|room_change|reconciliation|all")
    export_format: str = "excel"
    freeze_after_export: bool = False
    exported_by: str = "system"
    filters: Optional[Dict[str, Any]] = None


class ExportResponse(BaseModel):
    snapshot_no: str
    batch_no: Optional[str] = None
    export_type: str
    file_path: str
    file_name: str
    record_count: int
    is_frozen: bool
    exported_by: str
    exported_at: datetime


class AuditLogResponse(BaseModel):
    operation_id: str
    batch_no: Optional[str] = None
    record_type: str
    record_id: str
    operation: str
    operator: str
    operation_time: datetime
    change_reason: Optional[str] = None
    before_data: Optional[Dict[str, Any]] = None
    after_data: Optional[Dict[str, Any]] = None


class ManualAdjustRequest(BaseModel):
    reconciliation_no: str
    is_matched: bool
    adjust_reason: str
    adjusted_by: str
    remarks: Optional[str] = None


class FreezeRequest(BaseModel):
    snapshot_no: str
    frozen_by: str
    remarks: Optional[str] = None
