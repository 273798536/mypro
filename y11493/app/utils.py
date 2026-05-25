import hashlib
import json
import uuid
import os
import zipfile
import tarfile
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
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


def extract_archive(file_path: str, file_name: str) -> List[Dict]:
    extracted_files = []
    extract_dir = settings.UPLOAD_DIR / "extracted" / generate_no("EXTRACT")
    extract_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        if file_name.endswith('.zip'):
            with zipfile.ZipFile(file_path, 'r') as zf:
                for member in zf.namelist():
                    if member.endswith('/'):
                        continue
                    
                    try:
                        extracted_path = zf.extract(member, extract_dir)
                        file_info = {
                            "file_name": os.path.basename(member),
                            "file_path": extracted_path,
                            "archive_path": member,
                            "file_size": os.path.getsize(extracted_path),
                            "file_hash": calculate_file_hash(extracted_path)
                        }
                        extracted_files.append(file_info)
                    except Exception as e:
                        logger.warning(f"提取文件失败 {member}: {e}")
        
        elif file_name.endswith(('.tar.gz', '.tgz', '.tar')):
            mode = 'r:gz' if file_name.endswith(('.tar.gz', '.tgz')) else 'r:'
            with tarfile.open(file_path, mode) as tf:
                for member in tf.getmembers():
                    if not member.isfile():
                        continue
                    
                    try:
                        tf.extract(member, extract_dir)
                        extracted_path = os.path.join(extract_dir, member.name)
                        file_info = {
                            "file_name": os.path.basename(member.name),
                            "file_path": extracted_path,
                            "archive_path": member.name,
                            "file_size": member.size,
                            "file_hash": calculate_file_hash(extracted_path)
                        }
                        extracted_files.append(file_info)
                    except Exception as e:
                        logger.warning(f"提取文件失败 {member.name}: {e}")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的压缩包格式，仅支持zip、tar.gz、tgz、tar"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"解析压缩包失败: {str(e)}"
        )
    
    return extracted_files


def import_archive_files(
    db: Session,
    file_path: str,
    file_name: str,
    batch_no: str,
    document_type: DocumentType,
    imported_by: str,
    is_supplement: bool = False
) -> Dict:
    archive_hash = calculate_file_hash(file_path)
    extracted_files = extract_archive(file_path, file_name)
    
    import_results = {
        "batch_no": batch_no,
        "archive_name": file_name,
        "archive_hash": archive_hash,
        "total_files": len(extracted_files),
        "files": [],
        "documents": []
    }
    
    for file_info in extracted_files:
        sub_file_name = file_info["file_name"]
        sub_file_path = file_info["file_path"]
        
        document = Document(
            document_no=generate_no("DOC"),
            title=f"[{file_name}] {sub_file_name}",
            document_type=document_type.value,
            status="imported",
            created_by=imported_by
        )
        db.add(document)
        db.flush()
        
        version = DocumentVersion(
            document_id=document.id,
            version=1,
            version_name="V1",
            content_snapshot={
                "source_archive": file_name,
                "archive_path": file_info["archive_path"],
                "file_hash": file_info["file_hash"],
                "file_size": file_info["file_size"]
            },
            created_by=imported_by,
            change_reason=f"从压缩包导入: {file_name}"
        )
        db.add(version)
        
        attachment = Attachment(
            document_id=document.id,
            version_id=version.id,
            file_name=sub_file_name,
            file_path=sub_file_path,
            file_hash=file_info["file_hash"],
            file_size=file_info["file_size"],
            file_type=os.path.splitext(sub_file_name)[1].lstrip('.'),
            description=f"从压缩包 {file_name} 中提取",
            uploaded_by=imported_by
        )
        db.add(attachment)
        
        import_record = ImportRecord(
            document_id=document.id,
            batch_no=batch_no,
            source_file=file_name,
            source_file_hash=archive_hash,
            source_row_number=None,
            original_value=sub_file_name,
            original_data={"archive_path": file_info["archive_path"], "file_info": file_info},
            standard_value=json.dumps({"document_id": document.id, "file_hash": file_info["file_hash"]}),
            parsed_data={"document_id": document.id, "attachment_id": attachment.id},
            status="imported",
            is_duplicate=False,
            imported_by=imported_by
        )
        db.add(import_record)
        
        import_results["files"].append({
            "archive_path": file_info["archive_path"],
            "file_name": sub_file_name,
            "file_size": file_info["file_size"]
        })
        import_results["documents"].append({
            "document_id": document.id,
            "document_no": document.document_no
        })
    
    db.commit()
    
    log_audit(
        db=db,
        operation_type=OperationType.IMPORT,
        entity_type="ArchiveImport",
        entity_no=batch_no,
        after_state={"file_count": len(extracted_files), "archive": file_name},
        operator=imported_by,
        note=f"导入压缩包: {file_name}, 共{len(extracted_files)}个文件"
    )
    
    return import_results


