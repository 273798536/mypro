from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models import UserRole, RecordStatus, DirtyType


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class InspectionPhotoBase(BaseModel):
    photo_url: str
    photo_type: str
    upload_time: datetime
    uploader: str
    description: Optional[str] = None
    is_defective: bool = False
    defect_detail: Optional[str] = None


class InspectionPhotoCreate(InspectionPhotoBase):
    pass


class InspectionPhoto(InspectionPhotoBase):
    id: int
    application_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LogisticsReceiptBase(BaseModel):
    tracking_no: str
    courier_company: str
    ship_date: datetime
    receive_date: Optional[datetime] = None
    signatory: Optional[str] = None
    receipt_url: Optional[str] = None
    actual_quantity: int
    damaged_quantity: int = 0


class LogisticsReceiptCreate(LogisticsReceiptBase):
    pass


class LogisticsReceipt(LogisticsReceiptBase):
    id: int
    application_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RefundRecordBase(BaseModel):
    refund_no: str
    refund_date: datetime
    actual_amount: float
    settlement_amount: float
    difference_amount: float
    difference_reason: Optional[str] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    supplier_approved_batches: Optional[List[str]] = None
    disputed_batches: Optional[List[str]] = None


class RefundRecordCreate(RefundRecordBase):
    pass


class RefundRecord(RefundRecordBase):
    id: int
    application_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LedgerRecordBase(BaseModel):
    inventory_diff_quantity: int = 0
    inventory_diff_reason: Optional[str] = None
    remaining_goods_status: Optional[str] = None
    remaining_goods_quantity: int = 0
    remaining_handler: Optional[str] = None


class LedgerRecordCreate(LedgerRecordBase):
    pass


class LedgerRecord(LedgerRecordBase):
    id: int
    application_id: int
    is_closed: bool
    closed_by: Optional[int] = None
    closed_at: Optional[datetime] = None
    summary: Optional[Dict[str, Any]] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DirtyRecordBase(BaseModel):
    dirty_type: DirtyType
    field_name: Optional[str] = None
    original_value: Optional[str] = None
    current_value: Optional[str] = None
    handling_opinion: Optional[str] = None
    raw_source: Optional[Dict[str, Any]] = None


class DirtyRecordCreate(DirtyRecordBase):
    pass


class DirtyRecord(DirtyRecordBase):
    id: int
    application_id: int
    handled_by: Optional[int] = None
    handled_at: Optional[datetime] = None
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    action: str
    old_status: Optional[RecordStatus] = None
    new_status: Optional[RecordStatus] = None
    change_reason: Optional[str] = None
    changed_fields: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLog(AuditLogBase):
    id: int
    application_id: Optional[int] = None
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReturnApplicationBase(BaseModel):
    application_no: str
    batch_no: str
    sku_code: str
    sku_name: str
    supplier_id: str
    supplier_name: str
    supplier_contact: Optional[str] = None
    supplier_phone: Optional[str] = None
    return_quantity: int
    return_reason: Optional[str] = None
    application_date: datetime
    applicant: str
    warehouse_id: str
    warehouse_name: str
    idempotency_key: Optional[str] = None


class ReturnApplicationCreate(ReturnApplicationBase):
    inspection_photos: List[InspectionPhotoCreate] = Field(default_factory=list)
    logistics_receipts: List[LogisticsReceiptCreate] = Field(default_factory=list)
    raw_data: Optional[Dict[str, Any]] = None


class ReturnApplicationUpdate(BaseModel):
    batch_no: Optional[str] = None
    sku_code: Optional[str] = None
    sku_name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    supplier_phone: Optional[str] = None
    return_quantity: Optional[int] = None
    return_reason: Optional[str] = None
    applicant: Optional[str] = None
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None


class ReturnApplication(ReturnApplicationBase):
    id: int
    status: RecordStatus
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    inspection_photos: List[InspectionPhoto] = Field(default_factory=list)
    logistics_receipts: List[LogisticsReceipt] = Field(default_factory=list)
    refund_records: List[RefundRecord] = Field(default_factory=list)
    ledger: Optional[LedgerRecord] = None
    dirty_records: List[DirtyRecord] = Field(default_factory=list)
    audit_logs: List[AuditLog] = Field(default_factory=list)

    class Config:
        from_attributes = True


class StatusTransitionRequest(BaseModel):
    new_status: RecordStatus
    change_reason: Optional[str] = None


class ImportResult(BaseModel):
    total: int
    created: int
    updated: int
    skipped: int
    errors: List[str]
    duplicate_keys: List[str]


class SystemCheckResult(BaseModel):
    check_type: str
    passed: bool
    details: Dict[str, Any]
    execution_time_ms: int
