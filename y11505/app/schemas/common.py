from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

from app.core.constants import DuplicateStrategy, TaskStatus, OperationType


class BatchDataImport(BaseModel):
    record_no: Optional[str] = None
    device_code: str
    device_name: str
    data: dict


class BatchImportRequest(BaseModel):
    batch_no: str
    batch_name: str
    department: str
    operator: str
    description: Optional[str] = None
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE
    inspection_records: List[dict] = Field(default_factory=list)
    calibration_certificates: List[dict] = Field(default_factory=list)
    repair_quotes: List[dict] = Field(default_factory=list)
    price_adjustments: List[dict] = Field(default_factory=list)


class OperationResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    operation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class TaskResponse(BaseModel):
    task_id: str
    task_name: str
    status: TaskStatus
    message: Optional[str] = None
    progress: Optional[int] = None
    result: Optional[Any] = None
    created_at: datetime


class StatusChangeRequest(BaseModel):
    target_status: str
    operator: str
    reason: Optional[str] = None


class ReviewRequest(BaseModel):
    operator: str
    opinion: str
    reason: Optional[str] = None
    revised_status: Optional[str] = None


class FreezeRequest(BaseModel):
    operator: str
    reason: str


class SettleRequest(BaseModel):
    operator: str
    reason: Optional[str] = None


class ManualRepairRequest(BaseModel):
    operator: str
    reason: str
    new_status: Optional[str] = None
    revised_data: Optional[dict] = None


class AuditLogResponse(BaseModel):
    id: str
    operation_type: OperationType
    operator: str
    operation_time: datetime
    change_reason: Optional[str] = None
    before_data: Optional[dict] = None
    after_data: Optional[dict] = None


class BatchStatusHistoryResponse(BaseModel):
    id: str
    record_type: str
    from_status: Optional[str]
    to_status: str
    change_reason: Optional[str]
    operator: str
    change_time: datetime
    
    class Config:
        from_attributes = True
