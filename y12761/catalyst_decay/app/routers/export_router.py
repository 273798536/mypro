from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
from app.database import get_db
from app.models import Batch
from app.services.export_service import export_batch_report

router = APIRouter(prefix="/api/export", tags=["报告导出"])


@router.post("/{batch_id}/report")
def generate_report(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        filepath = export_batch_report(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告生成失败: {str(e)}")

    filename = os.path.basename(filepath)
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
