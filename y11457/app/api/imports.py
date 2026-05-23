import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, RolePermission
from app.models import User, UserRole
from app.schemas import ImportBatchResponse
from app.import_service import ImportService
from app.config import settings

router = APIRouter(prefix="/import", tags=["数据导入"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    is_historical: bool = Form(False),
    city: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "import"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    if file_type not in ['leader_refund', 'warehouse_review', 'user_remark', 'manual_price_adjust']:
        raise HTTPException(status_code=400, detail="不支持的文件类型")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_path = os.path.join(settings.UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = ImportService.import_file(
            db=db,
            file_path=file_path,
            file_type=file_type,
            operator=current_user,
            is_historical=is_historical,
            city=city or current_user.city
        )
        
        return {
            "success": True,
            "batch_no": result["batch_no"],
            "total_count": result["total_count"],
            "success_count": result["success_count"],
            "failed_count": result["failed_count"],
            "message": f"导入完成：成功 {result['success_count']} 条，失败 {result['failed_count']} 条"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@router.get("/batches", response_model=list[ImportBatchResponse])
async def list_import_batches(
    city: Optional[str] = None,
    is_historical: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models import ImportBatch
    
    query = db.query(ImportBatch)
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(ImportBatch.city == current_user.city)
    elif city:
        query = query.filter(ImportBatch.city == city)
    
    if is_historical is not None:
        query = query.filter(ImportBatch.is_historical == is_historical)
    
    batches = query.order_by(ImportBatch.imported_at.desc()).offset(skip).limit(limit).all()
    return batches
