from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.crud import BatchCRUD, MaterialCRUD, QuestionCRUD, ChangeCRUD, RollbackCRUD, ReviewCRUD, RoutingCRUD
from app.services.business import ImportService, parse_excel_to_items
from app.schemas.schemas import (
    BatchCreate, BatchInfo, BatchDetail, MaterialSourceInfo,
    QuestionListInfo, QuestionDetail, QuestionImportItem,
    BatchImportResponse, RollbackLogInfo, ChangeRecordInfo,
    ReviewRecordInfo, ReportSummary
)

router = APIRouter(prefix="/api/batches", tags=["批次管理"])


@router.post("", response_model=BatchInfo, summary="创建空批次")
def create_batch(data: BatchCreate, db: Session = Depends(get_db)):
    batch = BatchCRUD.create(db, data)
    return batch


@router.post("/import", response_model=BatchImportResponse, summary="通过Excel导入批次")
async def import_batch(
    batch_name: str = Form(..., description="批次名称"),
    remark: Optional[str] = Form(None, description="批次备注"),
    importer: str = Form("reviewer", description="导入人"),
    file: UploadFile = File(..., description="Excel文件(.xlsx/.xls)"),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="只支持 .xlsx / .xls 文件")
    content = await file.read()
    try:
        raw_items = parse_excel_to_items(content, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel解析失败: {e}")
    items = [QuestionImportItem(**ri) for ri in raw_items]
    batch_data = BatchCreate(batch_name=batch_name, remark=remark, importer=importer)
    try:
        batch, warnings = ImportService.import_batch(
            db, batch_data, items, source_file=file.filename, source_bytes=content,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {e}")
    materials = MaterialCRUD.list_by_batch(db, batch.id)
    return BatchImportResponse(
        success=True,
        batch_id=batch.id,
        batch_no=batch.batch_no,
        total_imported=len(items),
        materials_created=len(materials),
        warnings=warnings,
    )


@router.post("/import-json", response_model=BatchImportResponse, summary="通过JSON批量导入")
def import_batch_json(
    batch_data: BatchCreate,
    items: List[QuestionImportItem],
    materials: Optional[List[dict]] = None,
    db: Session = Depends(get_db),
):
    try:
        batch, warnings = ImportService.import_batch(db, batch_data, items, materials=materials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {e}")
    mats = MaterialCRUD.list_by_batch(db, batch.id)
    return BatchImportResponse(
        success=True,
        batch_id=batch.id,
        batch_no=batch.batch_no,
        total_imported=len(items),
        materials_created=len(mats),
        warnings=warnings,
    )


@router.get("", response_model=List[BatchInfo], summary="批次列表")
def list_batches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return BatchCRUD.list(db, skip=skip, limit=limit)


@router.get("/{batch_id}", response_model=BatchDetail, summary="批次详情")
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.get("/{batch_id}/materials", response_model=List[MaterialSourceInfo], summary="批次材料列表")
def list_materials(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return MaterialCRUD.list_by_batch(db, batch_id)


@router.get("/{batch_id}/questions", response_model=List[QuestionListInfo], summary="批次题目列表")
def list_questions(
    batch_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return QuestionCRUD.list_by_batch(db, batch_id, status=status, skip=skip, limit=limit)


@router.get("/{batch_id}/questions/{question_id}", response_model=QuestionDetail, summary="题目详情")
def get_question(batch_id: int, question_id: int, db: Session = Depends(get_db)):
    q = QuestionCRUD.get(db, question_id)
    if not q or q.batch_id != batch_id:
        raise HTTPException(status_code=404, detail="题目不存在")
    return q


@router.get("/{batch_id}/changes", response_model=List[ChangeRecordInfo], summary="批次变更记录")
def list_changes(batch_id: int, change_type: Optional[str] = None, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return ChangeCRUD.list_by_batch(db, batch_id, change_type=change_type)


@router.get("/{batch_id}/reviews", response_model=List[ReviewRecordInfo], summary="批次复核记录")
def list_reviews(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return ReviewCRUD.list_by_batch(db, batch_id)


@router.get("/{batch_id}/rollbacks", response_model=List[RollbackLogInfo], summary="批次回滚日志")
def list_rollbacks(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return RollbackCRUD.list_by_batch(db, batch_id)


@router.get("/{batch_id}/summary", response_model=ReportSummary, summary="批次汇总")
def batch_summary(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    routing_summary = RoutingCRUD.summary_by_batch(db, batch_id)
    rollbacks = RollbackCRUD.list_by_batch(db, batch_id)
    blockers = []
    seen = set()
    for rb in rollbacks:
        if rb.blocker_material_id and rb.blocker_material_id not in seen:
            seen.add(rb.blocker_material_id)
            blockers.append({
                "material_id": rb.blocker_material_id,
                "material_name": rb.blocker_material_name,
                "reason": rb.rollback_reason,
                "detail": rb.blocker_detail,
                "question_ids": rb.blocker_question_ids,
                "round": rb.round_no,
            })
    reviewers = ReviewCRUD.reviewers_of_batch(db, batch_id)
    return ReportSummary(
        batch_id=batch.id,
        batch_no=batch.batch_no,
        batch_name=batch.batch_name,
        status=batch.status,
        total_questions=batch.total_count,
        valid_questions=batch.valid_count,
        duplicate_questions=batch.duplicate_count,
        conflict_questions=batch.conflict_count,
        rollback_count=batch.rollback_count,
        current_round=batch.current_round,
        routing_summary=routing_summary,
        rollback_blockers=blockers,
        reviewed_by=reviewers,
    )
