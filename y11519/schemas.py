from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import MaterialStatus, DataSource, SyncStrategy, TaskStatus, Role


class MaterialLedgerBase(BaseModel):
    batch_no: Optional[str] = None
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    source: Optional[DataSource] = None
    work_order_no: Optional[str] = None
    site_name: Optional[str] = None
    is_negative_inventory: Optional[bool] = False
    repair_time: Optional[datetime] = None
    photo_urls: Optional[List[str]] = Field(default_factory=list)
    sms_content: Optional[str] = None
    remark: Optional[str] = None
    sensitive_fields: Optional[Dict[str, bool]] = Field(default_factory=dict)


class MaterialLedgerCreate(MaterialLedgerBase):
    created_by: str
    operator: str


class MaterialLedgerUpdate(MaterialLedgerBase):
    operator: str
    change_reason: str


class MaterialLedgerResponse(MaterialLedgerBase):
    id: int
    status: MaterialStatus
    operator: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StatusTransition(BaseModel):
    ledger_id: int
    to_status: MaterialStatus
    operator: str
    role: Role
    reason: str


class StatusHistoryResponse(BaseModel):
    id: int
    ledger_id: int
    from_status: Optional[str] = None
    to_status: str
    operator: str
    operate_time: datetime
    reason: str
    role: str

    class Config:
        from_attributes = True


class ChangeHistoryResponse(BaseModel):
    id: int
    ledger_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    operator: str
    operate_time: datetime
    change_reason: str

    class Config:
        from_attributes = True


class SyncBatchRequest(BaseModel):
    batch_no: str
    materials: List[MaterialLedgerCreate]
    sync_strategy: SyncStrategy = SyncStrategy.APPEND
    operator: str


class SyncResult(BaseModel):
    batch_no: str
    strategy: str
    created: int = 0
    updated: int = 0
    ignored: int = 0
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class AsyncTaskCreate(BaseModel):
    task_name: str
    task_type: str
    batch_no: Optional[str] = None
    sync_strategy: Optional[SyncStrategy] = None
    payload: Optional[Dict[str, Any]] = None
    max_retries: int = 3


class AsyncTaskResponse(BaseModel):
    id: int
    task_name: str
    task_type: str
    batch_no: Optional[str] = None
    status: TaskStatus
    sync_strategy: Optional[str] = None
    retry_count: int
    max_retries: int
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserRoleCreate(BaseModel):
    username: str
    role: Role
    site_name: Optional[str] = None
    permissions: Optional[List[str]] = Field(default_factory=list)


class UserRoleResponse(BaseModel):
    id: int
    username: str
    role: Role
    site_name: Optional[str] = None
    permissions: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ExportRequest(BaseModel):
    ledger_ids: Optional[List[int]] = None
    batch_no: Optional[str] = None
    desensitize: bool = True
    operator: str


class RoleViewRequest(BaseModel):
    role: Role
    site_name: Optional[str] = None
    username: str
