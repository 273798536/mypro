from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from starlette import status

from app.database import get_db
from app.models import BatchStatus, RecordStatus, RecordType, UserRole
from app.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, BatchDetailResponse,
    RecordResponse, RecordDetailResponse, ImportResult,
    BatchReviewRequest, FreezeRequest, WithdrawRequest,
    RecordCorrectionRequest, ExportSummary, AttachmentResponse,
    AuditLogResponse, ErrorResponse
)
from app.services import (
    create_batch, get_batch, list_batches, import_records,
    get_record, list_records, correct_record, review_batch,
    freeze_batch, unfreeze_batch, withdraw_batch, resubmit_batch,
    settle_batch, archive_batch, add_attachment, get_audit_logs,
    get_export_summary, export_records
)
from app.state_machine import StateTransitionError
from app.auth import require_permission, require_batch_status_allowed, get_user_role, USERS_DB

router = APIRouter(prefix="/api/v1", tags=["kb-receipt"])


@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_new_batch(
    batch_data: BatchCreate,
    auth: tuple = Depends(require_permission("create_batch")),
    db: Session = Depends(get_db)
):
    """创建新批次"""
    operator, user_role = auth
    try:
        batch = create_batch(db, batch_data, operator)
        return batch
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/batches")
def get_batches_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[BatchStatus] = Query(None, alias="status"),
    operator: str = Query("admin", description="操作人用户名"),
    db: Session = Depends(get_db)
):
    """获取批次列表"""
    skip = (page - 1) * page_size
    batches, total = list_batches(db, skip=skip, limit=page_size, status=status_filter)
    
    items = []
    for b in batches:
        items.append({
            "id": b.id,
            "batch_no": b.batch_no,
            "title": b.title,
            "description": b.description,
            "status": b.status.value,
            "created_by": b.created_by,
            "created_at": b.created_at.isoformat(),
            "updated_at": b.updated_at.isoformat(),
            "imported_at": b.imported_at.isoformat() if b.imported_at else None,
            "frozen_at": b.frozen_at.isoformat() if b.frozen_at else None,
            "frozen_by": b.frozen_by,
            "frozen_reason": b.frozen_reason,
            "status_before_frozen": b.status_before_frozen.value if b.status_before_frozen else None,
            "stats": b.stats
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }


@router.get("/batches/{batch_id}")
def get_batch_detail(
    batch_id: int,
    operator: str = Query("admin", description="操作人用户名"),
    db: Session = Depends(get_db)
):
    """获取批次详情"""
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return {
        "id": batch.id,
        "batch_no": batch.batch_no,
        "title": batch.title,
        "description": batch.description,
        "status": batch.status.value,
        "created_by": batch.created_by,
        "created_at": batch.created_at.isoformat(),
        "updated_at": batch.updated_at.isoformat(),
        "imported_at": batch.imported_at.isoformat() if batch.imported_at else None,
        "frozen_at": batch.frozen_at.isoformat() if batch.frozen_at else None,
        "frozen_by": batch.frozen_by,
        "frozen_reason": batch.frozen_reason,
        "status_before_frozen": batch.status_before_frozen.value if batch.status_before_frozen else None,
        "stats": batch.stats,
        "review_opinion": batch.review_opinion,
        "reviewed_by": batch.reviewed_by,
        "reviewed_at": batch.reviewed_at.isoformat() if batch.reviewed_at else None,
        "withdrawn_at": batch.withdrawn_at.isoformat() if batch.withdrawn_at else None,
        "withdrawn_by": batch.withdrawn_by,
        "withdrawn_reason": batch.withdrawn_reason,
        "settled_at": batch.settled_at.isoformat() if batch.settled_at else None,
        "settled_by": batch.settled_by,
        "archived_at": batch.archived_at.isoformat() if batch.archived_at else None,
        "archived_by": batch.archived_by,
        "record_count": len(batch.records),
        "attachment_count": len(batch.attachments)
    }


@router.post("/batches/{batch_id}/import", response_model=ImportResult)
def import_batch_records(
    batch_id: int,
    record_type: RecordType = Form(..., description="记录类型"),
    source_file: str = Form(..., description="来源文件名"),
    sheet_name: Optional[str] = Form(None, description="Sheet名称"),
    file: UploadFile = File(None, description="上传的文件(可选，也可直接传JSON数据)"),
    json_data: Optional[str] = Form(None, description="JSON格式的记录数据"),
    auth: tuple = Depends(require_permission("import_records")),
    db: Session = Depends(get_db)
):
    """导入记录数据
    
    支持两种方式:
    1. 上传Excel/CSV文件
    2. 直接传JSON格式的记录数据数组
    
    支持多次导入不同类型数据（变更单、审核意见、客服引用记录）形成闭环
    """
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    import json
    records_data = []
    
    if file:
        try:
            import pandas as pd
            import io
            
            content = file.file.read()
            if file.filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(content))
            elif file.filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(content), sheet_name=sheet_name or 0)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
            
            records_data = df.where(pd.notnull(df), None).to_dict('records')
            source_file = file.filename
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File parse error: {str(e)}")
    elif json_data:
        try:
            records_data = json.loads(json_data)
            if not isinstance(records_data, list):
                raise ValueError("JSON data must be an array")
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail="Either file or json_data must be provided")
    
    try:
        result = import_records(
            db=db,
            batch=batch,
            record_type=record_type,
            records_data=records_data,
            source_file=source_file,
            imported_by=operator,
            sheet_name=sheet_name
        )
        return result
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/batches/{batch_id}/records")
def get_batch_records(
    batch_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    status_filter: Optional[RecordStatus] = Query(None, alias="status"),
    auth: tuple = Depends(require_permission("view_records")),
    db: Session = Depends(get_db)
):
    """获取批次记录列表"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    skip = (page - 1) * page_size
    records, total = list_records(db, batch_id=batch_id, status=status_filter, skip=skip, limit=page_size)
    
    items = []
    for r in records:
        items.append({
            "id": r.id,
            "batch_id": r.batch_id,
            "record_type": r.record_type.value,
            "status": r.status.value,
            "unique_key": r.unique_key,
            "source_file": r.source_file,
            "source_row": r.source_row,
            "change_order_no": r.change_order_no,
            "audit_opinion_no": r.audit_opinion_no,
            "cs_reference_no": r.cs_reference_no,
            "cs_agent_id": r.cs_agent_id,
            "cs_agent_name": r.cs_agent_name,
            "store_id": r.store_id,
            "store_name": r.store_name,
            "compensation_amount": r.compensation_amount,
            "is_correct": r.is_correct,
            "review_result": r.review_result,
            "review_reason": r.review_reason,
            "reviewer": r.reviewer,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "correction_note": r.correction_note,
            "corrected_by": r.corrected_by,
            "corrected_at": r.corrected_at.isoformat() if r.corrected_at else None,
            "error_message": r.error_message,
            "warning_message": r.warning_message,
            "is_duplicate": r.is_duplicate,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat()
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }


@router.get("/records/{record_id}", response_model=RecordDetailResponse)
def get_record_detail(
    record_id: int,
    operator: str = Query("admin", description="操作人用户名"),
    db: Session = Depends(get_db)
):
    """获取记录详情（包含原始数据）"""
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.put("/records/{record_id}/correct", response_model=RecordResponse)
def correct_single_record(
    record_id: int,
    correction: RecordCorrectionRequest,
    auth: tuple = Depends(require_permission("correct_record")),
    db: Session = Depends(get_db)
):
    """人工改判单条记录"""
    operator, user_role = auth
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    try:
        record = correct_record(
            db=db,
            record=record,
            new_status=correction.status,
            correction_note=correction.correction_note,
            operator=operator,
            review_reason=correction.review_reason,
            is_correct=correction.is_correct,
            compensation_amount=correction.compensation_amount
        )
        return record
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/review", response_model=BatchResponse)
def review_single_batch(
    batch_id: int,
    review_data: BatchReviewRequest,
    auth: tuple = Depends(require_permission("review_batch")),
    db: Session = Depends(get_db)
):
    """复核批次"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = review_batch(
            db=db,
            batch=batch,
            action=review_data.action,
            opinion=review_data.opinion,
            operator=operator,
            record_results=review_data.record_results
        )
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/freeze", response_model=BatchResponse)
def freeze_single_batch(
    batch_id: int,
    freeze_data: FreezeRequest,
    auth: tuple = Depends(require_permission("freeze_batch")),
    db: Session = Depends(get_db)
):
    """冻结批次"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = freeze_batch(db, batch, freeze_data.reason, operator)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/unfreeze", response_model=BatchResponse)
def unfreeze_single_batch(
    batch_id: int,
    auth: tuple = Depends(require_permission("unfreeze_batch")),
    db: Session = Depends(get_db)
):
    """解冻批次"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = unfreeze_batch(db, batch, operator)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/withdraw", response_model=BatchResponse)
