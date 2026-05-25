from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from app.models import (
    BatchStatus, MaterialStatus, IdempotentAction,
    TaskStatus, OperationType
)


class BatchBase(BaseModel):
    batch_no: str
    exhibition_name: str
    idempotent_action: Optional[IdempotentAction] = IdempotentAction.IGNORE
    created_by: Optional[str] = None
    remark: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    exhibition_name: Optional[str] = None
    remark: Optional[str] = None
    updated_by: Optional[str] = None


class BatchResponse(BatchBase):
    id: int
    status: BatchStatus
    is_frozen: bool
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    frozen_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MaterialItemBase(BaseModel):
    material_code: str
    material_name: str
    category: Optional[str] = None
    quantity: int = 1
    unit: Optional[str] = None
    warehouse_location: Optional[str] = None


class MaterialItemCreate(MaterialItemBase):
    pass


class MaterialItemResponse(MaterialItemBase):
    id: int
    batch_id: int
    status: MaterialStatus
    current_holder: Optional[str] = None
    current_location: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LogisticsReceiptBase(BaseModel):
    material_code: str
    waybill_no: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    send_time: Optional[datetime] = None
    receive_time: Optional[datetime] = None
    is_received: bool = False
    received_quantity: int = 0
    damaged_quantity: int = 0
    receiver_signature: Optional[str] = None
    receipt_remark: Optional[str] = None
    images: Optional[List[str]] = None


class LogisticsReceiptCreate(LogisticsReceiptBase):
    pass


class LogisticsReceiptResponse(LogisticsReceiptBase):
    id: int
    batch_id: int
    material_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BorrowRecordBase(BaseModel):
    material_code: str
    borrower: str
    borrower_phone: Optional[str] = None
    borrower_department: Optional[str] = None
    borrow_time: Optional[datetime] = None
    expected_return_time: Optional[datetime] = None
    borrow_quantity: int = 1
    borrow_remark: Optional[str] = None
    witness: Optional[str] = None
    approval_by: Optional[str] = None


class BorrowRecordCreate(BorrowRecordBase):
    pass


class BorrowRecordReturn(BaseModel):
    return_quantity: int
    actual_return_time: Optional[datetime] = None
    return_remark: Optional[str] = None
    returned_by: Optional[str] = None


class BorrowRecordResponse(BorrowRecordBase):
    id: int
    batch_id: int
    material_id: int
    is_returned: bool
    return_quantity: int
    actual_return_time: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SupplementRecordBase(BaseModel):
    record_type: str
    content: str
    supplementary_by: Optional[str] = None
    supplementary_time: Optional[datetime] = None
    reason: Optional[str] = None
    related_material_codes: Optional[List[str]] = None


class SupplementRecordCreate(SupplementRecordBase):
    pass


class SupplementRecordResponse(SupplementRecordBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceTrackingBase(BaseModel):
    borrow_record_id: int
    device_code: str
    device_name: str
    last_known_location: Optional[str] = None
    last_seen_time: Optional[datetime] = None
    last_seen_by: Optional[str] = None
    responsible_person: Optional[str] = None
    remark: Optional[str] = None


class DeviceTrackingCreate(DeviceTrackingBase):
    pass


class DeviceTrackingUpdate(BaseModel):
    last_known_location: Optional[str] = None
    last_seen_time: Optional[datetime] = None
    last_seen_by: Optional[str] = None
    current_status: Optional[str] = None
    responsible_person: Optional[str] = None
    final_disposition: Optional[str] = None
    disposition_time: Optional[datetime] = None
    disposition_by: Optional[str] = None
    remark: Optional[str] = None


class DeviceTrackingResponse(DeviceTrackingBase):
    id: int
    current_status: Optional[str] = None
    final_disposition: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentBase(BaseModel):
    file_name: str
    description: Optional[str] = None
    uploaded_by: Optional[str] = None


class AttachmentResponse(AttachmentBase):
    id: int
    batch_id: int
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class BatchDataImportRequest(BaseModel):
    materials: List[MaterialItemCreate] = Field(default_factory=list)
    logistics: List[LogisticsReceiptCreate] = Field(default_factory=list)
    borrow_records: List[BorrowRecordCreate] = Field(default_factory=list)
    supplements: List[SupplementRecordCreate] = Field(default_factory=list)
    imported_by: Optional[str] = None


class FreezeRequest(BaseModel):
    reason: str
    operated_by: str


class UnfreezeRequest(BaseModel):
    reason: str
    operated_by: str


class ReviewRequest(BaseModel):
    material_id: Optional[int] = None
    new_status: MaterialStatus
    reason: str
    reviewed_by: str
    is_overrule: bool = False


class IdempotentCheckResponse(BaseModel):
    batch_no: str
    exists: bool
    idempotent_action: IdempotentAction
    message: str


class StateRecordResponse(BaseModel):
    id: int
    batch_id: int
    material_id: Optional[int] = None
    from_status: Optional[str] = None
    to_status: str
    changed_at: datetime
    changed_by: Optional[str] = None
    reason: Optional[str] = None
    change_source: Optional[str] = None
    is_freeze_snapshot: bool

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    batch_id: Optional[int] = None
    record_type: Optional[str] = None
    record_id: Optional[int] = None
    operation_type: OperationType
    operated_by: Optional[str] = None
    operated_at: datetime
    change_reason: Optional[str] = None

    class Config:
        from_attributes = True


class AsyncTaskResponse(BaseModel):
    id: int
    task_id: str
    task_name: str
    status: TaskStatus
    batch_id: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: int
    max_retries: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportItem(BaseModel):
    material_code: str
    material_name: str
    status_before_freeze: Optional[str] = None
    status_after_freeze: Optional[str] = None
    current_status: str
    borrower: Optional[str] = None
    last_location: Optional[str] = None
    responsible_person: Optional[str] = None
    manual_reason: Optional[str] = None
    final_disposition: Optional[str] = None


class BatchReportResponse(BaseModel):
    batch_no: str
    exhibition_name: str
    is_frozen: bool
    frozen_at: Optional[datetime] = None
    frozen_reason: Optional[str] = None
    items: List[ReportItem]
    summary: Dict[str, Any]