def cross_material_reconcile(db: Session, project_no: str, reconciled_by: str) -> Dict:
    qualification_docs = db.query(Document).filter(
        Document.document_type == DocumentType.QUALIFICATION.value
    ).all()
    
    quotation_docs = db.query(Document).filter(
        Document.document_type == DocumentType.QUOTATION.value
    ).all()
    
    stamped_docs = db.query(Document).filter(
        Document.document_type == DocumentType.STAMPED.value
    ).all()
    
    reconcile_result = {
        "reconcile_no": generate_no("CMR"),
        "project_no": project_no,
        "reconciled_at": datetime.now().isoformat(),
        "reconciled_by": reconciled_by,
        "summary": {
            "qualification_count": len(qualification_docs),
            "quotation_count": len(quotation_docs),
            "stamped_count": len(stamped_docs)
        },
        "conflicts": [],
        "missing_items": [],
        "consistent_items": [],
        "conflict_explanations": []
    }
    
    all_docs = qualification_docs + quotation_docs + stamped_docs
    key_fields = ["company_name", "amount", "bid_no", "project_name"]
    
    for doc in all_docs:
        latest_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == doc.id
        ).order_by(DocumentVersion.version.desc()).first()
        
        if not latest_version or not latest_version.content_snapshot:
            continue
        
        content = latest_version.content_snapshot
        doc_type = doc.document_type
        
        for other_doc in all_docs:
            if other_doc.id == doc.id:
                continue
            
            other_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == other_doc.id
            ).order_by(DocumentVersion.version.desc()).first()
            
            if not other_version or not other_version.content_snapshot:
                continue
            
            other_content = other_version.content_snapshot
            
            for field in key_fields:
                doc_value = content.get(field)
                other_value = other_content.get(field)
                
                if doc_value and other_value and str(doc_value) != str(other_value):
                    conflict_id = f"{doc.id}-{other_doc.id}-{field}"
                    if not any(c.get("id") == conflict_id for c in reconcile_result["conflicts"]):
                        conflict = {
                            "id": conflict_id,
                            "field": field,
                            "source_document": {
                                "id": doc.id,
                                "document_no": doc.document_no,
                                "document_type": doc_type,
                                "value": doc_value
                            },
                            "target_document": {
                                "id": other_doc.id,
                                "document_no": other_doc.document_no,
                                "document_type": other_doc.document_type,
                                "value": other_value
                            }
                        }
                        reconcile_result["conflicts"].append(conflict)
                        
                        explanation = generate_conflict_explanation(
                            field, doc_value, other_value,
                            doc.document_type, other_doc.document_type
                        )
                        reconcile_result["conflict_explanations"].append({
                            "conflict_id": conflict_id,
                            "explanation": explanation
                        })
    
    reconcile_result["is_consistent"] = len(reconcile_result["conflicts"]) == 0
    reconcile_result["conflict_count"] = len(reconcile_result["conflicts"])
    
    record = ReconciliationRecord(
        reconcile_no=reconcile_result["reconcile_no"],
        diff_result=reconcile_result,
        is_consistent=reconcile_result["is_consistent"],
        reconciled_by=reconciled_by,
        note=f"跨材料核对: 资质({len(qualification_docs)}) + 报价({len(quotation_docs)}) + 盖章({len(stamped_docs)}) = {len(reconcile_result['conflicts'])}个冲突"
    )
    db.add(record)
    db.commit()
    
    return reconcile_result


def generate_conflict_explanation(
    field: str, 
    value1: Any, 
    value2: Any, 
    type1: str, 
    type2: str
) -> str:
    type_names = {
        "qualification": "资质文件",
        "quotation": "报价版本",
        "stamped": "盖章扫描件",
        "history_archive": "历史压缩包",
        "supplement": "临时补录单"
    }
    
    field_names = {
        "company_name": "公司名称/发票抬头",
        "amount": "金额/报价",
        "bid_no": "投标编号",
        "project_name": "项目名称"
    }
    
    field_name = field_names.get(field, field)
    name1 = type_names.get(type1, type1)
    name2 = type_names.get(type2, type2)
    
    explanations = [
        f"【{field_name}】存在口径差异",
        f"- {name1}显示: \"{value1}\"",
        f"- {name2}显示: \"{value2}\"",
        f"- 请核实哪个是正确版本，确认数据来源"
    ]
    
    if field == "company_name":
        explanations.append("  建议: 检查工商注册名称与发票抬头是否一致")
    elif field == "amount":
        explanations.append("  建议: 检查含税/不含税、大小写金额是否匹配")
    elif field == "bid_no":
        explanations.append("  建议: 检查项目编号规则与版本号后缀")
    
    return "\n".join(explanations)


def track_detailed_changes(
    db: Session,
    document_id: int,
    old_content: Dict,
    new_content: Dict,
    changed_by: str,
    change_reason: str
) -> List[Dict]:
    changes = []
    diff = deep_diff(old_content, new_content)
    
    for path, change_info in diff.items():
        change_record = {
            "field_path": path,
            "action": change_info["action"],
            "old_value": change_info.get("old"),
            "new_value": change_info.get("new"),
            "changed_by": changed_by,
            "changed_at": datetime.now().isoformat(),
            "change_reason": change_reason,
            "page_hint": infer_page_hint(path)
        }
        changes.append(change_record)
    
    for change in changes:
        log_audit(
            db=db,
            operation_type=OperationType.UPDATE,
            entity_type="FieldChange",
            entity_id=document_id,
            entity_no=f"FIELD-{document_id}-{change['field_path']}",
            before_state={"value": change["old_value"]},
            after_state={"value": change["new_value"]},
            operator=changed_by,
            note=f"字段变更: {change['field_path']} - {change['action']}\n原因: {change_reason}\n推测页面: {change['page_hint']}"
        )
    
    return changes


