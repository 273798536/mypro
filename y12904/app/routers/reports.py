from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ReportExportRequest
from app.services.report_service import export_report

router = APIRouter(prefix="/api/reports", tags=["报告导出"])


@router.post("/export")
def export_report_api(data: ReportExportRequest, db: Session = Depends(get_db)):
    try:
        content = export_report(db, data.task_id, data.format)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if data.format == "html":
        return HTMLResponse(content=content)
    return PlainTextResponse(content=content)


@router.get("/{task_id}/markdown")
def get_markdown_report(task_id: int, db: Session = Depends(get_db)):
    try:
        content = export_report(db, task_id, "markdown")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return PlainTextResponse(content=content)


@router.get("/{task_id}/html")
def get_html_report(task_id: int, db: Session = Depends(get_db)):
    try:
        content = export_report(db, task_id, "html")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return HTMLResponse(content=content)
