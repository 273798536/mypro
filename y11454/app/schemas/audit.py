from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.audit import AuditAction


class AuditLogResponse(BaseModel):
    id: int
    ledger_id: int
    user_id: int
    username: str
    user_role: str
    action: AuditAction
    previous_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = None
    field_changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiffResponse(BaseModel):
    field: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


class AuditLogWithDiff(AuditLogResponse):
    diffs: List[DiffResponse] = []


class AuditLogListResponse(BaseModel):
    total: int
    items: List[AuditLogWithDiff]


class AttachmentBase(BaseModel):
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    description: Optional[str] = None


class AttachmentCreate(AttachmentBase):
    ledger_id: int


class AttachmentResponse(AttachmentBase):
    id: int
    ledger_id: int
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True
