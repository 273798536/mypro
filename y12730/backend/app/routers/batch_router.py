from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.batch_service import (
    create_batch, get_batch, list_batches, count_batches,
    get_batch_detail, create_snapshot, list_snapshots, compare_snapshots
)
from app.services.import_service import (
    import_questions, import_params, list_questions, list_params, get_question
)
from app.schemas import (
    ProcessBatchCreate, ProcessBatch, BatchDetailResponse,
    BatchListResponse, ImportResponse, QuestionItem, ParamRecord,
    HistorySnapshotCreate, HistorySnapshot
)
from app.models import BatchStatus

router = APIRouter(prefix="/api/batches", tags=["批次管理"])


@router.post("", response_model=ProcessBatch)
def create_new_batch(batch_in: ProcessBatchCreate, db: Session = Depends(get_db)):
    return create_batch(db, batch_in)


@router.get("", response_model=BatchListResponse)
def get_batches(
    skip: int = 0, limit: int = 100,
    status: Optional[BatchStatus] = Query(None),
    db: Session = Depends(get_db)
):
    items = list_batches(db, skip=skip, limit=limit, status=status)
    total = count_batches(db, status=status)
    return BatchListResponse(total=total, items=items)


@router.get("/{batch_id}", response_model=ProcessBatch)
def get_single_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.get("/{batch_id}/detail", response_model=BatchDetailResponse)
def get_single_batch_detail(batch_id: int, db: Session = Depends(get_db)):
    data = get_batch_detail(db, batch_id)
    if not data:
        raise HTTPException(status_code=404, detail="批次不存在")
    return BatchDetailResponse(**data)


@router.post("/{batch_id}/import/questions", response_model=ImportResponse)
async def upload_questions(
    batch_id: int,
    file: UploadFile = File(...),
    source_remark_prefix: str = Form(""),
    db: Session = Depends(get_db)
):
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    content = await file.read()
    imported, warnings = import_questions(db, batch_id, content, file.filename, source_remark_prefix)
    msg = f"成功导入 {imported} 条题目"
    if warnings:
        msg += f"，警告：{'; '.join(warnings)}"
    return ImportResponse(
        success=True, message=msg, batch_id=batch_id,
        questions_imported=imported, params_imported=0
    )


@router.post("/{batch_id}/import/params", response_model=ImportResponse)
async def upload_params(
    batch_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    content = await file.read()
    imported, warnings = import_params(db, batch_id, content, file.filename)
    msg = f"成功导入 {imported} 条参数"
    if warnings:
        msg += f"，警告：{'; '.join(warnings)}"
    return ImportResponse(
        success=True, message=msg, batch_id=batch_id,
        questions_imported=0, params_imported=imported
    )


@router.get("/{batch_id}/questions", response_model=List[QuestionItem])
def get_batch_questions(
    batch_id: int, skip: int = 0, limit: int = 100,
    keyword: str = "", db: Session = Depends(get_db)
):
    return list_questions(db, batch_id, skip=skip, limit=limit, keyword=keyword)


@router.get("/{batch_id}/params", response_model=List[ParamRecord])
def get_batch_params(
    batch_id: int, question_code: str = "",
    skip: int = 0, limit: int = 200, db: Session = Depends(get_db)
):
    return list_params(db, batch_id, question_code=question_code, skip=skip, limit=limit)


@router.get("/questions/{question_id}", response_model=QuestionItem)
def get_single_question(question_id: int, db: Session = Depends(get_db)):
    q = get_question(db, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    return q


@router.post("/{batch_id}/snapshots", response_model=HistorySnapshot)
def create_batch_snapshot(
    batch_id: int, snapshot_in: HistorySnapshotCreate,
    db: Session = Depends(get_db)
):
    return create_snapshot(db, batch_id, snapshot_in.snapshot_name,
                           snapshot_in.snapshot_type, snapshot_in.snapshot_data,
                           snapshot_in.created_by)


@router.get("/{batch_id}/snapshots", response_model=List[HistorySnapshot])
def get_batch_snapshots(
    batch_id: int, skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db)
):
    return list_snapshots(db, batch_id, skip=skip, limit=limit)


@router.get("/snapshots/compare")
def do_compare_snapshots(snapshot_id_1: int, snapshot_id_2: int, db: Session = Depends(get_db)):
    return compare_snapshots(db, snapshot_id_1, snapshot_id_2)


@router.get("/snapshots/all", response_model=List[HistorySnapshot])
def get_all_snapshots(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_snapshots(db, batch_id=None, skip=skip, limit=limit)
