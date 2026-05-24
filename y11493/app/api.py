from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import os
import pandas as pd

from .database import get_db
from .models import (
    Document, DocumentVersion, Attachment, ImportRecord,
    AsyncTask, AuditLog, ReconciliationRecord, ExportRecord,
    DocumentType, TaskStatus, OperationType
)
from .schemas import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentVersionResponse,
    AttachmentResponse, ImportRecordResponse, AsyncTaskResponse,
    AuditLogResponse, ReconciliationResponse, ExportResponse,
    ImportRequest, ReplaceAttachmentRequest, ReconcileRequest,
    ExportRequest, TaskManualHandleRequest, GenerateTestDataRequest
)
from .utils import (
    generate_no, save_upload_file, create_import_records,
    create_document_version, create_async_task, calculate_file_hash,
    deep_diff, log_audit, calculate_content_hash
)
from .task_engine import process_task
from .config import settings

router = APIRouter(prefix=settings.API_V1_STR)


def verify_token(request: Request, required_token: str):
    token = request.headers.get("X-Auth-Token")
    if not token or token != required_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="权限不足或Token无效"
        )


def verify_admin(request: Request):
    verify_token(request, settings.ADMIN_TOKEN)


def verify_read(request: Request):
    token = request.headers.get("X-Auth-Token")
    if not token or token not in [settings.ADMIN_TOKEN, settings.READ_TOKEN]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="权限不足或Token无效"
        )


