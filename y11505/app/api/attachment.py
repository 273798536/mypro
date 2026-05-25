from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os
from datetime import datetime

from app.core.database import get_db
from app.core.constants import OperationType
from app.schemas import (
    AttachmentResponse,
    AttachmentListResponse,
    OperationResponse,
    ZipImportResponse,
)
from app.services import AttachmentService, BatchService
from app.models import Attachment

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.post("/upload/{batch_id}", response_model=OperationResponse)
async def upload_attachment(
    batch_id: str,
    file: UploadFile = File(..., description="要上传的文件"),
    attachment_type: str = Form(
        ...,
        description="附件类型: inspection_record/calibration_certificate/repair_quote/price_adjustment/history_archive/other"
    ),
    operator: str = Form(..., description="操作人"),
    description: Optional[str] = Form(None, description="附件描述"),
    db: Session = Depends(get_db),
):
    try:
        file_content = await file.read()
        
        attachment_service = AttachmentService(db)
        attachment = attachment_service.upload_attachment(
            batch_id=batch_id,
            original_name=file.filename,
            file_content=file_content,
            attachment_type=attachment_type,
            operator=operator,
            description=description,
        )
        
        return OperationResponse(
            success=True,
            message=f"文件上传成功: {file.filename}",
            data={
                "attachment_id": attachment.id,
                "original_name": attachment.original_name,
                "attachment_type": attachment.attachment_type,
                "file_size": attachment.file_size,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@router.post("/batch/{batch_id}/upload-multiple", response_model=OperationResponse)
async def upload_multiple_attachments(
    batch_id: str,
    files: List[UploadFile] = File(..., description="要上传的多个文件"),
    attachment_type: str = Form(..., description="附件类型"),
    operator: str = Form(..., description="操作人"),
    db: Session = Depends(get_db),
):
    results = {"success": [], "failed": []}
    attachment_service = AttachmentService(db)
    
    for file in files:
        try:
            file_content = await file.read()
            attachment = attachment_service.upload_attachment(
                batch_id=batch_id,
                original_name=file.filename,
                file_content=file_content,
                attachment_type=attachment_type,
                operator=operator,
            )
            results["success"].append({
                "file_name": file.filename,
                "attachment_id": attachment.id,
            })
        except Exception as e:
            results["failed"].append({
                "file_name": file.filename,
                "error": str(e),
            })
    
    success_count = len(results["success"])
    failed_count = len(results["failed"])
    
    return OperationResponse(
        success=failed_count == 0,
        message=f"上传完成: 成功 {success_count} 个, 失败 {failed_count} 个",
        data=results,
    )


@router.get("/batch/{batch_id}", response_model=AttachmentListResponse)
def list_batch_attachments(
    batch_id: str,
    attachment_type: Optional[str] = Query(None, description="按类型筛选"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    attachment_service = AttachmentService(db)
    attachments = attachment_service.get_attachments(
        batch_id=batch_id,
        attachment_type=attachment_type,
    )
    
    paginated = attachments[skip:skip + limit]
    
    return AttachmentListResponse(
        total=len(attachments),
        items=[AttachmentResponse.model_validate(a) for a in paginated],
    )


@router.get("/{attachment_id}", response_model=AttachmentResponse)
def get_attachment(attachment_id: str, db: Session = Depends(get_db)):
    attachment_service = AttachmentService(db)
    attachment = attachment_service.get_attachment(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")
    return AttachmentResponse.model_validate(attachment)


@router.get("/{attachment_id}/download")
def download_attachment(attachment_id: str, db: Session = Depends(get_db)):
    attachment_service = AttachmentService(db)
    attachment = attachment_service.get_attachment(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")
    
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_name,
        media_type=attachment.file_type or "application/octet-stream",
    )


@router.delete("/{attachment_id}", response_model=OperationResponse)
def delete_attachment(
    attachment_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    attachment_service = AttachmentService(db)
    success = attachment_service.delete_attachment(attachment_id, operator)
    if not success:
        raise HTTPException(status_code=404, detail="附件不存在")
    
    return OperationResponse(
        success=True,
        message="附件删除成功",
    )


@router.post("/{attachment_id}/parse-zip", response_model=OperationResponse)
def parse_zip_archive(
    attachment_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    attachment_service = AttachmentService(db)
    
    try:
        parsed_data = attachment_service.parse_zip_archive(
            batch_id=None,
            attachment_id=attachment_id,
            operator=operator,
        )
    except ValueError as e:
        attachment = attachment_service.get_attachment(attachment_id)
        if not attachment:
            raise HTTPException(status_code=404, detail="附件不存在")
        parsed_data = attachment_service.parse_zip_archive(
            batch_id=attachment.batch_id,
            attachment_id=attachment_id,
            operator=operator,
        )
    
    return OperationResponse(
        success=True,
        message=f"压缩包解析完成，包含 {len(parsed_data['extracted_files'])} 个文件",
        data=parsed_data,
    )


@router.post("/{attachment_id}/import-zip", response_model=OperationResponse)
def import_from_zip_archive(
    attachment_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    attachment_service = AttachmentService(db)
    attachment = attachment_service.get_attachment(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")
    
    try:
        results = attachment_service.import_from_zip(
            batch_id=attachment.batch_id,
            attachment_id=attachment_id,
            operator=operator,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return OperationResponse(
        success=True,
        message="压缩包数据导入完成",
        data=results,
    )


@router.post("/batch/{batch_id}/upload-and-import-zip", response_model=OperationResponse)
async def upload_and_import_zip(
    batch_id: str,
    file: UploadFile = File(..., description="历史数据压缩包（ZIP格式）"),
    operator: str = Form(..., description="操作人"),
    description: Optional[str] = Form(None, description="压缩包描述"),
    db: Session = Depends(get_db),
):
    try:
        if not file.filename.lower().endswith(".zip"):
            raise HTTPException(status_code=400, detail="仅支持ZIP格式文件")
        
        file_content = await file.read()
        
        attachment_service = AttachmentService(db)
        attachment = attachment_service.upload_attachment(
            batch_id=batch_id,
            original_name=file.filename,
            file_content=file_content,
            attachment_type="history_archive",
            operator=operator,
            description=description or "历史压缩包导入",
        )
        
        results = attachment_service.import_from_zip(
            batch_id=batch_id,
            attachment_id=attachment.id,
            operator=operator,
        )
        
        return OperationResponse(
            success=True,
            message=f"历史压缩包 {file.filename} 上传并导入完成",
            data={
                "attachment_id": attachment.id,
                "parsed_files": len(results["parsed_data"]["extracted_files"]),
                "import_results": results["import_results"],
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")
