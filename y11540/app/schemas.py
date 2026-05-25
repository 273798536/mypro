from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models import UserRole, ReceiptStatus, DirtyRecordType, AuditAction


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.VIEWER


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchBase(BaseModel):
    name: str
    description: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchResponse(BatchBase):
    id: int
    batch_no: str
    total_count: int
    created_by: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReceiptBase(BaseModel):
    material_id: str
    material_name: Optional[str] = None
    platform: Optional[str] = None
    review_result: Optional[str] = None
    review_comment: Optional[str] = None
    daily_cost: Optional[float] = None
    daily_impressions: Optional[int] = None
    daily_clicks: Optional[int] = None
    secondary_confirmation: Optional[str] = None
    confirmation_date: Optional[datetime] = None
    report_date: Optional[datetime] = None
    cost_amount: Optional[float] = None
    raw_data: Optional[Dict[str, Any]] = None


class ReceiptCreate(ReceiptBase):
    batch_id: Optional[int] = None


class ReceiptUpdate(BaseModel):
    material_name: Optional[str] = None
    platform: Optional[str] = None
    review_result: Optional[str] = None
    review_comment: Optional[str] = None
    daily_cost: Optional[float] = None
    daily_impressions: Optional[int] = None
    daily_clicks: Optional[int] = None
    secondary_confirmation: Optional[str] = None
    confirmation_date: Optional[datetime] = None
    report_date: Optional[datetime] = None
    cost_amount: Optional[float] = None
    process_opinion: Optional[str] = None


class _BaseReceiptResponse(BaseModel):
    id: int
    receipt_no: str
    status: ReceiptStatus
    has_dirty: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ViewerReceiptResponse(_BaseReceiptResponse):
    material_id: str
    material_name: Optional[str] = None
    platform: Optional[str] = None
    report_date: Optional[datetime] = None
    batch_id: Optional[int] = None


class DataEntryReceiptResponse(ViewerReceiptResponse):
    review_result: Optional[str] = None
    daily_cost: Optional[float] = None
    daily_impressions: Optional[int] = None
    daily_clicks: Optional[int] = None
    secondary_confirmation: Optional[str] = None
    confirmation_date: Optional[datetime] = None
    cost_amount: Optional[float] = None
    original_material_name: Optional[str] = None


class ReviewerReceiptResponse(DataEntryReceiptResponse):
    review_comment: Optional[str] = None
    review_remark: Optional[str] = None
    process_opinion: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class SupervisorReceiptResponse(ReviewerReceiptResponse):
    prev_status: Optional[ReceiptStatus] = None
    freeze_reason: Optional[str] = None
    dirty_types: Optional[List[str]] = None
    created_by: Optional[int] = None
    reviewed_by: Optional[int] = None
    updated_at: Optional[datetime] = None


ReceiptResponse = SupervisorReceiptResponse


ROLE_RESPONSE_MAP = {
    UserRole.VIEWER: ViewerReceiptResponse,
    UserRole.DATA_ENTRY: DataEntryReceiptResponse,
    UserRole.REVIEWER: ReviewerReceiptResponse,
    UserRole.SUPERVISOR: SupervisorReceiptResponse,
}


def get_receipt_response_for_role(role: UserRole):
    return ROLE_RESPONSE_MAP.get(role, ViewerReceiptResponse)


class _BaseReceiptListResponse(BaseModel):
    id: int
    receipt_no: str
    material_id: str
    material_name: Optional[str] = None
    platform: Optional[str] = None
    status: ReceiptStatus
    has_dirty: bool
    report_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ViewerReceiptListResponse(_BaseReceiptListResponse):
    pass


class DataEntryReceiptListResponse(_BaseReceiptListResponse):
    daily_cost: Optional[float] = None


ReceiptListResponse = DataEntryReceiptListResponse


ROLE_LIST_RESPONSE_MAP = {
    UserRole.VIEWER: ViewerReceiptListResponse,
    UserRole.DATA_ENTRY: DataEntryReceiptListResponse,
    UserRole.REVIEWER: DataEntryReceiptListResponse,
    UserRole.SUPERVISOR: DataEntryReceiptListResponse,
}


def get_receipt_list_response_for_role(role: UserRole):
    return ROLE_LIST_RESPONSE_MAP.get(role, ViewerReceiptListResponse)


class StatusChangeRequest(BaseModel):
    reason: Optional[str] = None


class ReviewRequest(StatusChangeRequest):
    review_remark: Optional[str] = None


class FreezeRequest(BaseModel):
    freeze_reason: str


class DirtyRecordResponse(BaseModel):
    id: int
    receipt_id: int
    dirty_type: DirtyRecordType
    field_name: Optional[str]
    original_value: Optional[str]
    expected_value: Optional[str]
    description: Optional[str]
    is_fixed: bool
    fix_note: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DirtyFixRequest(BaseModel):
    fix_note: Optional[str] = None
    updates: Dict[str, Any]


class AttachmentResponse(BaseModel):
    id: int
    receipt_id: int
    file_name: str
    file_size: Optional[int]
    file_type: Optional[str]
    uploaded_by: Optional[int]
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: int
    receipt_id: Optional[int]
    action: AuditAction
    operator_id: Optional[int]
    details: Optional[Dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatusHistoryResponse(BaseModel):
    id: int
    receipt_id: int
    from_status: Optional[ReceiptStatus]
    to_status: ReceiptStatus
    reason: Optional[str]
    operator_id: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupervisorViewResponse(BaseModel):
    id: int
    receipt_no: str
    material_id: str
    material_name: Optional[str]
    platform: Optional[str]
    prev_status: Optional[ReceiptStatus]
    current_status: ReceiptStatus
    freeze_reason: Optional[str]
    review_remark: Optional[str]
    report_date: Optional[datetime]
    daily_cost: Optional[float]
    cost_amount: Optional[float]
    has_dirty: bool
    created_at: datetime


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


class BatchReceiptCreate(BaseModel):
    batch_id: int
    receipts: List[ReceiptCreate]
