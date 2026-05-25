from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid

from app.models import Attachment, Batch, OperationType
from app.services.audit_service import AuditService


class AttachmentService:
    UPLOAD_DIR = "attachments"

    @staticmethod
    def _ensure_upload_dir():
        if not os.path.exists(AttachmentService.UPLOAD_DIR):
            os.makedirs(AttachmentService.UPLOAD_DIR, exist_ok=True)

    @staticmethod
    def save_attachment(
        db: Session,
        batch: Batch,
        file_content: bytes,
        file_name: str,
        file_type: Optional[str] = None,
        uploaded_by: Optional[str] = None,
        description: Optional[str] = None
    ) -> Attachment:
        AttachmentService._ensure_upload_dir()
        
        ext = os.path.splitext(file_name)[1]
        saved_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(AttachmentService.UPLOAD_DIR, saved_filename)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        file_size = len(file_content)
        
        attachment = Attachment(
            batch_id=batch.id,
            file_name=file_name,
            file_path=file_path,
            file_type=file_type,
            file_size=file_size,
            uploaded_by=uploaded_by,
            description=description
        )
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.ATTACH,
            operated_by=uploaded_by or "system",
            batch_id=batch.id,
            record_type="attachment",
            record_id=attachment.id,
            after_data={
                "file_name": file_name,
                "file_size": file_size,
                "file_type": file_type
            },
            change_reason=description or "补传附件"
        )
        
        return attachment

    @staticmethod
    def get_attachments(db: Session, batch_id: int) -> List[Attachment]:
        return db.query(Attachment).filter(
            Attachment.batch_id == batch_id
        ).order_by(Attachment.uploaded_at.desc()).all()

    @staticmethod
    def get_attachment(db: Session, attachment_id: int) -> Optional[Attachment]:
        return db.query(Attachment).filter(Attachment.id == attachment_id).first()

    @staticmethod
    def delete_attachment(
        db: Session,
        attachment: Attachment,
        operated_by: str
    ) -> bool:
        if attachment.file_path and os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)
        
        before_data = {
            "file_name": attachment.file_name,
            "file_path": attachment.file_path
        }
        
        db.delete(attachment)
        db.commit()
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.DELETE,
            operated_by=operated_by,
            batch_id=attachment.batch_id,
            record_type="attachment",
            record_id=attachment.id,
            before_data=before_data,
            change_reason="删除附件"
        )
        
        return True
