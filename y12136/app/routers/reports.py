from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from ..database import get_db
from .. import schemas, crud
from ..report_exporter import ReportExporter

router = APIRouter(prefix="/api/reports", tags=["报表导出"])


@router.get("/efficiency", response_model=schemas.EfficiencyReport)
def get_efficiency_report(
    start_time: Optional[datetime] = Query(None, description="开始时间，默认取当月1号"),
    end_time: Optional[datetime] = Query(None, description="结束时间，默认取当前时间"),
    equipment_id: Optional[str] = Query(None, description="设备ID，不传则查所有设备"),
    db: Session = Depends(get_db)
):
    if not start_time:
        now = datetime.now()
        start_time = datetime(now.year, now.month, 1)
    if not end_time:
        end_time = datetime.now()

    return crud.generate_efficiency_report(db, start_time, end_time, equipment_id)


@router.get("/efficiency/export")
def export_efficiency_report(
    start_time: Optional[datetime] = Query(None, description="开始时间，默认取当月1号"),
    end_time: Optional[datetime] = Query(None, description="结束时间，默认取当前时间"),
    equipment_id: Optional[str] = Query(None, description="设备ID，不传则查所有设备"),
    format: str = Query("excel", description="导出格式: excel 或 text"),
    db: Session = Depends(get_db)
):
    if not start_time:
        now = datetime.now()
        start_time = datetime(now.year, now.month, 1)
    if not end_time:
        end_time = datetime.now()

    if format == "text":
        report_text = ReportExporter.generate_text_report(
            db, start_time, end_time, equipment_id
        )
        filename = f"效率报告_{start_time.strftime('%Y%m%d')}_{end_time.strftime('%Y%m%d')}.txt"
        return StreamingResponse(
            iter([report_text]),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        excel_data = ReportExporter.export_to_excel(
            db, start_time, end_time, equipment_id
        )
        filename = f"效率报告_{start_time.strftime('%Y%m%d')}_{end_time.strftime('%Y%m%d')}.xlsx"
        return StreamingResponse(
            iter([excel_data.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )


@router.get("/efficiency/text")
def get_text_report(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    equipment_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not start_time:
        now = datetime.now()
        start_time = datetime(now.year, now.month, 1)
    if not end_time:
        end_time = datetime.now()

    report_text = ReportExporter.generate_text_report(
        db, start_time, end_time, equipment_id
    )
    return {"report": report_text}
