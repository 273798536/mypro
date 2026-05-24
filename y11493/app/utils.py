import hashlib
import json
import uuid
import os
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from .models import (
    Document, DocumentVersion, Attachment, ImportRecord,
    AsyncTask, AuditLog, ReconciliationRecord, ExportRecord,
    DocumentType, TaskStatus, OperationType
)
from .config import settings
from fastapi import UploadFile, HTTPException, status


def generate_no(prefix: str = "BID") -> str:
    return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"


def calculate_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def calculate_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def deep_diff(old: Any, new: Any, path: str = "") -> Dict[str, Any]:
    changes = {}
    if isinstance(old, dict) and isinstance(new, dict):
        old_keys = set(old.keys())
        new_keys = set(new.keys())
        
        for key in old_keys - new_keys:
            changes[f"{path}.{key}" if path else key] = {
                "action": "removed",
                "old": old[key],
                "new": None
            }
        
        for key in new_keys - old_keys:
            changes[f"{path}.{key}" if path else key] = {
                "action": "added",
                "old": None,
                "new": new[key]
            }
        
        for key in old_keys & new_keys:
            nested = deep_diff(old[key], new[key], f"{path}.{key}" if path else key)
            changes.update(nested)
    elif isinstance(old, list) and isinstance(new, list):
        for i, (o, n) in enumerate(zip(old, new)):
            nested = deep_diff(o, n, f"{path}[{i}]")
            changes.update(nested)
        if len(old) > len(new):
            for i in range(len(new), len(old)):
                changes[f"{path}[{i}]"] = {
                    "action": "removed",
                    "old": old[i],
                    "new": None
                }
        elif len(new) > len(old):
            for i in range(len(old), len(new)):
                changes[f"{path}[{i}]"] = {
                    "action": "added",
                    "old": None,
                    "new": new[i]
                }
    elif old != new:
        changes[path] = {
            "action": "modified",
            "old": old,
            "new": new
        }
    return changes


def log_audit(
    db: Session,
    operation_type: OperationType,
    entity_type: str,
    entity_id: Optional[int] = None,
    entity_no: Optional[str] = None,
    before_state: Optional[Dict] = None,
    after_state: Optional[Dict] = None,
    operator: Optional[str] = None,
    ip_address: Optional[str] = None,
    note: Optional[str] = None
) -> AuditLog:
    changes = deep_diff(before_state or {}, after_state or {})
    audit_log = AuditLog(
        operation_type=operation_type.value,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_no=entity_no,
        before_state=before_state,
        after_state=after_state,
        changes=changes,
        operator=operator,
        ip_address=ip_address,
        note=note
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log


def save_upload_file(file: UploadFile, subdir: str = "") -> Tuple[str, str, int]:
    target_dir = settings.UPLOAD_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    new_filename = f"{generate_no('FILE')}{file_ext}"
    file_path = target_dir / new_filename
    
    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := file.file.read(4096):
            file_size += len(chunk)
            buffer.write(chunk)
    
    return str(file_path), file.filename or new_filename, file_size


def parse_excel_import(file_path: str) -> List[Dict]:
    records = []
    try:
        df = pd.read_excel(file_path)
        for idx, row in df.iterrows():
            records.append({
                "row_number": idx + 2,
                "original_data": row.to_dict(),
                "original_value": str(row.to_dict()),
            })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"解析Excel文件失败: {str(e)}"
        )
    return records


def parse_csv_import(file_path: str) -> List[Dict]:
    records = []
    try:
        df = pd.read_csv(file_path)
        for idx, row in df.iterrows():
            records.append({
                "row_number": idx + 2,
                "original_data": row.to_dict(),
                "original_value": str(row.to_dict()),
            })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"解析CSV文件失败: {str(e)}"
        )
    return records


def standardize_import_data(raw_data: Dict) -> Dict:
    standardized = {}
    key_mapping = {
        "发票抬头": "invoice_title",
        "公司名称": "company_name",
        "企业名称": "company_name",
        "金额": "amount",
        "报价": "price",
        "项目名称": "project_name",
        "投标编号": "bid_no",
    }
    
    for key, value in raw_data.items():
        if pd.isna(value):
            value = None
        
        std_key = key_mapping.get(key, key.lower().replace(" ", "_"))
        standardized[std_key] = value
    
    return standardized


