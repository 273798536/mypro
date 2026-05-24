from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import json

from app.models import AuditLog, OperationType


class AuditService:
    @staticmethod
    def log_operation(
        db: Session,
        operation_type: OperationType,
        operated_by: str,
        batch_id: Optional[int] = None,
        record_type: Optional[str] = None,
        record_id: Optional[int] = None,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        change_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        audit_log = AuditLog(
            batch_id=batch_id,
            record_type=record_type,
            record_id=record_id,
            operation_type=operation_type,
            operated_by=operated_by,
            before_data=before_data,
            after_data=after_data,
            change_reason=change_reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def get_batch_audit_logs(db: Session, batch_id: int, skip: int = 0, limit: int = 100):
        return db.query(AuditLog).filter(
            AuditLog.batch_id == batch_id
        ).order_by(AuditLog.operated_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_record_audit_logs(db: Session, record_type: str, record_id: int, skip: int = 0, limit: int = 100):
        return db.query(AuditLog).filter(
            AuditLog.record_type == record_type,
            AuditLog.record_id == record_id
        ).order_by(AuditLog.operated_at.desc()).offset(skip).limit(limit).all()
