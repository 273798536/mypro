from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class NodeStatus(str, Enum):
    NOT_STARTED = "未开始"
    IN_PROGRESS = "进行中"
    COMPLETED = "已完成"
    WITHDRAWN = "已撤回"


class InvoiceStatus(str, Enum):
    NORMAL = "正常"
    RED_FLUSHED = "已红冲"
    REVERSED = "已回滚"


class DisbursementStatus(str, Enum):
    PENDING = "待拨付"
    APPROVED = "已批准"
    PAID = "已拨付"
    REJECTED = "已拒绝"
    ROLLED_BACK = "已回滚"


class ProjectNode(BaseModel):
    node_id: str
    node_name: str
    project_id: str
    project_name: str
    completed_amount: float = 0.0
    total_amount: float = 0.0
    status: NodeStatus = NodeStatus.NOT_STARTED
    completion_date: Optional[datetime] = None
    version: int = 1
    is_withdrawn: bool = False
    withdrawn_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Invoice(BaseModel):
    invoice_id: str
    invoice_no: str
    project_id: str
    project_name: str
    node_id: str
    amount: float
    invoice_date: datetime
    status: InvoiceStatus = InvoiceStatus.NORMAL
    is_red_flushed: bool = False
    red_flush_reason: Optional[str] = None
    original_invoice_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class SupervisionAccount(BaseModel):
    account_id: str
    account_no: str
    project_id: str
    project_name: str
    bank_name: str
    total_fund: float = 0.0
    used_fund: float = 0.0
    balance: float = 0.0
    supervision_ratio: float = 0.0
    ratio_version: str = "v1.0"
    ratio_effective_date: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class DisbursementItem(BaseModel):
    item_id: str
    node_id: str
    node_name: str
    invoice_id: str
    invoice_amount: float
    node_completed_amount: float
    applicable_ratio: float
    request_amount: float
    approved_amount: float = 0.0


class DisbursementRecord(BaseModel):
    disbursement_id: str
    project_id: str
    project_name: str
    account_id: str
    items: List[DisbursementItem]
    total_request_amount: float = 0.0
    total_approved_amount: float = 0.0
    status: DisbursementStatus = DisbursementStatus.PENDING
    run_batch_no: str
    run_timestamp: datetime = Field(default_factory=datetime.now)
    previous_disbursement_id: Optional[str] = None
    is_modified: bool = False
    modification_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: str = "system"


class RunResult(BaseModel):
    run_id: str
    run_timestamp: datetime = Field(default_factory=datetime.now)
    input_path: str
    output_path: str
    project_ids: List[str]
    disbursement_count: int
    total_amount: float
    status: str = "completed"
    notes: Optional[str] = None


class ChangeDetail(BaseModel):
    field_name: str
    old_value: str
    new_value: str
    change_type: str
    reason: Optional[str] = None


class ComparisonResult(BaseModel):
    disbursement_id: str
    has_changes: bool
    changes: List[ChangeDetail]
