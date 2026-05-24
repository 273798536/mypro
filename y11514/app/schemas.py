from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, WorkflowStatus, RecordStatus, DamageType


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None


class BorrowApplicationBase(BaseModel):
    application_no: str
    reader_name: str
    reader_id: str
    reader_department: Optional[str] = None
    book_title: str
    book_isbn: Optional[str] = None
    book_author: Optional[str] = None
    lending_library: str
    borrowing_library: str
    apply_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    renew_count: int = 0
    latest_renew_date: Optional[datetime] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    processing_notes: Optional[str] = None


class BorrowApplicationCreate(BorrowApplicationBase):
    pass


class BorrowApplicationUpdate(BaseModel):
    reader_name: Optional[str] = None
    reader_id: Optional[str] = None
    reader_department: Optional[str] = None
    book_title: Optional[str] = None
    book_isbn: Optional[str] = None
    book_author: Optional[str] = None
    lending_library: Optional[str] = None
    borrowing_library: Optional[str] = None
    apply_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    renew_count: Optional[int] = None
    latest_renew_date: Optional[datetime] = None
    status: Optional[WorkflowStatus] = None
    record_status: Optional[RecordStatus] = None
    processing_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    change_reason: Optional[str] = None


class BorrowApplicationResponse(BorrowApplicationBase):
    id: int
    record_status: RecordStatus
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class BorrowApplicationDetailResponse(BorrowApplicationResponse):
    express_orders: List["ExpressOrderResponse"] = []
    compensation_records: List["CompensationRecordResponse"] = []
    refund_records: List["RefundRecordResponse"] = []


class ExpressOrderBase(BaseModel):
    order_no: str
    borrow_application_id: int
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    send_address: Optional[str] = None
    receive_address: Optional[str] = None
    send_date: Optional[datetime] = None
    receive_date: Optional[datetime] = None
    express_company: Optional[str] = None
    shipping_cost: Optional[float] = None
    cost_borne_by: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    processing_notes: Optional[str] = None


class ExpressOrderCreate(ExpressOrderBase):
    pass


class ExpressOrderUpdate(BaseModel):
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    send_address: Optional[str] = None
    receive_address: Optional[str] = None
    send_date: Optional[datetime] = None
    receive_date: Optional[datetime] = None
    express_company: Optional[str] = None
    shipping_cost: Optional[float] = None
    cost_borne_by: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    record_status: Optional[RecordStatus] = None
    processing_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    change_reason: Optional[str] = None


class ExpressOrderResponse(ExpressOrderBase):
    id: int
    record_status: RecordStatus
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class CompensationRecordBase(BaseModel):
    record_no: str
    borrow_application_id: int
    reader_name: str
    reader_id: str
    damage_type: DamageType
    damage_description: Optional[str] = None
    compensation_amount: Optional[float] = None
    overdue_days: Optional[int] = None
    daily_overdue_fee: Optional[float] = None
    soiling_fee: Optional[float] = None
    other_fees: Optional[float] = None
    total_amount: Optional[float] = None
    paid_amount: float = 0
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    processing_notes: Optional[str] = None


class CompensationRecordCreate(CompensationRecordBase):
    pass


class CompensationRecordUpdate(BaseModel):
    reader_name: Optional[str] = None
    reader_id: Optional[str] = None
    damage_type: Optional[DamageType] = None
    damage_description: Optional[str] = None
    compensation_amount: Optional[float] = None
    overdue_days: Optional[int] = None
    daily_overdue_fee: Optional[float] = None
    soiling_fee: Optional[float] = None
    other_fees: Optional[float] = None
    total_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    record_status: Optional[RecordStatus] = None
    processing_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    change_reason: Optional[str] = None


class CompensationRecordResponse(CompensationRecordBase):
    id: int
    record_status: RecordStatus
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class RefundRecordBase(BaseModel):
    refund_no: str
    compensation_record_id: int
    borrow_application_id: int
    reader_name: str
    reader_id: str
    refund_amount: float
    refund_reason: Optional[str] = None
    refund_date: Optional[datetime] = None
    refund_method: Optional[str] = None
    related_flow_no: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    processing_notes: Optional[str] = None


class RefundRecordCreate(RefundRecordBase):
    pass


class RefundRecordUpdate(BaseModel):
    reader_name: Optional[str] = None
    reader_id: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    refund_date: Optional[datetime] = None
    refund_method: Optional[str] = None
    related_flow_no: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    record_status: Optional[RecordStatus] = None
    processing_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    change_reason: Optional[str] = None


class RefundRecordResponse(RefundRecordBase):
    id: int
    record_status: RecordStatus
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_role: str
    action: str
    table_name: str
    record_id: int
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportRecordResponse(BaseModel):
    id: int
    import_batch_no: str
    file_name: str
    record_type: str
    total_count: int
    success_count: int
    error_count: int
    duplicate_count: int
    created_by: int
    created_at: datetime
    error_details: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryDifferenceBase(BaseModel):
    difference_no: str
    inventory_date: Optional[datetime] = None
    book_title: str
    book_isbn: Optional[str] = None
    expected_quantity: int
    actual_quantity: int
    difference_quantity: int
    difference_type: str
    related_application_no: Optional[str] = None
    handling_suggestion: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    processing_notes: Optional[str] = None


class InventoryDifferenceCreate(InventoryDifferenceBase):
    pass


class InventoryDifferenceResponse(InventoryDifferenceBase):
    id: int
    record_status: RecordStatus
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CostCalculationRequest(BaseModel):
    application_no: str
    calculate_breakdown: bool = True


class CostBreakdown(BaseModel):
    overdue_days: int = 0
    overdue_cost: float = 0
    soiling_cost: float = 0
    damage_cost: float = 0
    shipping_cost: float = 0
    other_cost: float = 0
    total_cost: float = 0
    paid_amount: float = 0
    refund_amount: float = 0
    final_balance: float = 0


class CostCalculationResponse(BaseModel):
    application_no: str
    reader_name: str
    book_title: str
    cost_breakdown: CostBreakdown
    calculation_trace: List[str]


class StatisticsResponse(BaseModel):
    total_records: int
    unprocessed_records: int
    corrected_records: int
    needs_manual_confirm_records: int
    total_compensation_amount: float
    total_refund_amount: float
    by_record_status: dict
    by_damage_type: dict
    by_workflow_status: dict


class RoleViewResponse(BaseModel):
    view_type: str
    summary: dict
    recent_changes: List[AuditLogResponse]
    pending_items: List[dict]


BorrowApplicationDetailResponse.model_rebuild()
