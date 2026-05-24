from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import AuditLog as AuditLogSchema
from app.security import get_current_user, require_action

router = APIRouter()


@router.get("/", response_model=List[AuditLogSchema])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    application_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if application_id:
        query = query.filter(AuditLog.application_id == application_id)
    if action:
        query = query.filter(AuditLog.action.like(f"%{action}%"))
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/application/{application_id}", response_model=List[AuditLogSchema])
async def get_application_audit_trail(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).filter(
        AuditLog.application_id == application_id
    ).order_by(AuditLog.created_at.asc()).all()
    
    return logs


@router.get("/{log_id}", response_model=AuditLogSchema)
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="审计日志不存在")
    return log


@router.get("/changes/sensitive-fields")
async def get_sensitive_field_changes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    from app.config import settings
    
    sensitive_logs = []
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    
    for log in logs:
        if log.changed_fields:
            sensitive_changes = {}
            for field in settings.SENSITIVE_FIELDS:
                if field in log.changed_fields:
                    sensitive_changes[field] = log.changed_fields[field]
            
            if sensitive_changes:
                sensitive_logs.append({
                    "log_id": log.id,
                    "application_id": log.application_id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "sensitive_changes": sensitive_changes,
                    "change_reason": log.change_reason,
                    "created_at": log.created_at
                })
    
    return sensitive_logs[skip:skip + limit]
