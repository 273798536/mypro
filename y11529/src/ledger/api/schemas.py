from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

from ..models import (
    RecordStatus, RecordType, NodeType, TaxNoticeType,
    ChangeReason, Role, ActionType
)


class RecordCreateRequest(BaseModel):
    record_type: RecordType
    tracking_no: str
    package_no: Optional[str] = None
    customs_no: Optional[str] = None
    created_by: str
    created_by_role: Role

    declaration_no: Optional[str] = None
    hs_code: Optional[str] = None
    goods_description: Optional[str] = None
    quantity: float = 0
    unit: Optional[str] = None
    declared_value: float = 0
    currency: str = "CNY"
    weight: float = 0
    origin_country: Optional[str] = None
    destination_country: Optional[str] = None
    tax_amount: float = 0
    duty_amount: float = 0
    vat_amount: float = 0
    is_exception: bool = False
    exception_note: Optional[str] = None
    exception_owner: Optional[str] = None

    notice_no: Optional[str] = None
    original_tax: float = 0
    supplementary_tax: float = 0
    late_fee: float = 0
    total_tax: float = 0
    payer: Optional[str] = None

    node_type: Optional[NodeType] = None
    node_location: Optional[str] = None
    operator: Optional[str] = None
    node_note: Optional[str] = None


class RecordUpdateRequest(BaseModel):
    updated_by: str
    updated_by_role: Role
    change_reason: Optional[ChangeReason] = None
    change_reason_note: Optional[str] = None

    tracking_no: Optional[str] = None
    package_no: Optional[str] = None
    customs_no: Optional[str] = None

    hs_code: Optional[str] = None
    goods_description: Optional[str] = None
    quantity: Optional[float] = None
    declared_value: Optional[float] = None
    tax_amount: Optional[float] = None
    duty_amount: Optional[float] = None
    vat_amount: Optional[float] = None
    is_exception: Optional[bool] = None
    exception_note: Optional[str] = None
    exception_owner: Optional[str] = None


class RecordActionRequest(BaseModel):
    action_by: str
    action_by_role: Role
    note: Optional[str] = None


class RecordResponse(BaseModel):
    id: int
    record_no: str
    version: int
    record_type: RecordType
    status: RecordStatus
    is_frozen: bool
    tracking_no: Optional[str] = None
    package_no: Optional[str] = None
    customs_no: Optional[str] = None
    current_handler: Optional[str] = None
    final_handler: Optional[str] = None
    change_reason: Optional[ChangeReason] = None
    change_reason_note: Optional[str] = None
    import_source_id: Optional[int] = None
    import_row_number: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    action: ActionType
    action_by: str
    action_by_role: Optional[Role] = None
    action_note: Optional[str] = None
    version_before: Optional[int] = None
    version_after: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VersionDiffResponse(BaseModel):
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    is_sensitive: bool = False

    class Config:
        from_attributes = True


class ImportResponse(BaseModel):
    import_source_id: int
    filename: str
    total_rows: int
    success_count: int
    failed_count: int
    errors: List[Dict[str, Any]]
    created_record_nos: List[str]


class ExportResponse(BaseModel):
    total_records: int
    file_format: str
    desensitized: bool
    role: Optional[Role] = None
    download_url: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[Dict[str, Any]] = None
