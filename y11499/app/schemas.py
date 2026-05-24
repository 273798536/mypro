from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any, Dict
from enum import Enum


class UserRole(str, Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    FINANCE = "finance"
    AUDITOR = "auditor"
    ADMIN = "admin"


class ReimbursementStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRM = "second_confirm"
    AUDIT_ONLY = "audit_only"
    APPROVED = "approved"
    PAID = "paid"


class BatchStrategy(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAIT_RETRY = "wait_retry"
    WAIT_MANUAL = "wait_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class EvidenceType(str, Enum):
    INVOICE_PDF = "invoice_pdf"
    TRAVEL_APPLICATION = "travel_application"
    PAYMENT_RECEIPT = "payment_receipt"
    SMS_SCREENSHOT = "sms_screenshot"
    STORE_TRANSFER = "store_transfer"
    OTHER = "other"


class UserBase(BaseModel):
    username: str
    full_name: str
    email: str
    role: UserRole
    department: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class BatchBase(BaseModel):
    name: str
    description: Optional[str] = None
    strategy: BatchStrategy = BatchStrategy.APPEND


class BatchCreate(BatchBase):
    pass


class BatchResponse(BatchBase):
    id: int
    batch_number: str
    creator_id: int
    status: str
    total_items: int
    processed_items: int
    failed_items: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    invoice_number: str
    invoice_code: Optional[str] = None
    invoice_date: Optional[datetime] = None
    seller_name: Optional[str] = None
    seller_tax_no: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_tax_no: Optional[str] = None
    total_amount: float
    tax_amount: Optional[float] = 0
    amount_with_tax: Optional[float] = 0
    category: Optional[str] = None
    expense_type: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceResponse(InvoiceBase):
    id: int
    reimbursement_id: Optional[int] = None
    is_duplicate: bool
    pdf_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TravelApplicationBase(BaseModel):
    application_no: str
    applicant: str
    department: Optional[str] = None
    purpose: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    destination: Optional[str] = None
    travelers: Optional[List[str]] = None
    estimated_amount: Optional[float] = 0
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    form_data: Optional[Dict[str, Any]] = None


class TravelApplicationCreate(TravelApplicationBase):
    pass


class TravelApplicationResponse(TravelApplicationBase):
    id: int
    reimbursement_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentFlowBase(BaseModel):
    transaction_no: str
    pay_time: Optional[datetime] = None
    pay_amount: float
    payer: Optional[str] = None
    payee: Optional[str] = None
    payment_method: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    purpose: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class PaymentFlowCreate(PaymentFlowBase):
    pass


class PaymentFlowResponse(PaymentFlowBase):
    id: int
    reimbursement_id: Optional[int] = None
    is_duplicate: bool
    flow_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EvidenceBase(BaseModel):
    evidence_type: EvidenceType
    file_name: str
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    parsed_content: Optional[Dict[str, Any]] = None
    ocr_text: Optional[str] = None


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceResponse(EvidenceBase):
    id: int
    batch_id: Optional[int] = None
    reimbursement_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReimbursementBase(BaseModel):
    reimbursement_no: Optional[str] = None
    applicant_id: Optional[int] = None
    department: Optional[str] = None
    purpose: Optional[str] = None
    total_amount: float = 0
    travel_start_date: Optional[datetime] = None
    travel_end_date: Optional[datetime] = None
    travel_destination: Optional[str] = None
    traveler_names: Optional[List[str]] = None
    idempotency_key: Optional[str] = None


class ReimbursementCreate(ReimbursementBase):
    invoices: Optional[List[InvoiceCreate]] = None
    travel_applications: Optional[List[TravelApplicationCreate]] = None
    payment_flows: Optional[List[PaymentFlowCreate]] = None
    evidences: Optional[List[EvidenceCreate]] = None


class ReimbursementUpdate(BaseModel):
    department: Optional[str] = None
    purpose: Optional[str] = None
    total_amount: Optional[float] = None
    travel_start_date: Optional[datetime] = None
    travel_end_date: Optional[datetime] = None
    travel_destination: Optional[str] = None
    traveler_names: Optional[List[str]] = None


class ReimbursementResponse(ReimbursementBase):
    id: int
    batch_id: Optional[int] = None
    creator_id: Optional[int] = None
    status: ReimbursementStatus
    reject_reason: Optional[str] = None
    second_confirm_note: Optional[str] = None
    sensitive_fields_masked: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    invoices: List[InvoiceResponse] = []
    travel_applications: List[TravelApplicationResponse] = []
    payment_flows: List[PaymentFlowResponse] = []
    evidences: List[EvidenceResponse] = []

    class Config:
        from_attributes = True


class ReimbursementListResponse(BaseModel):
    items: List[ReimbursementResponse]
    total: int
    page: int
    page_size: int


class AuditLogBase(BaseModel):
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = None


class AuditLogResponse(AuditLogBase):
    id: int
    reimbursement_id: Optional[int] = None
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StatusChangeRequest(BaseModel):
    status: ReimbursementStatus
    reason: Optional[str] = None
    change_reason: str


class BatchImportRequest(BaseModel):
    batch_name: str
    batch_description: Optional[str] = None
    strategy: BatchStrategy = BatchStrategy.APPEND
    reimbursements: List[ReimbursementCreate]


class BatchImportResponse(BaseModel):
    batch_id: int
    batch_number: str
    total_items: int
    created_count: int
    updated_count: int
    ignored_count: int
    failed_count: int
    failed_items: List[Dict[str, Any]]


class AsyncTaskResponse(BaseModel):
    task_id: str
    task_type: str
    status: TaskStatus
    batch_id: Optional[int] = None
    retry_count: int
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleViewReport(BaseModel):
    role: str
    total_reimbursements: int
    draft_count: int
    submitted_count: int
    approved_count: int
    rejected_count: int
    total_amount: float
    pending_review_count: int


class ChangeReasonStats(BaseModel):
    reason: str
    count: int
    total_amount: float


class SensitiveFieldReport(BaseModel):
    field_name: str
    access_count: int
    roles_accessed: List[str]
    last_accessed: Optional[datetime] = None


class FinanceDashboardResponse(BaseModel):
    role_views: List[RoleViewReport]
    top_change_reasons: List[ChangeReasonStats]
    sensitive_field_stats: List[SensitiveFieldReport]
    pending_second_confirm: int
    duplicate_invoices: int
    duplicate_payments: int


class ExportRequest(BaseModel):
    format: str = "xlsx"
    include_sensitive: bool = False
    status_filter: Optional[List[ReimbursementStatus]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    department_filter: Optional[List[str]] = None
