from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/schedules", tags=["琴房排期"])


@router.post("", response_model=schemas.PianoSchedule, summary="创建琴房排期")
def create_schedule(data: schemas.PianoScheduleCreate, db: Session = Depends(get_db)):
    return crud.create_piano_schedule(db, data)


@router.get("", response_model=List[schemas.PianoSchedule], summary="查看琴房排期列表")
def list_schedules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_piano_schedules(db, skip=skip, limit=limit)


@router.get("/{sched_id}", response_model=schemas.PianoSchedule, summary="查看单条排期详情")
def get_schedule(sched_id: int, db: Session = Depends(get_db)):
    sched = crud.get_piano_schedule(db, sched_id)
    if not sched:
        raise HTTPException(status_code=404, detail="排期不存在")
    return sched


@router.patch("/{sched_id}/remark", response_model=schemas.PianoSchedule, summary="修改排期备注（改动进历史）")
def update_remark(
    sched_id: int,
    data: schemas.PianoScheduleUpdate,
    db: Session = Depends(get_db),
):
    sched = crud.update_piano_schedule_remark(db, sched_id, data.remark or "", data.operator)
    if not sched:
        raise HTTPException(status_code=404, detail="排期不存在")
    return sched


@router.post("/{sched_id}/withdraw", response_model=schemas.WithdrawalRecord, summary="撤回排期（与最后结论关联）")
def withdraw_schedule(
    sched_id: int,
    data: schemas.WithdrawalRecordCreate,
    db: Session = Depends(get_db),
):
    withdrawal = crud.withdraw_piano_schedule(
        db, sched_id, data.reason, data.operator, data.conflict_id, data.conclusion
    )
    if not withdrawal:
        raise HTTPException(status_code=404, detail="排期不存在")
    return withdrawal
