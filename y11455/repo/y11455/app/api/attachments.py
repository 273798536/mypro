import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.enums import AttachmentType, OperationType
from app.models import Attachment, ExceptionReceipt, AuditLog
from app.schemas import AttachmentUploadResponse

router = APIRouter(prefix="/attachments", tags=["附件管理"])

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=AttachmentUploadResponse)
async def upload_attachment(
    receipt_id: int = Form(..., description="回执ID"),
    attachment_type: AttachmentType = Form(..., description="附件类型"),
    uploader: str = Form(..., description="上传人"),
    remark: str = Form(None, description="备注"),
    file: UploadFile = File(..., description="文件"),
    db: Session = Depends(get_db)
):
    receipt = db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")

    file_ext = Path(file.filename).suffix
    new_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = settings.UPLOAD_DIR / new_filename

    try:
        content = await file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="文件过大")
        
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")

    attachment = Attachment(
        receipt_id=receipt_id,
        attachment_type=attachment_type,
        file_name=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        uploader=uploader,
        remark=remark
    )
    db.add(attachment)
    db.flush()

    db.add(AuditLog(
        operation_type=OperationType.ATTACH_UPLOAD,
        target_type="attachment",
        target_id=attachment.id,
        operator=uploader,
        detail=f"上传附件: {file.filename}, 类型: {attachment_type.value}"
    ))

    db.commit()
    return attachment


@router.get("/receipt/{receipt_id}")
async def get_receipt_attachments(
    receipt_id: int,
    db: Session = Depends(get_db)
):
    attachments = db.query(Attachment).filter(Attachment.receipt_id == receipt_id).order_by(Attachment.id.desc()).all()
    return attachments
