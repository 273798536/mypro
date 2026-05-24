from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime
from decimal import Decimal
from app.models.ledger import LedgerStatus, RecordType, DirtyRecordType, DuplicateHandling


class LedgerBase(BaseModel):
    batch_number: str
    record_type: RecordType
    customer_name: Optional[str] = None
    equipment_name: Optional[str] = None
    equipment_model: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    deposit_amount: Optional[Decimal] = None
    deposit_deducted: Optional[Decimal] = Decimal('0')
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    change_reason: Optional[str] = None


class LedgerCreate(LedgerBase):
    pass


class LedgerUpdate(BaseModel):
    customer_name: Optional[str] = None
    equipment_name: Optional[str] = None
    equipment_model: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    deposit_amount: Optional[Decimal] = None
    deposit_deducted: Optional[Decimal] = None
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    change_reason: Optional[str] = None


class LedgerResponse(LedgerBase):
    id: int
    status: LedgerStatus
    is_dirty: bool = False
    dirty_type: Optional[DirtyRecordType] = None
    dirty_note: Optional[str] = None
    original_content: Optional[dict] = None
    correction_note: Optional[str] = None
    is_duplicate: bool = False
    duplicate_handling: Optional[DuplicateHandling] = None
    duplicate_note: Optional[str] = None
    original_batch_number: Optional[str] = None
    created_by: Optional[int] = None
    reviewed_by: Optional[int] = None
    second_confirmed_by: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    second_confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LedgerMaskedResponse(BaseModel):
    id: int
    batch_number: str
    record_type: RecordType
    customer_name: Optional[str] = None
    equipment_name: Optional[str] = None
    equipment_model: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[str] = None
    total_amount: Optional[str] = None
    deposit_amount: Optional[str] = None
    deposit_deducted: Optional[str] = None
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    status: LedgerStatus
    is_dirty: bool = False
    dirty_type: Optional[DirtyRecordType] = None
    dirty_note: Optional[str] = None
    original_content: Optional[dict] = None
    correction_note: Optional[str] = None
    is_duplicate: bool = False
    duplicate_handling: Optional[DuplicateHandling] = None
    duplicate_note: Optional[str] = None
    original_batch_number: Optional[str] = None
    created_by: Optional[int] = None
    reviewed_by: Optional[int] = None
    second_confirmed_by: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    second_confirmed_at: Optional[datetime] = None


class LedgerListResponse(BaseModel):
    total: int
    items: List[Union[LedgerResponse, LedgerMaskedResponse]]


class SubmitRequest(BaseModel):
    change_reason: Optional[str] = None


class RejectRequest(BaseModel):
    rejection_reason: str
    change_reason: Optional[str] = None


class DirtyRecordHandleRequest(BaseModel):
    dirty_type: DirtyRecordType
    dirty_note: str
    correction_note: Optional[str] = None


class DuplicateHandleRequest(BaseModel):
    handling: DuplicateHandling
    duplicate_note: str
    original_batch_number: Optional[str] = None


class OutboundOrderBase(BaseModel):
    order_number: str
    warehouse: Optional[str] = None
    handler: Optional[str] = None
    outbound_date: Optional[datetime] = None
    remark: Optional[str] = None


class OutboundOrderCreate(OutboundOrderBase):
    ledger_id: int


class OutboundOrderResponse(OutboundOrderBase):
    id: int
    ledger_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReturnPhotoBase(BaseModel):
    photo_url: str
    photo_type: Optional[str] = None
    uploader: Optional[str] = None
    description: Optional[str] = None
    taken_at: Optional[datetime] = None


class ReturnPhotoCreate(ReturnPhotoBase):
    ledger_id: int


class ReturnPhotoResponse(ReturnPhotoBase):
    id: int
    ledger_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceEstimateBase(BaseModel):
    estimate_number: str
    maintenance_type: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    estimator: Optional[str] = None
    maintenance_date: Optional[datetime] = None
    remark: Optional[str] = None


class MaintenanceEstimateCreate(MaintenanceEstimateBase):
    ledger_id: int


class MaintenanceEstimateResponse(MaintenanceEstimateBase):
    id: int
    ledger_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierStatementBase(BaseModel):
    statement_number: str
    supplier_name: Optional[str] = None
    billing_cycle: Optional[str] = None
    total_billed: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    unpaid_amount: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    remark: Optional[str] = None


class SupplierStatementCreate(SupplierStatementBase):
    ledger_id: int


class SupplierStatementResponse(SupplierStatementBase):
    id: int
    ledger_id: int
    created_at: datetime

    class Config:
        from_attributes = True
