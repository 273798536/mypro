from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.crud import BatchCRUD
from app.services.business import DeduplicationService, RoutingService
from app.services.workflow import WorkflowService, ManualReviewService
from app.schemas.schemas import (
    StatusTransitionRequest, ManualFixRequest, DedupResult
)

router = APIRouter(prefix="/api/processing", tags=["处理流程"])


@router.post("/batches/{batch_id}/deduplicate", response_model=DedupResult, summary="执行样本去重")
def run_deduplicate(batch_id: int, operator: str = "system", db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    try:
        return DeduplicationService.run_deduplication(db, batch_id, operator=operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/route", summary="执行路由命中判定")
def run_routing(batch_id: int, operator: str = "auto", db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    try:
        return RoutingService.run_routing(db, batch_id, operator=operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batches/{batch_id}/transition", summary="批次状态流转")
def status_transition(batch_id: int, req: StatusTransitionRequest, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    result = WorkflowService.transition(db, batch_id, req)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "流转失败"))
    return result


@router.post("/batches/{batch_id}/questions/{question_id}/approve", summary="单题复核通过")
def approve_question(
    batch_id: int,
    question_id: int,
    reviewer: str,
    comment: str = None,
    db: Session = Depends(get_db),
):
    result = WorkflowService.approve_single_question(db, batch_id, question_id, reviewer, comment)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/batches/{batch_id}/questions/{question_id}/reject", summary="单题复核驳回")
def reject_question(
    batch_id: int,
    question_id: int,
    reviewer: str,
    comment: str = None,
    mark_conflict: bool = True,
    db: Session = Depends(get_db),
):
    result = WorkflowService.reject_single_question(db, batch_id, question_id, reviewer, comment, mark_conflict)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/batches/{batch_id}/manual-fix", summary="人工修正（支持批量）")
def manual_fix(batch_id: int, req: ManualFixRequest, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    result = ManualReviewService.apply_manual_fix(db, req)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="修正失败")
    return result


@router.get("/batches/{batch_id}/questions/{question_id}/diff", summary="查看题目修正前后差异")
def question_diff(batch_id: int, question_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    data = ManualReviewService.get_question_change_diff(db, question_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data


@router.get("/batches/{batch_id}/rollback-trail", summary="批次回滚痕迹追踪")
def rollback_trail(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchCRUD.get(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    data = ManualReviewService.get_batch_rollback_trail(db, batch_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data