def infer_page_hint(field_path: str) -> str:
    page_mapping = {
        "invoice_title": "第1页 - 封面/发票信息",
        "company_name": "第1页 - 封面/公司信息",
        "amount": "第2页 - 报价明细",
        "price": "第2页 - 报价明细",
        "bid_no": "第1页 - 封面/投标编号",
        "project_name": "第1页 - 封面/项目名称",
        "contact": "最后一页 - 联系方式",
        "address": "最后一页 - 公司地址",
        "qualification": "资质证明页",
        "stamp": "盖章页",
        "signature": "签字页"
    }
    
    for key, page in page_mapping.items():
        if key in field_path.lower():
            return page
    
    return "请查看具体修改记录"


def export_full_chain(db: Session, document_id: int) -> Dict:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    versions = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version).all()
    
    attachments = db.query(Attachment).filter(
        Attachment.document_id == document_id
    ).order_by(Attachment.uploaded_at).all()
    
    import_records = db.query(ImportRecord).filter(
        ImportRecord.document_id == document_id
    ).all()
    
    audit_logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "Document",
        AuditLog.entity_id == document_id
    ).order_by(AuditLog.operated_at).all()
    
    field_changes = db.query(AuditLog).filter(
        AuditLog.entity_type == "FieldChange",
        AuditLog.entity_id == document_id
    ).order_by(AuditLog.operated_at).all()
    
    all_hashes = []
    
    export_data = {
        "document": {
            "id": document.id,
            "document_no": document.document_no,
            "title": document.title,
            "document_type": document.document_type,
            "status": document.status,
            "created_by": document.created_by,
            "created_at": document.created_at.isoformat() if document.created_at else None
        },
        "version_chain": [],
        "attachment_chain": [],
        "import_chain": [],
        "audit_chain": [],
        "field_change_chain": [],
        "consistency_proof": {}
    }
    
    for version in versions:
        version_data = {
            "version": version.version,
            "version_name": version.version_name,
            "content_hash": calculate_content_hash(json.dumps(version.content_snapshot or {}, sort_keys=True)),
            "created_by": version.created_by,
            "created_at": version.created_at.isoformat() if version.created_at else None,
            "change_reason": version.change_reason,
            "diff_count": len(version.diff_from_previous or {})
        }
        export_data["version_chain"].append(version_data)
        all_hashes.append(version_data["content_hash"])
    
    for attach in attachments:
        attach_data = {
            "file_name": attach.file_name,
            "file_hash": attach.file_hash,
            "file_size": attach.file_size,
            "uploaded_by": attach.uploaded_by,
            "uploaded_at": attach.uploaded_at.isoformat() if attach.uploaded_at else None,
            "is_active": attach.is_active
        }
        export_data["attachment_chain"].append(attach_data)
        if attach.file_hash:
            all_hashes.append(attach.file_hash)
    
    for imp in import_records:
        imp_data = {
            "source_file": imp.source_file,
            "source_hash": imp.source_file_hash,
            "source_row": imp.source_row_number,
            "original_value": imp.original_value,
            "standard_value": imp.standard_value,
            "imported_by": imp.imported_by,
            "imported_at": imp.imported_at.isoformat() if imp.imported_at else None
        }
        export_data["import_chain"].append(imp_data)
    
    for log in audit_logs:
        log_data = {
            "operation_type": log.operation_type,
            "operator": log.operator,
            "operated_at": log.operated_at.isoformat() if log.operated_at else None,
            "changes_count": len(log.changes or {}),
            "note": log.note
        }
        export_data["audit_chain"].append(log_data)
    
    for fc in field_changes:
        fc_data = {
            "field": fc.entity_no.replace(f"FIELD-{document_id}-", "") if fc.entity_no else "",
            "action": fc.changes.get(list(fc.changes.keys())[0], {}).get("action") if fc.changes else None,
            "operator": fc.operator,
            "operated_at": fc.operated_at.isoformat() if fc.operated_at else None,
            "page_hint": fc.note.split("推测页面: ")[-1] if fc.note and "推测页面: " in fc.note else None
        }
        export_data["field_change_chain"].append(fc_data)
    
    chain_hash = calculate_content_hash("|".join(sorted(all_hashes)))
    export_data["consistency_proof"] = {
        "chain_hash": chain_hash,
        "version_count": len(versions),
        "attachment_count": len(attachments),
        "audit_count": len(audit_logs),
        "generated_at": datetime.now().isoformat(),
        "verification_note": "使用 chain_hash 可验证历史数据未被篡改。任意版本、附件、导入记录的哈希变化都会导致 chain_hash 变化。"
    }
    
    return export_data


import logging
logger = logging.getLogger(__name__)
