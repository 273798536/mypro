from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.auth import get_current_active_user, require_roles
from app import models, schemas
from app.enums import UserRole, OperationType

router = APIRouter(prefix="/api/audit-logs", tags=["审计日志"])


@router.get("/", response_model=List[schemas.AuditLog])
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    application_id: Optional[int] = None,
    queue_id: Optional[int] = None,
    operation_type: Optional[OperationType] = None,
    operator_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.ADMIN, UserRole.PROCUREMENT_STAFF)),
):
    query = db.query(models.AuditLog)

    if application_id:
        query = query.filter(models.AuditLog.application_id == application_id)
    if queue_id:
        query = query.filter(models.AuditLog.queue_id == queue_id)
    if operation_type:
        query = query.filter(models.AuditLog.operation_type == operation_type)
    if operator_id:
        query = query.filter(models.AuditLog.operator_id == operator_id)

    return query.order_by(desc(models.AuditLog.created_at)).offset(skip).limit(limit).all()


@router.get("/application/{application_id}", response_model=List[schemas.AuditLog])
def get_application_audit_logs(
    application_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return db.query(models.AuditLog).filter(
        models.AuditLog.application_id == application_id
    ).order_by(desc(models.AuditLog.created_at)).offset(skip).limit(limit).all()


@router.get("/queue/{queue_id}", response_model=List[schemas.AuditLog])
def get_queue_audit_logs(
    queue_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return db.query(models.AuditLog).filter(
        models.AuditLog.queue_id == queue_id
    ).order_by(desc(models.AuditLog.created_at)).offset(skip).limit(limit).all()


@router.get("/{log_id}", response_model=schemas.AuditLog)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.ADMIN, UserRole.PROCUREMENT_STAFF)),
):
    log = db.query(models.AuditLog).filter(models.AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="审计日志不存在")
    return log
