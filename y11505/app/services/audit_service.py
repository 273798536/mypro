from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.constants import OperationType
from app.models import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db
    
    def log_operation(
        self,
        operation_type: OperationType,
        operator: str,
        batch_id: Optional[str] = None,
        record_type: Optional[str] = None,
        record_id: Optional[str] = None,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        change_reason: Optional[str] = None,
        remark: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        log = AuditLog(
            id=str(uuid.uuid4()),
            batch_id=batch_id,
            operation_type=operation_type,
            record_type=record_type,
            record_id=record_id,
            operator=operator,
            operation_time=datetime.now(),
            before_data=before_data,
            after_data=after_data,
            change_reason=change_reason,
            remark=remark,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        self.db.flush()
        return log
    
    def get_batch_audit_logs(
        self,
        batch_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.batch_id == batch_id)
            .order_by(AuditLog.operation_time.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_record_audit_logs(
        self,
        record_type: str,
        record_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(
                AuditLog.record_type == record_type,
                AuditLog.record_id == record_id,
            )
            .order_by(AuditLog.operation_time.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_operator_audit_logs(
        self,
        operator: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.operator == operator)
            .order_by(AuditLog.operation_time.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
