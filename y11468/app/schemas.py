from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models import OrderStatus, FabricAction


class StyleOrderCreate(BaseModel):
    order_no: str
    style_code: str
    style_name: Optional[str] = None
    batch_no: Optional[str] = None


class StyleOrderUpdate(BaseModel):
    style_name: Optional[str] = None
    batch_no: Optional[str] = None


class StyleOrderResponse(BaseModel):
    id: int
    order_no: str
    style_code: str
    style_name: Optional[str]
    version: int
    parent_id: Optional[int]
    batch_no: Optional[str]
    status: OrderStatus
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    frozen_by: Optional[str]
    frozen_at: Optional[datetime]

    class Config:
        from_attributes = True


class FabricTransactionCreate(BaseModel):
    fabric_code: str
    fabric_name: Optional[str] = None
    action: FabricAction
    quantity: float
    unit: str = "meter"
    batch_no: Optional[str] = None
    warehouse: Optional[str] = None
    remark: Optional[str] = None


class FabricTransactionResponse(BaseModel):
    id: int
    fabric_code: str
    fabric_name: Optional[str]
    action: FabricAction
    quantity: float
    unit: str
    batch_no: Optional[str]
    warehouse: Optional[str]
    operator: Optional[str]
    transaction_time: datetime
    remark: Optional[str]
    version: int

    class Config:
        from_attributes = True


class SizeModificationCreate(BaseModel):
    size_code: str
    part_name: str
    old_value: Optional[float] = None
    new_value: float
    modification_reason: Optional[str] = None


class SizeModificationResponse(BaseModel):
    id: int
    size_code: str
    part_name: str
    old_value: Optional[float]
    new_value: float
    modification_reason: Optional[str]
    version: int
    created_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ScanRecordImport(BaseModel):
    scan_code: str
    style_order_id: Optional[int] = None
    scan_type: Optional[str] = None
    fabric_code: Optional[str] = None
    quantity: float = 1
    location: Optional[str] = None
    remark: Optional[str] = None


class ScanRecordResponse(BaseModel):
    id: int
    scan_code: str
    scan_type: Optional[str]
    fabric_code: Optional[str]
    quantity: float
    scan_time: datetime
    scanner: Optional[str]
    location: Optional[str]
    is_valid: bool
    validation_error: Optional[str]

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    operator: Optional[str]
    diff_summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FailedRecordResponse(BaseModel):
    id: int
    record_type: str
    error_message: str
    source: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class VersionCompareResponse(BaseModel):
    order_v1: dict
    order_v2: dict
    fabric_diff: dict


class ReconciliationReport(BaseModel):
    style_order_id: int
    order_no: str
    fabric_balance: dict
    modification_count: int
    scan_count: int
    last_updated: datetime
