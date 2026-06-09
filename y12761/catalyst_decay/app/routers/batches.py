from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Batch, BatchStatus, ExperimentRecord, TemperatureCurve, DataIssue, IssueSeverity
from app.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, BatchDetailResponse,
    PaginatedBatchesResponse, ExperimentRecordResponse,
    TemperatureCurveResponse
)
from datetime import datetime

router = APIRouter(prefix="/api/batches", tags=["批次管理"])


@router.get("", response_model=PaginatedBatchesResponse)
def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[BatchStatus] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (Batch.batch_no.like(like)) | (Batch.catalyst_name.like(like))
        )

    total = query.count()
    items = query.order_by(Batch.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedBatchesResponse(
        items=items, total=total, page=page, page_size=page_size
    )


@router.post("", response_model=BatchResponse)
def create_batch(data: BatchCreate, db: Session = Depends(get_db)):
    existing = db.query(Batch).filter(Batch.batch_no == data.batch_no).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"批次号 {data.batch_no} 已存在")

    batch = Batch(
        batch_no=data.batch_no,
        catalyst_name=data.catalyst_name,
        operator=data.operator,
        import_remark=data.import_remark,
        status=BatchStatus.DRAFT
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=BatchDetailResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    exp_count = db.query(ExperimentRecord).filter(ExperimentRecord.batch_id == batch_id).count()
    curve_count = db.query(TemperatureCurve).filter(TemperatureCurve.batch_id == batch_id).count()
    issue_count = db.query(DataIssue).filter(DataIssue.batch_id == batch_id).count()
    unresolved_count = db.query(DataIssue).filter(
        DataIssue.batch_id == batch_id, DataIssue.is_resolved == False
    ).count()

    result = BatchDetailResponse(
        id=batch.id,
        batch_no=batch.batch_no,
        catalyst_name=batch.catalyst_name,
        status=batch.status,
        operator=batch.operator,
        reviewer=batch.reviewer,
        import_remark=batch.import_remark,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        completed_at=batch.completed_at,
        experiment_count=exp_count,
        curve_point_count=curve_count,
        issue_count=issue_count,
        unresolved_issue_count=unresolved_count
    )
    return result


@router.put("/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, data: BatchUpdate, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if data.catalyst_name is not None:
        batch.catalyst_name = data.catalyst_name
    if data.operator is not None:
        batch.operator = data.operator
    if data.reviewer is not None:
        batch.reviewer = data.reviewer
    if data.import_remark is not None:
        batch.import_remark = data.import_remark
    batch.updated_at = datetime.now()

    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    db.delete(batch)
    db.commit()
    return {"message": "删除成功"}


@router.get("/{batch_id}/experiments", response_model=list[ExperimentRecordResponse])
def get_batch_experiments(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch.experiment_records


@router.get("/{batch_id}/curves", response_model=list[TemperatureCurveResponse])
def get_batch_curves(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db.query(TemperatureCurve).filter(
        TemperatureCurve.batch_id == batch_id
    ).order_by(TemperatureCurve.time_point.asc()).all()
