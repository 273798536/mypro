from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StatusChangeItem(BaseModel):
    timestamp: datetime
    action: str
    from_status: Optional[str] = None
    to_status: str
    operator: str
    reason: Optional[str] = None


class RecordSummary(BaseModel):
    id: int
    exception_type: str
    exception_date: datetime
    teller_name: Optional[str] = None
    description: str
    status: str
    before_status: Optional[str] = None
    after_status: Optional[str] = None
    manual_reason: Optional[str] = None
    reviewer: Optional[str] = None


class BatchDetailReport(BaseModel):
    batch_no: str
    branch_name: str
    batch_date: datetime
    current_status: str
    created_by: str
    created_at: datetime
    before_freeze_status: Optional[str] = None
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    frozen_reason: Optional[str] = None
    total_records: int
    unprocessed_records: int
    corrected_records: int
    need_manual_confirm_records: int
    failed_records: int
    status_changes: List[StatusChangeItem]
    records_with_manual_reason: List[RecordSummary]
    records_need_confirm: List[RecordSummary]


class ManagerDashboardResponse(BaseModel):
    total_batches: int
    draft_batches: int
    pending_review_batches: int
    approved_batches: int
    frozen_batches: int
    settled_batches: int
    archived_batches: int
    total_records: int
    unprocessed_records: int
    corrected_records: int
    need_manual_confirm_records: int
    failed_records: int
    recent_batches: List[BatchDetailReport]


class ExportRequest(BaseModel):
    batch_ids: Optional[List[int]] = Field(None, description="指定批次ID，不指定则导出全部")
    export_format: str = Field("xlsx", description="导出格式：xlsx/csv")
    include_records: bool = Field(True, description="是否包含记录明细")
    include_history: bool = Field(True, description="是否包含状态历史")
    include_failures: bool = Field(True, description="是否包含失败记录")
