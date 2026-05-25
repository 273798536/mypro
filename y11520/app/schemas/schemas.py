from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

from app.models.enums import UserRole, RecordStatus, DirtyType, RecordSource, ReviewResult


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentOrderBase(BaseModel):
    order_no: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    address: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = 1
    appointment_time: Optional[datetime] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    status: Optional[str] = None
    is_rescheduled: Optional[bool] = False
    reschedule_count: Optional[int] = 0
    is_second_visit: Optional[bool] = False
    amount: Optional[float] = 0
    raw_data: Optional[Dict[str, Any]] = None


class AppointmentOrderCreate(AppointmentOrderBase):
    pass


class AppointmentOrderResponse(AppointmentOrderBase):
    id: int
    batch_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentOrderReadOnly(AppointmentOrderBase):
    id: int
    batch_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentOrderEntry(BaseModel):
    id: int
    batch_id: int
    order_no: str
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    appointment_time: Optional[datetime] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    status: Optional[str] = None
    is_rescheduled: Optional[bool] = None
    is_second_visit: Optional[bool] = None
    amount: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TechnicianLocationBase(BaseModel):
    technician_id: str
    technician_name: Optional[str] = None
    order_no: Optional[str] = None
    checkin_time: Optional[datetime] = None
    checkout_time: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    stay_duration: Optional[int] = None
    raw_data: Optional[Dict[str, Any]] = None


class TechnicianLocationCreate(TechnicianLocationBase):
    pass


