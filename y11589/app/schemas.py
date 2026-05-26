from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum
from .models import ContractStatus, ChangeType, RoleType, SourceFileType, ImportStatus


class ContractBase(BaseModel):
    contract_no: str
    contract_name: str
    party_a: Optional[str] = None
    party_b: Optional[str] = None
    total_amount: Optional[float] = None
    sign_date: Optional[datetime] = None
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    remarks: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class ContractCreate(ContractBase):
    created_by: str
    created_by_role: RoleType


class ContractUpdate(BaseModel):
    contract_name: Optional[str] = None
    party_a: Optional[str] = None
    party_b: Optional[str] = None
    total_amount: Optional[float] = None
    sign_date: Optional[datetime] = None
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    remarks: Optional[str] = None
    updated_by: str
    updated_by_role: RoleType


class ContractResponse(ContractBase):
    id: int
    status: ContractStatus
    current_version: int
    is_frozen: bool
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentNodeBase(BaseModel):
    node_name: str
    node_no: Optional[str] = None
    planned_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    planned_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    milestone: Optional[str] = None
    is_completed: bool = False
    is_disputed: bool = False
    dispute_reason: Optional[str] = None
    remarks: Optional[str] = None


class PaymentNodeCreate(PaymentNodeBase):
    contract_id: int
    original_line_no: Optional[int] = None
    original_value: Optional[Dict[str, Any]] = None


class PaymentNodeUpdate(BaseModel):
    node_name: Optional[str] = None
    node_no: Optional[str] = None
    planned_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    planned_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    milestone: Optional[str] = None
    is_completed: Optional[bool] = None
    is_disputed: Optional[bool] = None
    dispute_reason: Optional[str] = None
    remarks: Optional[str] = None
    updated_by: str
    updated_by_role: RoleType
    change_reason: str


class PaymentNodeResponse(PaymentNodeBase):
    id: int
    contract_id: int
    version: int
    is_latest: bool
    created_at: datetime
    updated_at: datetime
    source_file_id: Optional[int] = None
    original_line_no: Optional[int] = None
    original_value: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AcceptanceEmailBase(BaseModel):
    email_subject: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    send_date: Optional[datetime] = None
    email_content: Optional[str] = None
    acceptance_result: Optional[str] = None
    acceptance_date: Optional[datetime] = None
    remarks: Optional[str] = None
    attachments: Optional[List[str]] = None


class AcceptanceEmailCreate(AcceptanceEmailBase):
    contract_id: int
    original_line_no: Optional[int] = None
    original_value: Optional[Dict[str, Any]] = None


class AcceptanceEmailResponse(AcceptanceEmailBase):
    id: int
    contract_id: int
    is_verified: bool
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    version: int
    created_at: datetime
    updated_at: datetime
    source_file_id: Optional[int] = None
    original_line_no: Optional[int] = None
    original_value: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class SupplementalAgreementBase(BaseModel):
    agreement_no: Optional[str] = None
    agreement_name: Optional[str] = None
    sign_date: Optional[datetime] = None
    effective_date: Optional[datetime] = None
    change_summary: Optional[str] = None
    original_content: Optional[str] = None
    new_content: Optional[str] = None
    remarks: Optional[str] = None


class SupplementalAgreementCreate(SupplementalAgreementBase):
    contract_id: int
    original_line_no: Optional[int] = None
    original_value: Optional[Dict[str, Any]] = None