def check_duplicate_import(db: Session, source_file_hash: str, source_row_number: int) -> bool:
    existing = db.query(ImportRecord).filter(
        ImportRecord.source_file_hash == source_file_hash,
        ImportRecord.source_row_number == source_row_number
    ).first()
    return existing is not None


def create_import_records(
    db: Session,
    file_path: str,
    file_name: str,
    batch_no: str,
    document_type: DocumentType,
    imported_by: str,
    is_supplement: bool = False
) -> List[ImportRecord]:
    file_hash = calculate_file_hash(file_path)
    
    if file_name.endswith(('.xlsx', '.xls')):
        raw_records = parse_excel_import(file_path)
    elif file_name.endswith('.csv'):
        raw_records = parse_csv_import(file_path)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件格式，仅支持xlsx、xls、csv"
        )
    
    import_records = []
    for raw in raw_records:
        is_duplicate = check_duplicate_import(db, file_hash, raw["row_number"])
        parsed_data = standardize_import_data(raw["original_data"])
        
        import_record = ImportRecord(
            batch_no=batch_no,
            source_file=file_name,
            source_file_hash=file_hash,
            source_row_number=raw["row_number"],
            original_value=raw["original_value"],
            original_data=raw["original_data"],
            standard_value=json.dumps(parsed_data, ensure_ascii=False),
            parsed_data=parsed_data,
            status="duplicate" if is_duplicate and not is_supplement else "imported",
            is_duplicate=is_duplicate,
            imported_by=imported_by
        )
        db.add(import_record)
        import_records.append(import_record)
    
    db.commit()
    for record in import_records:
        db.refresh(record)
    
    log_audit(
        db=db,
        operation_type=OperationType.IMPORT,
        entity_type="ImportRecord",
        entity_no=batch_no,
        after_state={"count": len(import_records), "batch_no": batch_no},
        operator=imported_by,
        note=f"导入文件: {file_name}, 共{len(import_records)}条记录"
    )
    
    return import_records


def create_document_version(
    db: Session,
    document_id: int,
    content: Dict,
    change_reason: str,
    created_by: str
) -> DocumentVersion:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    new_version = document.current_version + 1
    
    old_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version == document.current_version
    ).first()
    
    old_content = old_version.content_snapshot if old_version else {}
    diff = deep_diff(old_content, content)
    
    version = DocumentVersion(
        document_id=document_id,
        version=new_version,
        version_name=f"V{new_version}",
        content_snapshot=content,
        diff_from_previous=diff,
        created_by=created_by,
        change_reason=change_reason
    )
    db.add(version)
    
    document.current_version = new_version
    document.latest_note = change_reason
    
    db.commit()
    db.refresh(version)
    db.refresh(document)
    
    log_audit(
        db=db,
        operation_type=OperationType.UPDATE,
        entity_type="Document",
        entity_id=document_id,
        entity_no=document.document_no,
        before_state=old_content,
        after_state=content,
        operator=created_by,
        note=change_reason
    )
    
    return version


def create_async_task(
    db: Session,
    task_type: str,
    input_data: Dict,
    max_retry: int = 3,
    related_document_id: Optional[int] = None,
    related_batch_no: Optional[str] = None
) -> AsyncTask:
    task = AsyncTask(
        task_id=generate_no("TASK"),
        task_type=task_type,
        status=TaskStatus.PENDING.value,
        retry_count=0,
        max_retry=max_retry,
        input_data=input_data,
        related_document_id=related_document_id,
        related_batch_no=related_batch_no
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task_status(
    db: Session,
    task_id: str,
    status: TaskStatus,
    result_data: Optional[Dict] = None,
    error_message: Optional[str] = None,
    error_traceback: Optional[str] = None
) -> AsyncTask:
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task.status = status.value
    task.result_data = result_data
    
    if status == TaskStatus.RUNNING:
        task.started_at = datetime.now()
    elif status in [TaskStatus.COMPLETED, TaskStatus.PERMANENT_FAILED]:
        task.completed_at = datetime.now()
    
    if error_message:
        task.error_message = error_message
    if error_traceback:
        task.error_traceback = error_traceback
    
    if status == TaskStatus.WAITING_RETRY:
        task.retry_count += 1
        task.next_retry_at = datetime.now() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
    
    db.commit()
    db.refresh(task)
    return task
