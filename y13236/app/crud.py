from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app import models, schemas
from app.models import (
    PianoSchedule, StageChannel, Repertoire, ConflictRecord,
    WithdrawalRecord, OperationHistory, ConflictStatus, OperationField
)


def create_repertoire(db: Session, obj_in: schemas.RepertoireCreate) -> Repertoire:
    db_obj = Repertoire(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_repertoire(db: Session, rep_id: int) -> Optional[Repertoire]:
    return db.query(Repertoire).filter(Repertoire.id == rep_id).first()


def list_repertoires(db: Session, skip: int = 0, limit: int = 100) -> List[Repertoire]:
    return db.query(Repertoire).offset(skip).limit(limit).all()


def create_stage_channel(db: Session, obj_in: schemas.StageChannelCreate) -> StageChannel:
    data = obj_in.model_dump()
    from app.detector import timecode_to_seconds
    data["start_seconds"] = timecode_to_seconds(data.get("start_timecode"))
    data["end_seconds"] = timecode_to_seconds(data.get("end_timecode"))
    db_obj = StageChannel(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_stage_channel(db: Session, channel_id: int) -> Optional[StageChannel]:
    return db.query(StageChannel).filter(StageChannel.id == channel_id).first()


def list_stage_channels(db: Session, skip: int = 0, limit: int = 100) -> List[StageChannel]:
    return db.query(StageChannel).offset(skip).limit(limit).all()


def create_piano_schedule(db: Session, obj_in: schemas.PianoScheduleCreate) -> PianoSchedule:
    db_obj = PianoSchedule(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_piano_schedule(db: Session, sched_id: int) -> Optional[PianoSchedule]:
    return db.query(PianoSchedule).filter(PianoSchedule.id == sched_id).first()


def list_piano_schedules(db: Session, skip: int = 0, limit: int = 100) -> List[PianoSchedule]:
    return db.query(PianoSchedule).offset(skip).limit(limit).all()


def update_piano_schedule_remark(
    db: Session, sched_id: int, remark: str, operator: str
) -> Optional[PianoSchedule]:
    sched = db.query(PianoSchedule).filter(PianoSchedule.id == sched_id).first()
    if not sched:
        return None
    old_remark = sched.remark
    sched.remark = remark
    history = OperationHistory(
        schedule_id=sched_id,
        field_name=OperationField.REMARK,
        old_value=old_remark,
        new_value=remark,
        operator=operator,
    )
    db.add(history)
    db.commit()
    db.refresh(sched)
    return sched


def withdraw_piano_schedule(
    db: Session,
    sched_id: int,
    reason: str,
    operator: str,
    conflict_id: Optional[int] = None,
    conclusion: Optional[str] = None,
) -> Optional[WithdrawalRecord]:
    sched = db.query(PianoSchedule).filter(PianoSchedule.id == sched_id).first()
    if not sched:
        return None
    sched.is_withdrawn = True
    withdrawal = WithdrawalRecord(
        schedule_id=sched_id,
        conflict_id=conflict_id,
        reason=reason,
        operator=operator,
        conclusion=conclusion,
    )
    db.add(withdrawal)
    if conflict_id:
        conflict = db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()
        if conflict:
            conflict.status = ConflictStatus.WITHDRAWN
            conflict.conclusion = conclusion
            conflict.operator = operator
            conflict.resolved_at = datetime.now()
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


def list_conflicts(
    db: Session,
    filters: Optional[schemas.ConflictQueueFilter] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[ConflictRecord]:
    query = db.query(ConflictRecord).join(
        PianoSchedule, ConflictRecord.schedule_id == PianoSchedule.id
    )
    if filters:
        if filters.conflict_type:
            query = query.filter(ConflictRecord.conflict_type == filters.conflict_type)
        if filters.status:
            query = query.filter(ConflictRecord.status == filters.status)
        if filters.piano_room_id:
            query = query.filter(PianoSchedule.piano_room_id == filters.piano_room_id)
        if filters.performer:
            query = query.filter(PianoSchedule.performer == filters.performer)
        if filters.schedule_date_from:
            query = query.filter(PianoSchedule.schedule_date >= filters.schedule_date_from)
        if filters.schedule_date_to:
            query = query.filter(PianoSchedule.schedule_date <= filters.schedule_date_to)
        if filters.operator:
            query = query.filter(ConflictRecord.operator == filters.operator)
    return query.offset(skip).limit(limit).all()


def get_conflict(db: Session, conflict_id: int) -> Optional[ConflictRecord]:
    return db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()


def update_conflict_status(
    db: Session, conflict_id: int, status: str, operator: str, conclusion: Optional[str] = None
) -> Optional[ConflictRecord]:
    conflict = db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()
    if not conflict:
        return None
    old_status = conflict.status
    old_conclusion = conflict.conclusion
    conflict.status = status
    if conclusion is not None:
        conflict.conclusion = conclusion
    conflict.operator = operator
    if status in (ConflictStatus.RESOLVED, ConflictStatus.IGNORED, ConflictStatus.WITHDRAWN):
        conflict.resolved_at = datetime.now()
    if old_status != status:
        history = OperationHistory(
            conflict_id=conflict_id,
            field_name=OperationField.STATUS,
            old_value=old_status,
            new_value=status,
            operator=operator,
        )
        db.add(history)
    if conclusion is not None and old_conclusion != conclusion:
        history = OperationHistory(
            conflict_id=conflict_id,
            field_name=OperationField.CONCLUSION,
            old_value=old_conclusion,
            new_value=conclusion,
            operator=operator,
        )
        db.add(history)
    db.commit()
    db.refresh(conflict)
    return conflict


def list_withdrawals(db: Session, skip: int = 0, limit: int = 100) -> List[WithdrawalRecord]:
    return db.query(WithdrawalRecord).offset(skip).limit(limit).all()


def list_operation_histories(
    db: Session,
    schedule_id: Optional[int] = None,
    conflict_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[OperationHistory]:
    query = db.query(OperationHistory)
    if schedule_id:
        query = query.filter(OperationHistory.schedule_id == schedule_id)
    if conflict_id:
        query = query.filter(OperationHistory.conflict_id == conflict_id)
    return query.order_by(OperationHistory.created_at.desc()).offset(skip).limit(limit).all()


def export_conflicts_to_rows(
    db: Session,
    filters: Optional[schemas.ConflictQueueFilter] = None,
) -> List[Dict[str, Any]]:
    conflicts = list_conflicts(db, filters=filters, skip=0, limit=10000)
    rows = []
    for c in conflicts:
        sched = c.schedule
        row = {
            "冲突ID": c.id,
            "冲突类型": c.conflict_type,
            "状态": c.status,
            "描述": c.description,
            "排期ID": c.schedule_id,
            "关联排期ID": c.related_schedule_id,
            "琴房编号": sched.piano_room_id if sched else "",
            "排期日期": sched.schedule_date.isoformat() if sched else "",
            "开始时间": sched.start_time.strftime("%H:%M:%S") if sched else "",
            "结束时间": sched.end_time.strftime("%H:%M:%S") if sched else "",
            "演奏者": sched.performer if sched else "",
            "原始来源": c.raw_source or "",
            "时码偏差(秒)": c.timecode_deviation_seconds or "",
            "处理人": c.operator or "",
            "最后结论": c.conclusion or "",
            "创建时间": c.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "筛选口径": str(c.filter_criteria) if c.filter_criteria else "",
        }
        rows.append(row)
    return rows
