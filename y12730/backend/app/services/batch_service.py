from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import ProcessBatch, QuestionItem, ParamRecord, ConflictRecord, ReviewRecord, ErrorAnalysis, HistorySnapshot, ExportReport, BatchStatus, AnomalyCategory, ResultGrade
from app.schemas import ProcessBatchCreate
from datetime import datetime
from typing import Optional, List


def create_batch(db: Session, batch_in: ProcessBatchCreate) -> ProcessBatch:
    batch = ProcessBatch(
        batch_name=batch_in.batch_name,
        remark=batch_in.remark,
        operator=batch_in.operator,
        status=BatchStatus.PENDING_IMPORT
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def get_batch(db: Session, batch_id: int) -> Optional[ProcessBatch]:
    return db.query(ProcessBatch).filter(ProcessBatch.id == batch_id).first()


def list_batches(db: Session, skip: int = 0, limit: int = 100, status: Optional[BatchStatus] = None) -> List[ProcessBatch]:
    query = db.query(ProcessBatch)
    if status:
        query = query.filter(ProcessBatch.status == status)
    return query.order_by(ProcessBatch.created_at.desc()).offset(skip).limit(limit).all()


def count_batches(db: Session, status: Optional[BatchStatus] = None) -> int:
    query = db.query(func.count(ProcessBatch.id))
    if status:
        query = query.filter(ProcessBatch.status == status)
    return query.scalar() or 0


def update_batch_status(db: Session, batch_id: int, status: BatchStatus) -> Optional[ProcessBatch]:
    batch = get_batch(db, batch_id)
    if batch:
        batch.status = status
        batch.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(batch)
    return batch


def get_batch_detail(db: Session, batch_id: int) -> dict:
    batch = get_batch(db, batch_id)
    if not batch:
        return {}

    return {
        "batch": batch,
        "questions_count": db.query(func.count(QuestionItem.id)).filter(QuestionItem.batch_id == batch_id).scalar() or 0,
        "param_records_count": db.query(func.count(ParamRecord.id)).filter(ParamRecord.batch_id == batch_id).scalar() or 0,
        "conflicts_count": db.query(func.count(ConflictRecord.id)).filter(ConflictRecord.batch_id == batch_id).scalar() or 0,
        "conflicts_unresolved_count": db.query(func.count(ConflictRecord.id)).filter(
            ConflictRecord.batch_id == batch_id,
            ConflictRecord.is_resolved == False
        ).scalar() or 0,
        "reviews_count": db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.batch_id == batch_id).scalar() or 0,
        "error_analyses_count": db.query(func.count(ErrorAnalysis.id)).filter(ErrorAnalysis.batch_id == batch_id).scalar() or 0,
        "excessive_errors_count": db.query(func.count(ErrorAnalysis.id)).filter(
            ErrorAnalysis.batch_id == batch_id,
            ErrorAnalysis.is_excessive == True
        ).scalar() or 0
    }


def create_snapshot(db: Session, batch_id: int, snapshot_name: str, snapshot_type: str,
                    snapshot_data: str, created_by: Optional[str] = None) -> HistorySnapshot:
    snapshot = HistorySnapshot(
        batch_id=batch_id,
        snapshot_name=snapshot_name,
        snapshot_type=snapshot_type,
        snapshot_data=snapshot_data,
        created_by=created_by
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def list_snapshots(db: Session, batch_id: Optional[int] = None, skip: int = 0, limit: int = 50) -> List[HistorySnapshot]:
    query = db.query(HistorySnapshot)
    if batch_id:
        query = query.filter(HistorySnapshot.batch_id == batch_id)
    return query.order_by(HistorySnapshot.created_at.desc()).offset(skip).limit(limit).all()


def compare_snapshots(db: Session, snapshot_id_1: int, snapshot_id_2: int) -> dict:
    s1 = db.query(HistorySnapshot).filter(HistorySnapshot.id == snapshot_id_1).first()
    s2 = db.query(HistorySnapshot).filter(HistorySnapshot.id == snapshot_id_2).first()
    if not s1 or not s2:
        return {"error": "快照不存在"}
    return {
        "snapshot1": s1,
        "snapshot2": s2,
        "comparison": f"对比 {s1.snapshot_name} 与 {s2.snapshot_name}"
    }
