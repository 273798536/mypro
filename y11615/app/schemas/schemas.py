from datetime import date, datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field

from app.models.models import ImportStrategy, DataSourceType, AlertType, AgingBucket


class ImportStrategy(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class CustomerBase(BaseModel):
    customer_code: str
    customer_name: str
    industry: Optional[str] = None
    region: Optional[str] = None
    credit_rating: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class Customer(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractBase(BaseModel):
    contract_no: str
    customer_id: int
    contract_amount: float
    contract_date: date
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    payment_terms: Optional[str] = None
    credit_days: int = 30
    status: str = "active"
    remarks: Optional[str] = None


class ContractCreate(ContractBase):
    pass


class Contract(ContractBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    invoice_no: str
    customer_id: int
    contract_id: Optional[int] = None
    invoice_date: date
    due_date: date
    invoice_amount: float
    tax_amount: float = 0
    total_amount: float
    currency: str = "CNY"
    status: str = "unpaid"
    promise_date: Optional[date] = None
    remarks: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class Invoice(InvoiceBase):
    id: int
    paid_amount: float
    remaining_amount: float
    aging_bucket: AgingBucket
    overdue_days: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReceiptBase(BaseModel):
    receipt_no: str
    customer_id: int
    receipt_date: date
    receipt_amount: float
    currency: str = "CNY"
    payment_method: Optional[str] = None
    bank_account: Optional[str] = None
    remarks: Optional[str] = None


class ReceiptCreate(ReceiptBase):
    pass


class Receipt(ReceiptBase):
    id: int
    matched_amount: float
    unmatched_amount: float
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReceiptMatchBase(BaseModel):
    receipt_id: int
    invoice_id: int
    match_amount: float
    match_date: date
    is_manual: bool = False
    remarks: Optional[str] = None


class ReceiptMatchCreate(ReceiptMatchBase):
    pass


class ReceiptMatch(ReceiptMatchBase):
    id: int
    is_corrected: bool
    corrected_from_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CollectionRecordBase(BaseModel):
    customer_id: int
    invoice_id: Optional[int] = None
    contact_date: date
    collector: Optional[str] = None
    contact_method: Optional[str] = None
    contact_person: Optional[str] = None
    promise_date: Optional[date] = None
    promise_amount: Optional[float] = None
    next_action_date: Optional[date] = None
    next_action: Optional[str] = None
    status: str = "in_progress"
    notes: Optional[str] = None


class CollectionRecordCreate(CollectionRecordBase):
    pass


class CollectionRecord(CollectionRecordBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CreditLimitBase(BaseModel):
    customer_id: int
    credit_limit: float
    effective_date: date
    expiry_date: Optional[date] = None
    approved_by: Optional[str] = None
    remarks: Optional[str] = None


class CreditLimitCreate(CreditLimitBase):
    pass


class CreditLimit(CreditLimitBase):
    id: int
    used_credit: float
    available_credit: float
    is_frozen: bool
    frozen_reason: Optional[str] = None
    frozen_date: Optional[date] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DataSourceBase(BaseModel):
    source_type: DataSourceType
    file_name: Optional[str] = None
    import_strategy: ImportStrategy
    imported_by: Optional[str] = None
    remarks: Optional[str] = None


class DataSourceCreate(DataSourceBase):
    pass


class DataSource(DataSourceBase):
    id: int
    import_date: datetime
    record_count: int
    batch_no: Optional[str] = None

    class Config:
        from_attributes = True


class AlertBase(BaseModel):
    alert_type: AlertType
    customer_id: Optional[int] = None
    invoice_id: Optional[int] = None
    receipt_id: Optional[int] = None
    message: str


class AlertCreate(AlertBase):
    pass


class Alert(AlertBase):
    id: int
    is_resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    source_type: DataSourceType
    strategy: ImportStrategy
    total_records: int
    created: int
    updated: int
    skipped: int
    batch_no: str
    source_id: int


class AgingBucketSummary(BaseModel):
    bucket: AgingBucket
    amount: float
    invoice_count: int
    percentage: float


class CustomerOverdueSummary(BaseModel):
    customer_id: int
    customer_code: str
    customer_name: str
    total_invoice_amount: float
    total_paid_amount: float
    total_remaining: float
    current_amount: float
    overdue_amount: float
    aging_buckets: List[AgingBucketSummary]
    alerts: List[Alert]
    last_collection_date: Optional[date] = None
    credit_limit: Optional[float] = None
    credit_used: Optional[float] = None
    is_credit_frozen: bool = False


class RollingReport(BaseModel):
    report_date: date
    total_customers: int
    total_invoice_amount: float
    total_paid_amount: float
    total_remaining: float
    current_amount: float
    total_overdue: float
    aging_summary: List[AgingBucketSummary]
    customer_details: List[CustomerOverdueSummary]
    alerts: List[Alert]


class MatchingCorrection(BaseModel):
    old_match_id: int
    new_invoice_id: int
    new_match_amount: float
    reason: str
    corrected_by: Optional[str] = None
