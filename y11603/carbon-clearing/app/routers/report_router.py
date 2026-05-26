from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.report_service import (
    generate_audit_report, export_report_json, export_report_excel
)

router = APIRouter()


@router.get("/audit/{reconciliation_id}")
def get_audit_report(reconciliation_id: int, db: Session = Depends(get_db)):
    report = generate_audit_report(db, reconciliation_id)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    return report


@router.get("/audit/{reconciliation_id}/export/json")
def export_json(reconciliation_id: int, db: Session = Depends(get_db)):
    json_str = export_report_json(db, reconciliation_id)
    from app.models.models import Reconciliation
    rec = db.query(Reconciliation).filter(Reconciliation.id == reconciliation_id).first()
    filename = f"audit_report_{reconciliation_id}_{rec.period if rec else 'unknown'}.json"
    return JSONResponse(
        content=json_str,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
        media_type="application/json",
    )


@router.get("/audit/{reconciliation_id}/export/excel")
def export_excel(reconciliation_id: int, db: Session = Depends(get_db)):
    filepath = export_report_excel(db, reconciliation_id)
    if not filepath:
        raise HTTPException(status_code=400, detail="导出失败，缺少openpyxl库")
    import os
    filename = os.path.basename(filepath)
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )