from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class StatusEnum(str, Enum):
    PENDING_IMPORT = "pending_import"
    IMPORTED = "imported"
    ABNORMAL_DETECTED = "abnormal_detected"
    ABNORMAL_CONFIRMED = "abnormal_confirmed"
    REVIEWING = "reviewing"
    VERIFIED = "verified"
    FROZEN = "frozen"
    SETTLED = "settled"
    ARCHIVED = "archived"
    REVOKED = "revoked"

class AbnormalTypeEnum(str, Enum):
    NEAR_EXPIRY = "near_expiry"
    WRONG_DAMAGED = "wrong_damaged"
    OUT_OF_STOCK_SUBSTITUTE = "out_of_stock_substitute"
    CREDIT_SALE = "credit_sale"
    RETURNED_GOODS = "returned_goods"
    SIGNATURE_MISMATCH = "signature_mismatch"
    QUANTITY_MISMATCH = "quantity_mismatch"
    OTHER = "other"

class StoreOrderCreate(BaseModel):
    order_no: str
    store_name: Optional[str] = None
    store_code: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None

class DriverTrackCreate(BaseModel):
    track_no: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_no: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[float] = None
    status: Optional[str] = None

class SignReceiptCreate(BaseModel):
    sign_no: str
    signer_name: Optional[str] = None
    signer_phone: Optional[str] = None
    sign_time: Optional[datetime] = None
    sign_type: Optional[str] = None
    is_iou: Optional[bool] = False
    iou_amount: Optional[float] = 0
    sign_remark: Optional[str] = None

class BatchImportItem(BaseModel):
    original_row_number: int
    original_data: Dict[str, Any]
    store_order: Optional[StoreOrderCreate] = None
    driver_track: Optional[DriverTrackCreate] = None
    sign_receipt: Optional[SignReceiptCreate] = None
    abnormal_type: Optional[AbnormalTypeEnum] = None
    abnormal_description: Optional[str] = None
    abnormal_quantity: Optional[float] = None
    abnormal_amount: Optional[float] = None
    area: Optional[str] = None
    store_name: Optional[str] = None
    product_name: Optional[str] = None

class BatchImportRequest(BaseModel):
    batch_no: str
    source_file: Optional[str] = None
    source_type: str = "manual"
    created_by: str
    remark: Optional[str] = None
    items: List[BatchImportItem]

class BatchImportResponse(BaseModel):
    batch_no: str
    total_records: int
    success_count: int
    fail_count: int
    status: str
    failed_items: List[Dict[str, Any]] = []

class StatusChangeRequest(BaseModel):
    receipt_no: str
    target_status: StatusEnum
    changed_by: str
    operator_role: str
    change_reason: Optional[str] = None
    manual_reason: Optional[str] = None

class ReviewRequest(BaseModel):
    receipt_no: str
    review_result: str
    review_reason: str
    reviewed_by: str
    service_remark: Optional[str] = None

class FreezeRequest(BaseModel):
    receipt_no: str
    frozen_reason: str
    frozen_by: str

class AttachmentCreate(BaseModel):
    receipt_no: str
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    uploaded_by: str
    description: Optional[str] = None

class ReceiptQuery(BaseModel):
    receipt_no: Optional[str] = None
    area: Optional[str] = None
    store_name: Optional[str] = None
    abnormal_type: Optional[str] = None
    current_status: Optional[str] = None
    is_frozen: Optional[bool] = None
    created_by: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    page_size: int = 50

class ReceiptDetail(BaseModel):
    id: int
    receipt_no: str
    batch_no: Optional[str]
    area: Optional[str]
    store_name: Optional[str]
    product_name: Optional[str]
    abnormal_type: Optional[str]
    abnormal_description: Optional[str]
    abnormal_quantity: Optional[float]
    abnormal_amount: Optional[float]
    current_status: str
    previous_status: Optional[str]
    status_before_freeze: Optional[str]
    is_frozen: bool
    frozen_reason: Optional[str]
    review_result: Optional[str]
    review_reason: Optional[str]
    reviewed_by: Optional[str]
    service_remark: Optional[str]
    manual_reason: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReceiptListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[ReceiptDetail]

class ExportRequest(BaseModel):
    export_type: str = "summary"
    filters: Dict[str, Any] = {}
    exported_by: str

class ExportSummaryItem(BaseModel):
    receipt_no: str
    area: str
    store_name: str
    product_name: str
    abnormal_type: str
    abnormal_amount: float
    status_before_freeze: Optional[str]
    current_status: str
    is_frozen: bool
    review_result: Optional[str]
    manual_reason: Optional[str]
    created_by: str
    created_at: datetime
