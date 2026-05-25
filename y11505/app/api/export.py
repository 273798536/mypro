from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.core.database import get_db
from app.services import BatchService, ExportService

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/batch/{batch_id}/summary")
def export_batch_summary(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    export_service = ExportService(db)
    summary = export_service.export_for_head_nurse(batch, operator)
    
    return {
        "success": True,
        "message": "护士长视图导出成功",
        "data": summary,
    }


@router.get("/batch/{batch_id}/excel")
def export_batch_excel(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    export_service = ExportService(db)
    filepath = export_service.export_to_excel(batch, operator)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=500, detail="文件生成失败")
    
    filename = os.path.basename(filepath)
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/batch/{batch_id}/details")
def get_batch_details(
    batch_id: str,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    export_service = ExportService(db)
    details = export_service.generate_batch_details(batch)
    
    return {
        "success": True,
        "data": details,
    }


@router.get("/batch/{batch_id}/freeze-comparison")
def get_freeze_comparison(
    batch_id: str,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    export_service = ExportService(db)
    summary = export_service.generate_batch_summary(batch)
    
    comparison = {
        "batch_info": {
            "batch_no": summary["batch_no"],
            "batch_name": summary["batch_name"],
            "department": summary["department"],
        },
        "freeze_info": {
            "status_before_freeze": summary["status_before_freeze"],
            "current_status": summary["current_status"],
            "freeze_reason": summary["freeze_reason"],
            "freeze_operator": summary["freeze_operator"],
            "freeze_time": summary["freeze_time"],
        },
        "statistics": {
            "total_records": summary["record_count"],
            "abnormal_count": summary["abnormal_count"],
        },
        "status_distribution": summary["status_distribution"],
    }
    
    return {
        "success": True,
        "data": comparison,
    }