class TechnicianLocationResponse(TechnicianLocationBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TechnicianLocationEntry(BaseModel):
    id: int
    batch_id: int
    technician_id: str
    technician_name: Optional[str] = None
    order_no: Optional[str] = None
    checkin_time: Optional[datetime] = None
    checkout_time: Optional[datetime] = None
    stay_duration: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserReviewBase(BaseModel):
    order_no: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    rating: Optional[int] = None
    review_content: Optional[str] = None
    review_time: Optional[datetime] = None
    has_quality_issue: Optional[bool] = False
    bad_review_reason: Optional[str] = None
    bad_review_found: Optional[bool] = False
    raw_data: Optional[Dict[str, Any]] = None


class UserReviewCreate(UserReviewBase):
    pass


class UserReviewResponse(UserReviewBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserReviewEntry(BaseModel):
    id: int
    batch_id: int
    order_no: str
    customer_name: Optional[str] = None
    rating: Optional[int] = None
    review_content: Optional[str] = None
    review_time: Optional[datetime] = None
    has_quality_issue: Optional[bool] = None
    bad_review_found: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserReviewReadOnly(BaseModel):
    id: int
    batch_id: int
    order_no: str
    rating: Optional[int] = None
    review_time: Optional[datetime] = None
    bad_review_found: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExternalReceiptBase(BaseModel):
    receipt_no: str
    order_no: Optional[str] = None
    receipt_type: Optional[str] = None
    quantity: Optional[int] = 1
    amount: Optional[float] = None
    receipt_time: Optional[datetime] = None
    handler: Optional[str] = None
    status: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class ExternalReceiptCreate(ExternalReceiptBase):
    pass


class ExternalReceiptResponse(ExternalReceiptBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExternalReceiptEntry(BaseModel):
    id: int
    batch_id: int
    receipt_no: str
    order_no: Optional[str] = None
    receipt_type: Optional[str] = None
    quantity: Optional[int] = None
    amount: Optional[float] = None
    receipt_time: Optional[datetime] = None
    status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DirtyRecordBase(BaseModel):
    source: RecordSource
    dirty_type: DirtyType
    record_id: Optional[str] = None
    target_model: Optional[str] = None
    target_record_id: Optional[int] = None
    field_name: Optional[str] = None
    original_value: Optional[str] = None
    corrected_value: Optional[str] = None
    raw_content: Optional[Dict[str, Any]] = None
    handling_opinion: Optional[str] = None


class DirtyRecordCreate(DirtyRecordBase):
    pass


class DirtyRecordResolve(BaseModel):
    handling_opinion: str
    corrected_value: Optional[str] = None
    apply_correction: bool = Field(default=True, description="是否将修正值回写到原始记录")


class DirtyRecordResponse(DirtyRecordBase):
    id: int
    batch_id: int
    is_resolved: bool
    is_applied: bool
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StatusLogBase(BaseModel):
    from_status: Optional[RecordStatus] = None
    to_status: RecordStatus
    reason: Optional[str] = None
    manual_reason: Optional[str] = None


class StatusLogResponse(StatusLogBase):
    id: int
    batch_id: int
    operator_id: int
    operation_time: datetime

    class Config:
        from_attributes = True


class BatchCreate(BaseModel):
    batch_no: str
    name: Optional[str] = None
    region: Optional[str] = None
    remark: Optional[str] = None


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    remark: Optional[str] = None


class BatchResponse(BaseModel):
    id: int
    batch_no: str
    name: Optional[str] = None
    region: Optional[str] = None
    status: RecordStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    remark: Optional[str] = None

    class Config:
        from_attributes = True


class BatchResponseManager(BatchResponse):
    freeze_reason: Optional[str] = None
    freeze_time: Optional[datetime] = None
    unfreeze_reason: Optional[str] = None
    unfreeze_time: Optional[datetime] = None
    status_before_freeze: Optional[RecordStatus] = None


class BatchResponseReadOnly(BaseModel):
    id: int
    batch_no: str
    name: Optional[str] = None
    region: Optional[str] = None
    status: RecordStatus
    created_at: datetime

    class Config:
        from_attributes = True


class BatchDetailResponse(BatchResponseManager):
    appointment_orders: List[AppointmentOrderResponse] = []
    technician_locations: List[TechnicianLocationResponse] = []
    user_reviews: List[UserReviewResponse] = []
    external_receipts: List[ExternalReceiptResponse] = []
    dirty_records: List[DirtyRecordResponse] = []
    status_logs: List[StatusLogResponse] = []


class BatchDetailResponseEntry(BaseModel):
    id: int
    batch_no: str
    name: Optional[str] = None
    region: Optional[str] = None
    status: RecordStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    remark: Optional[str] = None
    appointment_orders: List[AppointmentOrderEntry] = []
    technician_locations: List[TechnicianLocationEntry] = []
    user_reviews: List[UserReviewEntry] = []
    external_receipts: List[ExternalReceiptEntry] = []
    dirty_records: List[DirtyRecordResponse] = []

    class Config:
        from_attributes = True


class BatchDetailResponseReadOnly(BaseModel):
    id: int
    batch_no: str
    name: Optional[str] = None
    region: Optional[str] = None
    status: RecordStatus
    created_at: datetime
    appointment_orders: List[AppointmentOrderReadOnly] = []
    user_reviews: List[UserReviewReadOnly] = []

    class Config:
        from_attributes = True


class BatchDataUpload(BaseModel):
    appointment_orders: List[AppointmentOrderCreate] = []
    technician_locations: List[TechnicianLocationCreate] = []
    user_reviews: List[UserReviewCreate] = []
    external_receipts: List[ExternalReceiptCreate] = []


class BatchStatusChange(BaseModel):
    manual_reason: Optional[str] = None


class BatchReview(BaseModel):
    result: ReviewResult
    comment: Optional[str] = None
    manual_reason: Optional[str] = None


class BatchFreeze(BaseModel):
    freeze_reason: str
    manual_reason: Optional[str] = None


class BatchUnfreeze(BaseModel):
    unfreeze_reason: str
    manual_reason: Optional[str] = None


class SummaryStats(BaseModel):
    total_batches: int
    draft_count: int
    pending_review_count: int
    reviewed_count: int
    frozen_count: int
    settled_count: int
    archived_count: int
    total_orders: int
    total_quantity: int
    rescheduled_count: int
    second_visit_count: int
    bad_review_not_found_count: int
    dirty_record_count: int
    resolved_dirty_count: int
    quantity_conflict_count: int


class ExportSummaryItem(BaseModel):
    batch_no: str
    batch_name: str
    region: str
    status: str
    status_before_freeze: Optional[str]
    freeze_reason: Optional[str]
    manual_reason: Optional[str]
    total_orders: int
    total_quantity: int
    rescheduled_count: int
    second_visit_count: int
    bad_review_count: int
    bad_review_not_found_count: int
    quantity_conflict_count: int
    dirty_record_count: int
    created_at: datetime
    creator: str


class BatchListResponse(BaseModel):
    items: List[BatchResponse]
    total: int
    page: int
    page_size: int


class BatchListResponseManager(BaseModel):
    items: List[BatchResponseManager]
    total: int
    page: int
    page_size: int


class BatchListResponseReadOnly(BaseModel):
    items: List[BatchResponseReadOnly]
    total: int
    page: int
    page_size: int