def withdraw_single_batch(
    batch_id: int,
    withdraw_data: WithdrawRequest,
    auth: tuple = Depends(require_permission("withdraw_batch")),
    db: Session = Depends(get_db)
):
    """撤回归档"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = withdraw_batch(db, batch, withdraw_data.reason, operator)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/resubmit", response_model=BatchResponse)
def resubmit_single_batch(
    batch_id: int,
    auth: tuple = Depends(require_permission("resubmit_batch")),
    db: Session = Depends(get_db)
):
    """撤回后重新提交"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = resubmit_batch(db, batch, operator)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/settle", response_model=BatchResponse)
def settle_single_batch(
    batch_id: int,
    auth: tuple = Depends(require_permission("settle_batch")),
    db: Session = Depends(get_db)
):
    """结算批次"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = settle_batch(db, batch, operator)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/archive", response_model=BatchResponse)
def archive_single_batch(
    batch_id: int,
    auth: tuple = Depends(require_permission("archive_batch")),
    db: Session = Depends(get_db)
):
    """归档批次"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        batch = archive_batch(db, batch, operator)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/attachments", response_model=AttachmentResponse)
def upload_batch_attachment(
    batch_id: int,
    file: UploadFile = File(...),
    attachment_type: str = Form("general"),
    description: Optional[str] = Form(None),
    auth: tuple = Depends(require_permission("upload_attachment")),
    db: Session = Depends(get_db)
):
    """上传批次附件（短信截图等）"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        content = file.file.read()
        attachment = add_attachment(
            db=db,
            batch_id=batch_id,
            record_id=None,
            file_name=file.filename,
            file_content=content,
            mime_type=file.content_type or "application/octet-stream",
            uploaded_by=operator,
            attachment_type=attachment_type,
            description=description
        )
        return attachment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/records/{record_id}/attachments", response_model=AttachmentResponse)
def upload_record_attachment(
    record_id: int,
    file: UploadFile = File(...),
    attachment_type: str = Form("general"),
    description: Optional[str] = Form(None),
    auth: tuple = Depends(require_permission("upload_attachment")),
    db: Session = Depends(get_db)
):
    """上传单条记录附件"""
    operator, user_role = auth
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    try:
        content = file.file.read()
        attachment = add_attachment(
            db=db,
            batch_id=record.batch_id,
            record_id=record_id,
            file_name=file.filename,
            file_content=content,
            mime_type=file.content_type or "application/octet-stream",
            uploaded_by=operator,
            attachment_type=attachment_type,
            description=description
        )
        return attachment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batches/{batch_id}/audit-logs")
def get_batch_audit_logs(
    batch_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    auth: tuple = Depends(require_permission("view_audit_logs")),
    db: Session = Depends(get_db)
):
    """获取批次审计日志"""
    operator, user_role = auth
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    skip = (page - 1) * page_size
    logs, total = get_audit_logs(db, batch_id=batch_id, skip=skip, limit=page_size)
    
    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "batch_id": log.batch_id,
            "record_id": log.record_id,
            "action": log.action,
            "old_status": log.old_status,
            "new_status": log.new_status,
            "reason": log.reason,
            "operator": log.operator,
            "operator_role": log.operator_role,
            "operated_at": log.operated_at.isoformat(),
            "changes": log.changes
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }


@router.get("/batches/{batch_id}/export/summary", response_model=ExportSummary)
def get_batch_export_summary(
    batch_id: int,
    auth: tuple = Depends(require_permission("export_summary")),
    db: Session = Depends(get_db)
):
    """导出汇总信息"""
    operator, user_role = auth
    try:
        summary = get_export_summary(db, batch_id, operator)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/batches/{batch_id}/export/records")
def export_batch_records(
    batch_id: int,
    format: str = Query("json", description="导出格式: json/csv"),
    operator: str = Query("admin", description="操作人用户名"),
    db: Session = Depends(get_db)
):
    """导出详细记录"""
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    records = export_records(db, batch_id)
    
    if format == "csv":
        import csv
        import io
        from fastapi.responses import StreamingResponse
        
        if not records:
            raise HTTPException(status_code=400, detail="No records to export")
        
        output = io.StringIO()
        fieldnames = list(records[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=batch_{batch_id}_records.csv"}
        )
    
    return {
        "batch_id": batch_id,
        "batch_no": batch.batch_no,
        "record_count": len(records),
        "records": records
    }


@router.get("/users")
def list_users():
    """获取可用用户列表（用于权限测试）"""
    users = []
    for username, info in USERS_DB.items():
        users.append({
            "username": username,
            "role": info["role"].value,
            "full_name": info["full_name"]
        })
    return {"users": users, "note": "Use ?operator=username in API calls"}


@router.get("/health")
def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "kb-receipt-state-machine"}