@router.post("/documents", response_model=DocumentResponse, summary="创建文档")
def create_document(
    request: Request,
    doc: DocumentCreate,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    existing = db.query(Document).filter(Document.document_no == doc.document_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="文档编号已存在")
    
    document = Document(
        document_no=doc.document_no,
        title=doc.title,
        document_type=doc.document_type.value,
        status=doc.status,
        created_by=doc.created_by
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    version = DocumentVersion(
        document_id=document.id,
        version=1,
        version_name="V1",
        content_snapshot=doc.content or {},
        created_by=doc.created_by,
        change_reason=doc.change_reason
    )
    db.add(version)
    db.commit()
    
    log_audit(
        db=db,
        operation_type=OperationType.CREATE,
        entity_type="Document",
        entity_id=document.id,
        entity_no=document.document_no,
        after_state={"title": doc.title, "document_type": doc.document_type.value},
        operator=doc.created_by,
        ip_address=request.client.host if request.client else None,
        note=doc.change_reason
    )
    
    return document


@router.get("/documents", response_model=List[DocumentResponse], summary="获取文档列表")
def list_documents(
    request: Request,
    document_type: Optional[DocumentType] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    query = db.query(Document)
    if document_type:
        query = query.filter(Document.document_type == document_type.value)
    if status:
        query = query.filter(Document.status == status)
    
    return query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/documents/{document_id}", response_model=DocumentResponse, summary="获取文档详情")
def get_document(
    request: Request,
    document_id: int,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    return document


@router.put("/documents/{document_id}", response_model=DocumentResponse, summary="更新文档")
def update_document(
    request: Request,
    document_id: int,
    doc_update: DocumentUpdate,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    before_state = {
        "title": document.title,
        "status": document.status
    }
    
    if doc_update.title:
        document.title = doc_update.title
    if doc_update.status:
        document.status = doc_update.status
    
    if doc_update.content:
        create_document_version(
            db=db,
            document_id=document_id,
            content=doc_update.content,
            change_reason=doc_update.change_reason,
            created_by=doc_update.updated_by
        )
    
    db.commit()
    db.refresh(document)
    
    after_state = {
        "title": document.title,
        "status": document.status
    }
    
    log_audit(
        db=db,
        operation_type=OperationType.UPDATE,
        entity_type="Document",
        entity_id=document.id,
        entity_no=document.document_no,
        before_state=before_state,
        after_state=after_state,
        operator=doc_update.updated_by,
        ip_address=request.client.host if request.client else None,
        note=doc_update.change_reason
    )
    
    return document


@router.get("/documents/{document_id}/versions", response_model=List[DocumentVersionResponse], summary="获取文档版本历史")
def get_document_versions(
    request: Request,
    document_id: int,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    versions = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version.desc()).all()
    return versions


@router.post("/documents/{document_id}/attachments", response_model=AttachmentResponse, summary="上传附件")
async def upload_attachment(
    request: Request,
    document_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = None,
    uploaded_by: str = "system",
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    file_path, file_name, file_size = save_upload_file(file, f"doc_{document_id}")
    file_hash = calculate_file_hash(file_path)
    
    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version.desc()).first()
    
    attachment = Attachment(
        document_id=document_id,
        version_id=latest_version.id if latest_version else None,
        file_name=file_name,
        file_path=file_path,
        file_hash=file_hash,
        file_size=file_size,
        file_type=file.content_type,
        description=description,
        uploaded_by=uploaded_by
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    log_audit(
        db=db,
        operation_type=OperationType.CREATE,
        entity_type="Attachment",
        entity_id=attachment.id,
        entity_no=document.document_no,
        after_state={"file_name": file_name, "file_size": file_size},
        operator=uploaded_by,
        ip_address=request.client.host if request.client else None,
        note=f"上传附件: {file_name}"
    )
    
    return attachment


@router.get("/documents/{document_id}/attachments", response_model=List[AttachmentResponse], summary="获取附件列表")
def get_attachments(
    request: Request,
    document_id: int,
    only_active: bool = True,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    query = db.query(Attachment).filter(Attachment.document_id == document_id)
    if only_active:
        query = query.filter(Attachment.is_active == True)
    
    return query.order_by(Attachment.uploaded_at.desc()).all()


@router.post("/attachments/{attachment_id}/replace", response_model=AttachmentResponse, summary="替换附件")
async def replace_attachment(
    request: Request,
    attachment_id: int,
    file: UploadFile = File(...),
    change_reason: str = "附件更新",
    replaced_by: str = "system",
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    old_attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not old_attachment:
        raise HTTPException(status_code=404, detail="附件不存在")
    
    old_attachment.is_active = False
    
    file_path, file_name, file_size = save_upload_file(file, f"doc_{old_attachment.document_id}")
    file_hash = calculate_file_hash(file_path)
    
    new_attachment = Attachment(
        document_id=old_attachment.document_id,
        version_id=old_attachment.version_id,
        file_name=file_name,
        file_path=file_path,
        file_hash=file_hash,
        file_size=file_size,
        file_type=file.content_type,
        description=f"替换自: {old_attachment.file_name}",
        uploaded_by=replaced_by,
        is_active=True
    )
    db.add(new_attachment)
    db.commit()
    db.refresh(new_attachment)
    
    log_audit(
        db=db,
        operation_type=OperationType.REPLACE,
        entity_type="Attachment",
        entity_id=new_attachment.id,
        entity_no=f"OLD:{old_attachment.id}->NEW:{new_attachment.id}",
        before_state={"file_name": old_attachment.file_name, "file_hash": old_attachment.file_hash},
        after_state={"file_name": file_name, "file_hash": file_hash},
        operator=replaced_by,
        ip_address=request.client.host if request.client else None,
        note=change_reason
    )
    
    return new_attachment


@router.post("/import", summary="导入文件")
async def import_file(
    request: Request,
    file: UploadFile = File(...),
    document_type: DocumentType = DocumentType.QUALIFICATION,
    batch_no: Optional[str] = None,
    imported_by: str = "system",
    is_supplement: bool = False,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    batch_no = batch_no or generate_no("BATCH")
    file_path, file_name, file_size = save_upload_file(file, "imports")
    
    records = create_import_records(
        db=db,
        file_path=file_path,
        file_name=file_name,
        batch_no=batch_no,
        document_type=document_type,
        imported_by=imported_by,
        is_supplement=is_supplement
    )
    
    return {
        "batch_no": batch_no,
        "total_count": len(records),
        "duplicate_count": sum(1 for r in records if r.is_duplicate),
        "records": records
    }


@router.get("/imports", response_model=List[ImportRecordResponse], summary="获取导入记录")
def list_imports(
    request: Request,
    batch_no: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    query = db.query(ImportRecord)
    if batch_no:
        query = query.filter(ImportRecord.batch_no == batch_no)
    if is_duplicate is not None:
        query = query.filter(ImportRecord.is_duplicate == is_duplicate)
    
    return query.order_by(ImportRecord.imported_at.desc()).offset(skip).limit(limit).all()


@router.post("/tasks/{task_type}", response_model=AsyncTaskResponse, summary="创建异步任务")
def create_task(
    request: Request,
    task_type: str,
    input_data: dict,
    max_retry: int = 3,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    task = create_async_task(
        db=db,
        task_type=task_type,
        input_data=input_data,
        max_retry=max_retry
    )
    
    process_task(task.task_id)
    
    return task


@router.get("/tasks", response_model=List[AsyncTaskResponse], summary="获取任务列表")
def list_tasks(
    request: Request,
    status: Optional[TaskStatus] = None,
    task_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    query = db.query(AsyncTask)
    if status:
        query = query.filter(AsyncTask.status == status.value)
    if task_type:
        query = query.filter(AsyncTask.task_type == task_type)
    
    return query.order_by(AsyncTask.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/tasks/{task_id}", response_model=AsyncTaskResponse, summary="获取任务详情")
def get_task(
    request: Request,
    task_id: str,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.post("/tasks/{task_id}/manual-handle", response_model=AsyncTaskResponse, summary="人工处理任务")
def manual_handle_task(
    request: Request,
    task_id: str,
    handle_data: TaskManualHandleRequest,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task.manual_note = handle_data.manual_note
    task.handled_by = handle_data.handled_by
    
    if handle_data.new_status:
        task.status = handle_data.new_status.value
        if handle_data.new_status == TaskStatus.COMPLETED:
            task.completed_at = datetime.now()
        elif handle_data.new_status == TaskStatus.PENDING:
            task.next_retry_at = None
    
    db.commit()
    db.refresh(task)
    
    log_audit(
        db=db,
        operation_type=OperationType.UPDATE,
        entity_type="AsyncTask",
        entity_id=task.id,
        entity_no=task_id,
        after_state={"status": task.status, "manual_note": handle_data.manual_note},
        operator=handle_data.handled_by,
        ip_address=request.client.host if request.client else None,
        note=f"人工处理任务: {handle_data.manual_note}"
    )
    
    return task


@router.post("/reconcile", response_model=ReconciliationResponse, summary="对账对比")
def reconcile(
    request: Request,
    req: ReconcileRequest,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    left_doc = db.query(Document).filter(Document.id == req.left_document_id).first()
    right_doc = db.query(Document).filter(Document.id == req.right_document_id).first()
    
    if not left_doc or not right_doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    left_version = req.left_version or left_doc.current_version
    right_version = req.right_version or right_doc.current_version
    
    left_ver = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == req.left_document_id,
        DocumentVersion.version == left_version
    ).first()
    
    right_ver = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == req.right_document_id,
        DocumentVersion.version == right_version
    ).first()
    
    diff_result = deep_diff(
        left_ver.content_snapshot if left_ver else {},
        right_ver.content_snapshot if right_ver else {}
    )
    
    reconcile_no = generate_no("REC")
    record = ReconciliationRecord(
        reconcile_no=reconcile_no,
        left_document_id=req.left_document_id,
        right_document_id=req.right_document_id,
        left_version=left_version,
        right_version=right_version,
        diff_result=diff_result,
        is_consistent=len(diff_result) == 0,
        reconciled_by=req.reconciled_by,
        note=f"对比 {left_doc.document_no} V{left_version} vs {right_doc.document_no} V{right_version}"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    log_audit(
        db=db,
        operation_type=OperationType.RECONCILE,
        entity_type="Reconciliation",
        entity_id=record.id,
        entity_no=reconcile_no,
        after_state={"is_consistent": record.is_consistent, "diff_count": len(diff_result)},
        operator=req.reconciled_by,
        ip_address=request.client.host if request.client else None,
        note=record.note
    )
    
    return record


@router.get("/reconciliations", response_model=List[ReconciliationResponse], summary="获取对账记录")
def list_reconciliations(
    request: Request,
    is_consistent: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    query = db.query(ReconciliationRecord)
    if is_consistent is not None:
        query = query.filter(ReconciliationRecord.is_consistent == is_consistent)
    
    return query.order_by(ReconciliationRecord.reconciled_at.desc()).offset(skip).limit(limit).all()


@router.post("/export", response_model=ExportResponse, summary="导出数据")
def export_data(
    request: Request,
    req: ExportRequest,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    export_no = generate_no("EXP")
    file_name = f"export_{export_no}.xlsx"
    file_path = settings.EXPORT_DIR / file_name
    
    query = db.query(Document)
    if req.document_type:
        query = query.filter(Document.document_type == req.document_type.value)
    
    docs = query.all()
    
    data = []
    for doc in docs:
        data.append({
            "ID": doc.id,
            "文档编号": doc.document_no,
            "标题": doc.title,
            "类型": doc.document_type,
            "状态": doc.status,
            "当前版本": doc.current_version,
            "创建人": doc.created_by,
            "创建时间": doc.created_at.isoformat() if doc.created_at else None
        })
    
    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False)
    
    file_hash = calculate_file_hash(str(file_path))
    
    export_record = ExportRecord(
        export_no=export_no,
        export_type=req.export_type,
        file_path=str(file_path),
        file_name=file_name,
        file_hash=file_hash,
        filter_params={
            "document_type": req.document_type.value if req.document_type else None,
            "start_date": req.start_date.isoformat() if req.start_date else None,
            "end_date": req.end_date.isoformat() if req.end_date else None
        },
        record_count=len(data),
        exported_by=req.exported_by
    )
    db.add(export_record)
    db.commit()
    db.refresh(export_record)
    
    log_audit(
        db=db,
        operation_type=OperationType.EXPORT,
        entity_type="Export",
        entity_id=export_record.id,
        entity_no=export_no,
        after_state={"record_count": len(data), "file_name": file_name},
        operator=req.exported_by,
        ip_address=request.client.host if request.client else None,
        note=f"导出 {len(data)} 条记录"
    )
    
    return export_record


@router.get("/exports", response_model=List[ExportResponse], summary="获取导出记录")
def list_exports(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    return db.query(ExportRecord).order_by(
        ExportRecord.exported_at.desc()
    ).offset(skip).limit(limit).all()


@router.get("/audit-logs", response_model=List[AuditLogResponse], summary="获取审计日志")
def list_audit_logs(
    request: Request,
    operation_type: Optional[OperationType] = None,
    entity_type: Optional[str] = None,
    entity_no: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    verify_read(request)
    
    query = db.query(AuditLog)
    if operation_type:
        query = query.filter(AuditLog.operation_type == operation_type.value)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_no:
        query = query.filter(AuditLog.entity_no == entity_no)
    
    return query.order_by(AuditLog.operated_at.desc()).offset(skip).limit(limit).all()


@router.post("/test-data/generate", summary="生成测试数据")
def generate_test_data(
    request: Request,
    req: GenerateTestDataRequest,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    created_docs = []
    
    for i in range(req.document_count):
        doc_no = generate_no("TEST")
        document = Document(
            document_no=doc_no,
            title=f"测试文档-{i+1}-{doc_no[:8]}",
            document_type=list(DocumentType)[i % len(DocumentType)].value,
            status="draft",
            created_by=req.generated_by
        )
        db.add(document)
        db.flush()
        
        version = DocumentVersion(
            document_id=document.id,
            version=1,
            version_name="V1",
            content_snapshot={
                "field1": f"value_{i}",
                "field2": i * 100,
                "field3": {"nested": f"nested_value_{i}"}
            },
            created_by=req.generated_by,
            change_reason="测试数据生成"
        )
        db.add(version)
        
        created_docs.append(document)
    
    db.commit()
    
    if req.with_tasks:
        for i in range(3):
            create_async_task(
                db=db,
                task_type="document_process",
                input_data={"test": True, "index": i},
                max_retry=3
            )
        
        create_async_task(
            db=db,
            task_type="simulate_failure",
            input_data={"test_failure": True},
            max_retry=2
        )
    
    log_audit(
        db=db,
        operation_type=OperationType.CREATE,
        entity_type="TestData",
        after_state={"document_count": req.document_count},
        operator=req.generated_by,
        ip_address=request.client.host if request.client else None,
        note=f"生成 {req.document_count} 条测试文档数据"
    )
    
    return {
        "message": f"成功生成 {req.document_count} 条测试数据",
        "documents": [{"id": d.id, "document_no": d.document_no} for d in created_docs]
    }


@router.post("/tasks/{task_id}/replay", summary="回放异常任务")
def replay_task(
    request: Request,
    task_id: str,
    db: Session = Depends(get_db)
):
    verify_admin(request)
    
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status not in [TaskStatus.WAITING_MANUAL.value, TaskStatus.PERMANENT_FAILED.value]:
        raise HTTPException(
            status_code=400,
            detail="仅WAITING_MANUAL或PERMANENT_FAILED状态的任务可以回放"
        )
    
    task.status = TaskStatus.PENDING.value
    task.retry_count = 0
    task.next_retry_at = None
    task.error_message = None
    task.error_traceback = None
    
    db.commit()
    db.refresh(task)
    
    process_task(task_id)
    
    log_audit(
        db=db,
        operation_type=OperationType.REPLAY,
        entity_type="AsyncTask",
        entity_id=task.id,
        entity_no=task_id,
        after_state={"status": TaskStatus.PENDING.value},
        operator=request.headers.get("X-User", "system"),
        ip_address=request.client.host if request.client else None,
        note="回放异常任务"
    )
    
    return task


@router.get("/health", summary="健康检查")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
