from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.crud import BatchCRUD
from app.services.report import ReportService

router = APIRouter(prefix="/api/reports", tags=["报告导出"])


@router.get("/batches/{batch_id}", summary="获取报告数据(JSON)")
def get_report_data(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    try:
        return ReportService.build_report_data(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/export/excel", summary="导出Excel报告")
def export_excel(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    try:
        filename, filepath = ReportService.export_excel(db, batch_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.post("/batches/{batch_id}/export/json", summary="导出JSON报告")
def export_json(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    try:
        filename, filepath, data = ReportService.export_json(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return JSONResponse(content=data, headers=headers)
