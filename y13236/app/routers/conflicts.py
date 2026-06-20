from typing import List, Optional
from datetime import datetime
from io import BytesIO
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_db
from app import crud, schemas
from app.detector import run_all_detections

router = APIRouter(prefix="/conflicts", tags=["冲突检测与异常队列"])


@router.post("/run", response_model=schemas.DetectionRunResult, summary="启动/重跑冲突检测")
def run_detection(
    db: Session = Depends(get_db),
):
    result = run_all_detections(db)
    return result


@router.get("/queue", response_model=List[schemas.ConflictRecord], summary="查看异常队列（支持筛选）")
def get_conflict_queue(
    conflict_type: Optional[str] = Query(None, description="冲突类型：room_time_overlap/file_repertoire_mismatch/timecode_deviation/performer_overlap"),
    status: Optional[str] = Query(None, description="状态：pending/resolved/ignored/withdrawn"),
    schedule_date_from: Optional[str] = Query(None, description="排期日期起 YYYY-MM-DD"),
    schedule_date_to: Optional[str] = Query(None, description="排期日期止 YYYY-MM-DD"),
    piano_room_id: Optional[str] = Query(None, description="琴房编号"),
    performer: Optional[str] = Query(None, description="演奏者"),
    operator: Optional[str] = Query(None, description="处理人"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    filters = schemas.ConflictQueueFilter(
        conflict_type=conflict_type,
        status=status,
        schedule_date_from=schedule_date_from,
        schedule_date_to=schedule_date_to,
        piano_room_id=piano_room_id,
        performer=performer,
        operator=operator,
    )
    return crud.list_conflicts(db, filters=filters, skip=skip, limit=limit)


@router.get("/{conflict_id}", response_model=schemas.ConflictRecord, summary="查看单条冲突详情")
def get_conflict_detail(conflict_id: int, db: Session = Depends(get_db)):
    conflict = crud.get_conflict(db, conflict_id)
    if not conflict:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return conflict


@router.patch("/{conflict_id}", response_model=schemas.ConflictRecord, summary="处理冲突（更新状态/结论）")
def resolve_conflict(
    conflict_id: int,
    data: schemas.ConflictRecordUpdate,
    db: Session = Depends(get_db),
):
    conflict = crud.update_conflict_status(
        db, conflict_id, data.status, data.operator, data.conclusion
    )
    if not conflict:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return conflict


@router.get("/export/download", summary="导出异常队列（与屏幕筛选口径一致）")
def export_conflicts(
    conflict_type: Optional[str] = Query(None, description="冲突类型"),
    status: Optional[str] = Query(None, description="状态"),
    schedule_date_from: Optional[str] = Query(None, description="排期日期起 YYYY-MM-DD"),
    schedule_date_to: Optional[str] = Query(None, description="排期日期止 YYYY-MM-DD"),
    piano_room_id: Optional[str] = Query(None, description="琴房编号"),
    performer: Optional[str] = Query(None, description="演奏者"),
    operator: Optional[str] = Query(None, description="处理人"),
    db: Session = Depends(get_db),
):
    filters = schemas.ConflictQueueFilter(
        conflict_type=conflict_type,
        status=status,
        schedule_date_from=schedule_date_from,
        schedule_date_to=schedule_date_to,
        piano_room_id=piano_room_id,
        performer=performer,
        operator=operator,
    )
    rows = crud.export_conflicts_to_rows(db, filters=filters)
    if not rows:
        raise HTTPException(status_code=404, detail="无符合条件的冲突记录")
    df = pd.DataFrame(rows)
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="异常队列")
    output.seek(0)
    filename = f"琴房课时排期冲突_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    safe_filename = quote(filename)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
        },
    )
