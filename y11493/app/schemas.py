from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .models import DocumentType, TaskStatus, OperationType


class DocumentBase(BaseModel):
    document_no: str
    title: str
    document_type: DocumentType
    status: Optional[str] = "draft"
    created_by: Optional[str] = None


class DocumentCreate(DocumentBase):
    content: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = "初始创建"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    change_reason: str
    updated_by: str


class DocumentResponse(DocumentBase):
    id: int
    current_version: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    latest_note: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version: int
    version_name: Optional[str] = None
    content_snapshot: Optional[Dict[str, Any]] = None
    diff_from_previous: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None
    created_at: datetime
    change_reason: Optional[str] = None

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: int
    document_id: int
    version_id: Optional[int] = None
    file_name: str
    file_path: str
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    page_count: Optional[int] = None
    description: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ImportRecordResponse(BaseModel):
    id: int
    document_id: Optional[int] = None
    batch_no: str
    source_file: str
    source_file_hash: Optional[str] = None
    source_row_number: Optional[int] = None
    original_value: Optional[str] = None
    original_data: Optional[Dict[str, Any]] = None
    standard_value: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    status: str
    is_duplicate: bool
    override_note: Optional[str] = None
    override_by: Optional[str] = None
    imported_by: Optional[str] = None
    imported_at: datetime

    class Config:
        from_attributes = True


class AsyncTaskResponse(BaseModel):
    id: int
    task_id: str
    task_type: str
    status: TaskStatus
    retry_count: int
    max_retry: int
    input_data: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    manual_note: Optional[str] = None
    handled_by: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    related_document_id: Optional[int] = None
    related_batch_no: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    operation_type: OperationType
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    entity_no: Optional[str] = None
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    operator: Optional[str] = None
    operated_at: datetime
    ip_address: Optional[str] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True


class ReconciliationResponse(BaseModel):
    id: int
    reconcile_no: str
    left_document_id: Optional[int] = None
    right_document_id: Optional[int] = None
    left_version: Optional[int] = None
    right_version: Optional[int] = None
    diff_result: Optional[Dict[str, Any]] = None
    is_consistent: bool
    reconciled_by: Optional[str] = None
    reconciled_at: datetime
    note: Optional[str] = None

    class Config:
        from_attributes = True


class ExportResponse(BaseModel):
    id: int
    export_no: str
    export_type: Optional[str] = None
    file_path: str
    file_name: str
    file_hash: Optional[str] = None
    filter_params: Optional[Dict[str, Any]] = None
    record_count: Optional[int] = None
    exported_by: Optional[str] = None
    exported_at: datetime

    class Config:
        from_attributes = True


class ImportRequest(BaseModel):
    document_type: DocumentType
    batch_no: Optional[str] = None
    imported_by: str
    is_supplement: bool = False


class ReplaceAttachmentRequest(BaseModel):
    attachment_id: int
    change_reason: str
    replaced_by: str


class ReconcileRequest(BaseModel):
    left_document_id: int
    right_document_id: int
    left_version: Optional[int] = None
    right_version: Optional[int] = None
    reconciled_by: str


class ExportRequest(BaseModel):
    export_type: str = "all"
    document_type: Optional[DocumentType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    exported_by: str


class TaskManualHandleRequest(BaseModel):
    manual_note: str
    handled_by: str
    new_status: Optional[TaskStatus] = None


class GenerateTestDataRequest(BaseModel):
    document_count: int = 5
    attachment_count: int = 3
    with_tasks: bool = True
    generated_by: str
