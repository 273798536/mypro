from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CheckTask, CheckResult, AuditLog, TaskStatus, ActionType
from app.schemas import (
    CheckTaskCreate, CheckTaskOut, CheckTaskStatusUpdate,
    CheckResultOut, CheckResultResolve, AuditLogOut,
)
from app.services.check_service import run_bias_check

router = APIRouter(prefix="/api/tasks", tags=["检查任务"])


@router.post("", response_model=CheckTaskOut)
def create_task(data: CheckTaskCreate, db: Session = Depends(get_db)):
    task = CheckTask(
        bank_id=data.bank_id,
        task_name=data.task_name,
        check_types=[ct.value if hasattr(ct, "value") else ct for ct in data.check_types],
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    log = AuditLog(task_id=task.id, bank_id=task.bank_id, action=ActionType.CREATE, detail=f"创建检查任务「{task.task_name}」")
    db.add(log)
    db.commit()
    return task


@router.get("", response_model=List[CheckTaskOut])
def list_tasks(bank_id: Optional[int] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(CheckTask)
    if bank_id:
        q = q.filter(CheckTask.bank_id == bank_id)
    return q.order_by(CheckTask.updated_at.desc()).offset(skip).limit(limit).all()


@router.get("/{task_id}", response_model=CheckTaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(CheckTask).filter(CheckTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="检查任务不存在")
    return task


@router.post("/{task_id}/run", response_model=List[CheckResultOut])
def run_check(task_id: int, db: Session = Depends(get_db)):
    try:
        results = run_bias_check(db, task_id)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{task_id}/status", response_model=CheckTaskOut)
def update_status(task_id: int, data: CheckTaskStatusUpdate, db: Session = Depends(get_db)):
    task = db.query(CheckTask).filter(CheckTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="检查任务不存在")

    valid_transitions = {
        TaskStatus.DRAFT: [TaskStatus.IMPORTED],
        TaskStatus.IMPORTED: [TaskStatus.CHECKING],
        TaskStatus.CHECKING: [TaskStatus.CHECKED],
        TaskStatus.CHECKED: [TaskStatus.REVIEWING],
        TaskStatus.REVIEWING: [TaskStatus.APPROVED, TaskStatus.REJECTED],
        TaskStatus.REJECTED: [TaskStatus.IMPORTED, TaskStatus.REVIEWING],
        TaskStatus.APPROVED: [TaskStatus.REPORTED],
    }

    allowed = valid_transitions.get(task.status, [])
    if data.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"当前状态「{task.status.value}」不能直接转为「{data.status.value}」，允许的下一状态：{[s.value for s in allowed]}",
        )

    old_status = task.status
    task.status = data.status
    if data.reviewer:
        task.reviewer = data.reviewer
    if data.review_comment:
        task.review_comment = data.review_comment
    db.commit()
    db.refresh(task)

    action_map = {
        TaskStatus.APPROVED: ActionType.APPROVE,
        TaskStatus.REJECTED: ActionType.REJECT,
        TaskStatus.REVIEWING: ActionType.REVIEW,
    }
    action = action_map.get(data.status, ActionType.REVIEW)
    log = AuditLog(
        task_id=task_id,
        bank_id=task.bank_id,
        action=action,
        actor=data.reviewer or "system",
        detail=f"状态从「{old_status.value}」变更为「{data.status.value}」",
        snapshot={"old_status": old_status.value, "new_status": data.status.value, "comment": data.review_comment},
    )
    db.add(log)
    db.commit()
    return task


@router.get("/{task_id}/results", response_model=List[CheckResultOut])
def list_results(task_id: int, db: Session = Depends(get_db)):
    return db.query(CheckResult).filter(CheckResult.task_id == task_id).order_by(CheckResult.severity).all()


@router.put("/{task_id}/results/{result_id}/resolve", response_model=CheckResultOut)
def resolve_result(task_id: int, result_id: int, data: CheckResultResolve, db: Session = Depends(get_db)):
    r = db.query(CheckResult).filter(CheckResult.id == result_id, CheckResult.task_id == task_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="检查结果不存在")
    r.resolved = data.resolved
    r.resolution = data.resolution
    db.commit()
    db.refresh(r)
    return r


@router.get("/{task_id}/audit", response_model=List[AuditLogOut])
def get_task_audit(task_id: int, db: Session = Depends(get_db)):
    return db.query(AuditLog).filter(AuditLog.task_id == task_id).order_by(AuditLog.created_at).all()
