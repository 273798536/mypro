from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models.base import BatchStatus, DuplicateStrategy, OperationType, TaskStatus


class PaymentNodeBase(BaseModel):
    node_name: str
    node_type: str
    payment_ratio: float
    payment_amount: float
    due_date: datetime
    status: str = "pending"


class PaymentNodeCreate(PaymentNodeBase):
    pass


class PaymentNode(PaymentNodeBase):
    id: int
    contract_id: int
    is_modified: bool
    modified_from_version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AcceptanceEmailBase(BaseModel):
    email_subject: str
    email_from: str
    email_to: str
    email_date: datetime
    acceptance_result: str
    acceptance_amount: float
    content: Optional[str] = None


class AcceptanceEmailCreate(AcceptanceEmailBase):
    pass


class AcceptanceEmail(AcceptanceEmailBase):
    id: int
    contract_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PriceChangeBase(BaseModel):
    original_price: float
    new_price: float
    change_reason: str
    approved_by: str
    approved_date: datetime
    effective_date: datetime
    is_manual: bool = True


class PriceChangeCreate(PriceChangeBase):
    pass


class PriceChange(PriceChangeBase):
    id: int
    contract_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ContractBase(BaseModel):
    contract_no: str
    contract_name: str
    party_a: Optional[str] = None
    party_b: Optional[str] = None
    sign_date: Optional[datetime] = None
    effective_date: Optional[datetime] = None
    expire_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    is_supplement: bool = False
    parent_contract_id: Optional[int] = None
    metadata_: Optional[Dict[str, Any]] = None


class ContractCreate(ContractBase):
    payment_nodes: List[PaymentNodeCreate] = []
    acceptance_emails: List[AcceptanceEmailCreate] = []
    price_changes: List[PriceChangeCreate] = []


class ContractUpdate(BaseModel):
    contract_name: Optional[str] = None
    party_a: Optional[str] = None
    party_b: Optional[str] = None
    total_amount: Optional[float] = None
    metadata_: Optional[Dict[str, Any]] = None


class Contract(ContractBase):
    id: int
    batch_id: int
    version: int
    is_frozen: bool
    frozen_at: Optional[datetime] = None
    frozen_reason: Optional[str] = None
    frozen_by: Optional[str] = None
    is_archived: bool
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    payment_nodes: List[PaymentNode] = []
    acceptance_emails: List[AcceptanceEmail] = []
    price_changes: List[PriceChange] = []

    class Config:
        from_attributes = True


class ContractVersion(BaseModel):
    id: int
    contract_id: int
    version: int
    snapshot: Dict[str, Any]
    changed_by: str
    change_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_type: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None


class BatchCreate(BatchBase):
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.APPEND


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[BatchStatus] = None
    metadata_: Optional[Dict[str, Any]] = None


class Batch(BatchBase):
    id: int
    batch_no: str
    status: BatchStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    contracts: List[Contract] = []

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    operation_type: OperationType
    operation_by: str
    change_reason: Optional[str] = None
    comment: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    batch_id: int
    contract_id: Optional[int] = None
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None


class AuditLog(AuditLogBase):
    id: int
    batch_id: int
    contract_id: Optional[int] = None
    operation_at: datetime
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AsyncTaskBase(BaseModel):
    task_type: str
    batch_id: Optional[int] = None
    created_by: str


class AsyncTaskCreate(AsyncTaskBase):
    pass


class AsyncTaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    progress: Optional[int] = None
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    checkpoint: Optional[Dict[str, Any]] = None


class AsyncTask(AsyncTaskBase):
    id: int
    task_id: str
    status: TaskStatus
    progress: int
    retry_count: int
    max_retries: int
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    checkpoint: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class FreezeRequest(BaseModel):
    contract_ids: List[int] = []
    reason: str
    freeze_all: bool = False


class UnfreezeRequest(BaseModel):
    contract_ids: List[int] = []
    reason: str
    unfreeze_all: bool = False


class ReviewRequest(BaseModel):
    contract_ids: List[int] = []
    approved: bool
    reason: Optional[str] = None
    comment: Optional[str] = None


class ArchiveRequest(BaseModel):
    contract_ids: List[int] = []
    reason: str
    archive_all: bool = False


class SupplementRequest(BaseModel):
    contract_no: str
    new_payment_nodes: List[PaymentNodeCreate] = []
    change_reason: str


class BatchImportRequest(BaseModel):
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.APPEND
    created_by: str


class ExportRequest(BaseModel):
    batch_id: Optional[int] = None
    contract_ids: List[int] = []
    include_frozen: bool = True
    include_archived: bool = False
    export_format: str = "excel"


class DiffResponse(BaseModel):
    contract_id: int
    field: str
    before: Any
    after: Any
    changed_by: str
    changed_at: datetime


class SummaryResponse(BaseModel):
    batch_id: int
    batch_name: str
    total_contracts: int
    frozen_contracts: int
    archived_contracts: int
    total_amount: float
    frozen_amount: float
    manual_reasons: List[Dict[str, Any]]


class TaskRetryRequest(BaseModel):
    force: bool = False
