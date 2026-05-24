from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog, ChangeHistory
from app.schemas.audit import AuditLogResponse, ChangeHistoryResponse
from app.services.auth import AuthService

router = APIRouter()


@router.get("/logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.require_role(UserRole.AUDITOR)),
):
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.require_role(UserRole.AUDITOR)),
):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log


@router.get("/changes", response_model=List[ChangeHistoryResponse])
def list_change_history(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    is_manual: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.require_role(UserRole.PRODUCTION_MANAGER)),
):
    query = db.query(ChangeHistory)
    
    if entity_type:
        query = query.filter(ChangeHistory.entity_type == entity_type)
    if entity_id:
        query = query.filter(ChangeHistory.entity_id == entity_id)
    if is_manual is not None:
        query = query.filter(ChangeHistory.is_manual_change == (1 if is_manual else 0))
    
    changes = query.order_by(ChangeHistory.changed_at.desc()).offset(skip).limit(limit).all()
    return [_enrich_change(c) for c in changes]


@router.get("/changes/{change_id}", response_model=ChangeHistoryResponse)
def get_change_history(
    change_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.require_role(UserRole.PRODUCTION_MANAGER)),
):
    change = db.query(ChangeHistory).filter(ChangeHistory.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change history not found")
    return _enrich_change(change)


def _enrich_change(change: ChangeHistory) -> ChangeHistoryResponse:
    response = ChangeHistoryResponse.model_validate(change)
    if change.changer:
        response.changer_name = change.changer.full_name
    return response
