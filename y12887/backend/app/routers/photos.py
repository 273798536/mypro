from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from ..database import get_db
from ..models import InspectionRecord

router = APIRouter()

PHOTO_STORAGE_PATH = os.environ.get("PHOTO_STORAGE_PATH", "/Users/mac/pro/solo/workspaces/y12887/backend/photos")


@router.get("/inspection/{inspection_id}", summary="获取巡检照片")
def get_inspection_photo(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    根据巡检记录ID获取照片

    - **inspection_id**: 巡检记录ID
    - 支持本地文件系统存储
    """
    inspection = db.query(InspectionRecord)\
                   .filter(InspectionRecord.id == inspection_id)\
                   .first()

    if not inspection:
        raise HTTPException(status_code=404, detail="巡检记录不存在")

    if not inspection.photo_path:
        raise HTTPException(status_code=404, detail="该巡检记录无照片")

    photo_path = inspection.photo_path

    if not os.path.isabs(photo_path):
        photo_path = os.path.join(PHOTO_STORAGE_PATH, photo_path)

    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail=f"照片文件不存在: {photo_path}")

    filename = inspection.photo_name or os.path.basename(photo_path)

    return FileResponse(
        photo_path,
        media_type="image/jpeg",
        filename=filename
    )


@router.get("/preview/{inspection_id}", summary="获取照片预览信息")
def get_photo_preview(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """
    获取照片预览信息（不返回文件内容）

    - 返回照片路径、名称、是否存在等信息
    - 用于列表页快速判断是否有照片
    """
    inspection = db.query(InspectionRecord)\
                   .filter(InspectionRecord.id == inspection_id)\
                   .first()

    if not inspection:
        raise HTTPException(status_code=404, detail="巡检记录不存在")

    photo_path = inspection.photo_path
    exists = False
    full_path = None

    if photo_path:
        if not os.path.isabs(photo_path):
            full_path = os.path.join(PHOTO_STORAGE_PATH, photo_path)
        else:
            full_path = photo_path
        exists = os.path.exists(full_path)

    return {
        "inspection_id": inspection_id,
        "has_photo": photo_path is not None,
        "photo_name": inspection.photo_name,
        "photo_path": photo_path,
        "full_path": full_path,
        "file_exists": exists,
        "api_url": f"/api/photos/inspection/{inspection_id}"
    }
