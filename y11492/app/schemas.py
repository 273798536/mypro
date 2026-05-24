from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

from app.models import TaskStatus, ConflictStrategy, AttachmentType

def generate_batch_id() -> str:
    return f"BATCH-{uuid.uuid4().hex[:12].upper()}"

class AttachmentFile(BaseModel):
    file_name: str
    file_url: str
    file_size: int
    file_hash: Optional[str] = None
    version: Optional[str] = None
    page_count: Optional[int] = None
    upload_time: Optional[datetime] = None

class TaskSubmitRequest(BaseModel):
    tender_no: str = Field(..., description="投标编号")
    project_name: str = Field(..., description="项目名称")
    qualification_file: Optional[AttachmentFile] = None
    quotation_version: Optional[AttachmentFile] = None
    sealed_scan_file: Optional[AttachmentFile] = None
    confirmation_file: Optional[AttachmentFile] = None
    submitter: str = Field(..., description="提交人")
    conflict_strategy: ConflictStrategy = Field(default=ConflictStrategy.APPEND, description="冲突处理策略")
    max_retry_times: int = Field(default=3, ge=1, le=10, description="最大重试次数")
    remark: Optional[str] = None

class TaskSubmitResponse(BaseModel):
    task_id: int
    batch_id: str
    status: TaskStatus
    message: str

class TaskResponse(BaseModel):
    id: int
    batch_id: str
    tender_no: str
    project_name: str
    qualification_file: Optional[Dict[str, Any]] = None
    quotation_version: Optional[Dict[str, Any]] = None
    sealed_scan_file: Optional[Dict[str, Any]] = None
    confirmation_file: Optional[Dict[str, Any]] = None
    status: TaskStatus
    retry_count: int
    max_retry_times: int
    submitter: str
    submit_time: datetime
    last_process_time: Optional[datetime] = None
    next_retry_time: Optional[datetime] = None
    error_message: Optional[str] = None
    is_frozen: bool
    frozen_by: Optional[str] = None
    frozen_time: Optional[datetime] = None
    manual_handler: Optional[str] = None
    conflict_strategy: ConflictStrategy
    parent_task_id: Optional[int] = None

    class Config:
        from_attributes = True

class TaskDetailResponse(TaskResponse):
    histories: List["TaskHistoryResponse"] = []

class TaskHistoryResponse(BaseModel):
    id: int
    task_id: int
    batch_id: str
    operation_type: str
    operation_detail: Optional[Dict[str, Any]] = None
    operator: str
    operate_time: datetime
    before_status: Optional[TaskStatus] = None
    after_status: Optional[TaskStatus] = None
    changed_fields: Optional[List[str]] = None
    remark: Optional[str] = None

    class Config:
        from_attributes = True

class TaskListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TaskResponse]

class DeadLetterTaskResponse(BaseModel):
    id: int
    task_id: int
    batch_id: str
    fail_count: int
    last_error: Optional[str] = None
    first_fail_time: datetime
    last_fail_time: datetime
    retry_classification: Optional[str] = None
    is_recoverable: bool
    recover_remark: Optional[str] = None
    handled: bool
    handled_by: Optional[str] = None
    handled_time: Optional[datetime] = None
    task_detail: Optional[TaskResponse] = None

    class Config:
        from_attributes = True

class DeadLetterListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[DeadLetterTaskResponse]

class ManualHandleRequest(BaseModel):
    handler: str = Field(..., description="处理人")
    new_status: TaskStatus = Field(..., description="改判后的状态")
    remark: str = Field(..., description="处理说明")

class RetryRequest(BaseModel):
    operator: str = Field(..., description="操作人")
    remark: Optional[str] = None

class CancelRequest(BaseModel):
    operator: str = Field(..., description="操作人")
    reason: str = Field(..., description="取消原因")

class FreezeRequest(BaseModel):
    operator: str = Field(..., description="操作人")
    reason: str = Field(..., description="冻结原因")

class CloseRequest(BaseModel):
    operator: str = Field(..., description="操作人")
    reason: str = Field(..., description="关闭原因")

class StatisticsResponse(BaseModel):
    total_tasks: int
    pending_tasks: int
    processing_tasks: int
    success_tasks: int
    failed_tasks: int
    retrying_tasks: int
    dead_letter_tasks: int
    manual_tasks: int
    frozen_tasks: int
    closed_tasks: int
    today_submitted: int
    today_completed: int
    recoverable_dead_letter: int
    unrecoverable_dead_letter: int

TaskDetailResponse.model_rebuild()
