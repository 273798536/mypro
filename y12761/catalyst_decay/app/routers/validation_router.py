from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Batch, DataIssue, IssueSeverity
from app.schemas import DataIssueResponse, DataIssueResolve
from app.services.validation_service import run_full_validation, resolve_issue, get_issues

router = APIRouter(prefix="/api/validation", tags=["数据校验"])


@router.post("/{batch_id}/run", response_model=list[DataIssueResponse])
def run_validation(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    issues = run_full_validation(db, batch_id)
    return issues


@router.get("/{batch_id}/issues", response_model=list[DataIssueResponse])
def list_issues(
    batch_id: int,
    unresolved_only: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return get_issues(db, batch_id, unresolved_only=unresolved_only)


@router.post("/issues/{issue_id}/resolve", response_model=DataIssueResponse)
def resolve_data_issue(issue_id: int, data: DataIssueResolve, db: Session = Depends(get_db)):
    try:
        issue = resolve_issue(db, issue_id, data.resolved_remark)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return issue
