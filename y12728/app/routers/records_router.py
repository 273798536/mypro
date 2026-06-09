from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ScoreRecord, DataIssue, ReviewLog
from app.schemas import schemas
from app.services.review_service import (
    update_record_status, correct_record_fields, resolve_issue,
    batch_approve, get_review_logs,
)

router = APIRouter(prefix="/api/records", tags=["评分记录与审核"])


@router.get("", response_model=schemas.PaginatedResponse)
def list_records(
    batch_id: Optional[int] = None,
    status: Optional[str] = None,
    only_issues: bool = False,
    only_missing_unit: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(ScoreRecord)
    if batch_id:
        query = query.filter(ScoreRecord.batch_id == batch_id)
    if status:
        query = query.filter(ScoreRecord.status == status)
    if only_issues:
        from sqlalchemy import or_
        query = query.filter(or_(
            ScoreRecord.unit_missing == True,
            ScoreRecord.is_duplicate == True,
        ))
    if only_missing_unit:
        query = query.filter(ScoreRecord.unit_missing == True)

    total = query.count()
    items = query.order_by(ScoreRecord.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return schemas.PaginatedResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{record_id}", response_model=schemas.ScoreRecordDetail)
def get_record(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(ScoreRecord).filter(ScoreRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    issues = db.query(DataIssue).filter(DataIssue.record_id == record_id).all()
    logs = get_review_logs(db, record_id)
    return schemas.ScoreRecordDetail(
        id=rec.id,
        batch_id=rec.batch_id,
        row_no=rec.row_no,
        student_id=rec.student_id,
        student_name=rec.student_name,
        class_name=rec.class_name,
        subject=rec.subject,
        unit_name=rec.unit_name,
        unit_missing=rec.unit_missing,
        score_origin=rec.score_origin,
        score_extrapolated=rec.score_extrapolated,
        alarm_level=rec.alarm_level,
        alarm_flag=rec.alarm_flag,
        remark_raw=rec.remark_raw,
        remark_clean=rec.remark_clean,
        is_duplicate=rec.is_duplicate,
        duplicate_of_id=rec.duplicate_of_id,
        status=rec.status,
        reviewed_by=rec.reviewed_by,
        reviewed_at=rec.reviewed_at,
        review_note=rec.review_note,
        score_original_value=rec.score_original_value,
        score_corrected_value=rec.score_corrected_value,
        alarm_original_level=rec.alarm_original_level,
        alarm_corrected_level=rec.alarm_corrected_level,
        corrected_by=rec.corrected_by,
        corrected_at=rec.corrected_at,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
        batch=rec.batch,
        issues=issues,
        review_logs=logs,
    )


@router.put("/{record_id}/status", response_model=schemas.ScoreRecord)
def update_status(
    record_id: int,
    body: schemas.StatusUpdate,
    db: Session = Depends(get_db),
):
    rec = update_record_status(db, record_id, body.status, body.operator, body.review_note)
    if not rec:
        raise HTTPException(status_code=400, detail="状态更新失败：记录不存在或状态流转不合法")
    return rec


@router.put("/{record_id}/correct", response_model=schemas.ScoreRecord)
def correct_record(
    record_id: int,
    body: schemas.ScoreRecordUpdate,
    operator: str = Query("teacher"),
    db: Session = Depends(get_db),
):
    rec = correct_record_fields(
        db, record_id,
        operator=operator,
        score_corrected_value=body.score_corrected_value,
        alarm_corrected_level=body.alarm_corrected_level,
        review_note=body.review_note,
    )
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec


@router.post("/batch-approve")
def batch_approve_records(
    record_ids: List[int],
    operator: str = "teacher",
    note: Optional[str] = None,
    db: Session = Depends(get_db),
):
    count = batch_approve(db, record_ids, operator, note)
    return {"approved_count": count, "total_requested": len(record_ids)}


@router.get("/{record_id}/logs", response_model=List[schemas.ReviewLog])
def list_review_logs(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(ScoreRecord).filter(ScoreRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return get_review_logs(db, record_id)


@router.get("/{record_id}/issues", response_model=List[schemas.DataIssue])
def list_record_issues(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(ScoreRecord).filter(ScoreRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return db.query(DataIssue).filter(DataIssue.record_id == record_id).all()


@router.put("/issues/{issue_id}/resolve", response_model=schemas.DataIssue)
def mark_issue_resolved(
    issue_id: int,
    note: Optional[str] = None,
    operator: str = "teacher",
    db: Session = Depends(get_db),
):
    issue = resolve_issue(db, issue_id, note, operator)
    if not issue:
        raise HTTPException(status_code=404, detail="问题不存在")
    return issue
