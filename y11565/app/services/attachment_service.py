from sqlalchemy.orm import Session
from typing import Optional, List
import os
import shutil
from datetime import datetime

from app.models import Attachment, Batch
from app.enums import AttachmentType, ChangeType, BatchStatus
from app.schemas import AttachmentCreate
from app.services.change_log_service import log_change
from app.database import settings


def get_attachment(db: Session, attachment_id: int) -> Optional[Attachment]:
    return db.query(Attachment).filter(Attachment.id == attachment_id).first()


def get_attachments_by_batch(db: Session, batch_id: int, file_type: Optional[AttachmentType] = None) -> List[Attachment]:
    query = db.query(Attachment).filter(Attachment.batch_id == batch_id)
    if file_type:
        query = query.filter(Attachment.file_type == file_type.value)
    return query.order_by(Attachment.created_at.desc()).all()


def get_attachments_by_work_order(db: Session, work_order_id: int, file_type: Optional[AttachmentType] = None) -> List[Attachment]:
    query = db.query(Attachment).filter(Attachment.work_order_id == work_order_id)
    if file_type:
        query = query.filter(Attachment.file_type == file_type.value)
    return query.order_by(Attachment.created_at.desc()).all()


def _ensure_upload_dir():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def create_attachment(
    db: Session,
    attachment_data: AttachmentCreate,
    batch_id: int = None,
    work_order_id: int = None,
) -> Attachment:
    if batch_id:
        db_batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if db_batch and db_batch.status in [BatchStatus.FROZEN.value, BatchStatus.SETTLED.value, BatchStatus.ARCHIVED.value]:
            raise ValueError(f"批次状态为 {db_batch.status}，不允许上传附件")

    db_attachment = Attachment(
        batch_id=batch_id,
        work_order_id=work_order_id,
        **attachment_data.model_dump(),
    )
    db.add(db_attachment)
    db.flush()

    log_change(
        db,
        ChangeType.ATTACHMENT_ADD,
        batch_id=batch_id,
        work_order_id=work_order_id,
        new_value=f"添加附件: {attachment_data.file_name} ({attachment_data.file_type})",
        changed_by=attachment_data.uploaded_by,
    )

    db.commit()
    db.refresh(db_attachment)
    return db_attachment


def save_uploaded_file(
    file_content: bytes,
    filename: str,
    batch_id: int = None,
    work_order_id: int = None,
) -> str:
    _ensure_upload_dir()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = os.path.splitext(filename)[1]
    safe_filename = f"{timestamp}_{batch_id or work_order_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    return file_path


def delete_attachment(db: Session, attachment_id: int, deleted_by: str = None) -> bool:
    db_attachment = get_attachment(db, attachment_id)
    if not db_attachment:
        return False

    if db_attachment.batch_id:
        db_batch = db.query(Batch).filter(Batch.id == db_attachment.batch_id).first()
        if db_batch and db_batch.status in [BatchStatus.FROZEN.value, BatchStatus.SETTLED.value, BatchStatus.ARCHIVED.value]:
            raise ValueError(f"批次状态为 {db_batch.status}，不允许删除附件")

    if os.path.exists(db_attachment.file_path):
        try:
            os.remove(db_attachment.file_path)
        except:
            pass

    log_change(
        db,
        ChangeType.ATTACHMENT_REMOVE,
        batch_id=db_attachment.batch_id,
        work_order_id=db_attachment.work_order_id,
        old_value=f"删除附件: {db_attachment.file_name}",
        changed_by=deleted_by,
    )

    db.delete(db_attachment)
    db.commit()
    return True
