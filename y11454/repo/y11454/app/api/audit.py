from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogWithDiff, AuditLogListResponse, DiffResponse
from app.core.security import can_view_all

router = APIRouter(prefix="/audit", tags=["审计日志"])


@router.get("/ledger/{ledger_id}", response_model=AuditLogListResponse)
def get_ledger_audit_logs(
    ledger_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    query = db.query(AuditLog).filter(AuditLog.ledger_id == ledger_id)
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        diffs = []
        if log.field_changes:
            for field, change in log.field_changes.items():
                diffs.append(DiffResponse(
                    field=field,
                    old_value=change.get('old_value'),
                    new_value=change.get('new_value')
                ))
        
        log_dict = {
            'id': log.id,
            'ledger_id': log.ledger_id,
            'user_id': log.user_id,
            'username': log.username,
            'user_role': log.user_role,
            'action': log.action,
            'previous_values': log.previous_values,
            'new_values': log.new_values,
            'change_reason': log.change_reason,
            'field_changes': log.field_changes,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'created_at': log.created_at,
            'diffs': diffs
        }
        result.append(AuditLogWithDiff(**log_dict))
    
    return {"total": total, "items": result}


@router.get("/logs", response_model=AuditLogListResponse)
def get_all_audit_logs(
    skip: int = 0,
    limit: int = 100,
    username: str = None,
    action: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    query = db.query(AuditLog)
    
    if username:
        query = query.filter(AuditLog.username.contains(username))
    if action:
        query = query.filter(AuditLog.action == action)
    
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        diffs = []
        if log.field_changes:
            for field, change in log.field_changes.items():
                diffs.append(DiffResponse(
                    field=field,
                    old_value=change.get('old_value'),
                    new_value=change.get('new_value')
                ))
        
        log_dict = {
            'id': log.id,
            'ledger_id': log.ledger_id,
            'user_id': log.user_id,
            'username': log.username,
            'user_role': log.user_role,
            'action': log.action,
            'previous_values': log.previous_values,
            'new_values': log.new_values,
            'change_reason': log.change_reason,
            'field_changes': log.field_changes,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'created_at': log.created_at,
            'diffs': diffs
        }
        result.append(AuditLogWithDiff(**log_dict))
    
    return {"total": total, "items": result}