class SupplementalAgreementResponse(SupplementalAgreementBase):
    id: int
    contract_id: int
    is_applied: bool
    applied_at: Optional[datetime] = None
    applied_by: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime
    source_file_id: Optional[int] = None
    original_line_no: Optional[int] = None
    original_value: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ImportSourceResponse(BaseModel):
    id: int
    contract_id: Optional[int] = None
    file_name: str
    file_type: SourceFileType
    file_path: str
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    upload_time: datetime
    upload_by: Optional[str] = None
    import_status: ImportStatus
    import_error: Optional[str] = None
    parsed_count: int
    success_count: int
    failed_count: int
    parse_result: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ChangeRecordResponse(BaseModel):
    id: int
    contract_id: int
    payment_node_id: Optional[int] = None
    change_type: ChangeType
    change_reason: Optional[str] = None
    field_name: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    changed_by: Optional[str] = None
    changed_by_role: Optional[RoleType] = None
    changed_at: datetime
    is_manual_revision: bool
    revision_remark: Optional[str] = None
    version_before: Optional[int] = None
    version_after: Optional[int] = None
    source_evidence: Optional[Dict[str, Any]] = None
    audit_status: str
    audit_by: Optional[str] = None
    audit_at: Optional[datetime] = None
    audit_remark: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    contract_id: Optional[int] = None
    action: str
    action_detail: Optional[str] = None
    operator: Optional[str] = None
    operator_role: Optional[RoleType] = None
    operate_time: datetime
    ip_address: Optional[str] = None
    is_readonly_access: bool

    class Config:
        from_attributes = True


class ManualJudgmentCreate(BaseModel):
    contract_id: int
    target_type: str
    target_id: int
    judgment_type: str
    judgment_reason: str
    judgment_result: Dict[str, Any]
    judged_by: str
    judged_by_role: RoleType
    original_evidence: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None


class ManualJudgmentResponse(BaseModel):
    id: int
    contract_id: int
    target_type: str
    target_id: int
    judgment_type: str
    judgment_reason: str
    judgment_result: Dict[str, Any]
    judged_by: str
    judged_by_role: RoleType
    judged_at: datetime
    is_effective: bool
    original_evidence: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True


class StatusTransitionRequest(BaseModel):
    target_status: ContractStatus
    operator: str
    operator_role: RoleType
    reason: Optional[str] = None


class ImportRequest(BaseModel):
    file_type: SourceFileType
    upload_by: str
    contract_no: Optional[str] = None
    contract_name: Optional[str] = None
    force_import: bool = False


class FreezeRequest(BaseModel):
    frozen_by: str
    frozen_by_role: RoleType
    reason: str


class ExportRequest(BaseModel):
    export_type: str = "contracts"
    contract_ids: Optional[List[int]] = None
    mask_sensitive: bool = True
    export_by: str
    export_by_role: RoleType
    remark: Optional[str] = None


class ExportResponse(BaseModel):
    success: bool
    file_name: str
    file_path: str
    record_count: int
    export_time: datetime


class RoleViewResponse(BaseModel):
    role: RoleType
    pending_count: int
    total_count: int
    disputed_count: int
    recent_changes: List[ChangeRecordResponse]


class ChangeAnalysisResponse(BaseModel):
    contract_id: int
    contract_no: str
    contract_name: str
    total_changes: int
    change_types: Dict[str, int]
    manual_revisions: int
    sensitive_field_changes: List[Dict[str, Any]]
    version_history: List[Dict[str, Any]]


class DeadLetterStatus(str, enum.Enum):
    PENDING = "待重试"
    RETRYING = "重试中"
    RESOLVED = "已解决"
    FAILED = "最终失败"


class DeadLetterResponse(BaseModel):
    id: int
    import_source_id: int
    source_type: str
    source_data: Dict[str, Any]
    original_line_no: Optional[int] = None
    error_message: str
    error_type: str
    stack_trace: Optional[str] = None
    status: DeadLetterStatus
    retry_count: int
    max_retry: int
    last_retry_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    extra_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class DeadLetterRetryResponse(BaseModel):
    success: bool
    message: str
    dead_letter: Optional[DeadLetterResponse] = None


class ImportResponse(BaseModel):
    success: bool
    import_source_id: int
    status: ImportStatus
    message: str
    is_duplicate: bool = False
    parsed_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    dead_letter_count: int = 0
    errors: Optional[List[str]] = None
    parse_metadata: Optional[Dict[str, Any]] = None
