from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import schemas
from app.services.trace_service import trace_record, trace_by_identity
from app.services.history_service import list_history_batches, compare_batches
from app.services.export_service import export_records_to_excel
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/api", tags=["追溯/历史/导出"])


@router.get("/trace/{record_id}", response_model=schemas.TraceRecord)
def get_trace(record_id: int, db: Session = Depends(get_db)):
    result = trace_record(db, record_id)
    if not result:
        raise HTTPException(status_code=404, detail="记录不存在，无法追溯")
    return result


@router.get("/trace/search")
def search_records(
    student_id: Optional[str] = None,
    subject: Optional[str] = None,
    unit_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if not any([student_id, subject, unit_name]):
        raise HTTPException(status_code=400, detail="至少提供一个检索条件")
    records = trace_by_identity(db, student_id, subject, unit_name)
    return {"total": len(records), "items": records}


@router.get("/history/compare-list", response_model=List[schemas.HistoryCompareItem])
def get_history_compare_list(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return list_history_batches(db, start_date, end_date, limit)


@router.get("/history/compare")
def compare_two_batches(
    batch_a: str,
    batch_b: str,
    db: Session = Depends(get_db),
):
    result = compare_batches(db, batch_a, batch_b)
    if not result:
        raise HTTPException(status_code=404, detail="指定的批次不存在")
    return result


@router.get("/export")
def export_excel(
    batch_id: Optional[int] = None,
    status: Optional[str] = None,
    only_issues: bool = False,
    db: Session = Depends(get_db),
):
    data = export_records_to_excel(db, batch_id=batch_id, status=status, only_issues=only_issues)
    filename = f"多项式外推警报报告_{__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
