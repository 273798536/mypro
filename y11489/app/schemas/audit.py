from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any, Dict


class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChangeHistoryResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    version: int
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    is_sensitive_field: int = 0
    is_manual_change: int = 0
    change_reason: Optional[str] = None
    changed_by: Optional[int] = None
    changer_name: Optional[str] = None
    changed_at: datetime
    status_before: Optional[str] = None
    status_after: Optional[str] = None

    class Config:
        from_attributes = True
