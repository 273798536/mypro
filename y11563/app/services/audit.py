import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def generate_operation_id(self) -> str:
        return f"AUD-{uuid.uuid4().hex[:16].upper()}"

    def log_operation(
        self,
        record_type: str,
        record_id: str,
        operation: str,
        operator: str,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        change_reason: Optional[str] = None,
        batch_no: Optional[str] = None,
        request_id: Optional[str] = None,
        source: str = "api",
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        log = AuditLog(
            operation_id=self.generate_operation_id(),
            batch_no=batch_no,
            record_type=record_type,
            record_id=record_id,
            operation=operation,
            operator=operator,
            operation_time=datetime.utcnow(),
            before_data=before_data,
            after_data=after_data,
            change_reason=change_reason,
            request_id=request_id,
            source=source,
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_record_history(
        self,
        record_type: str,
        record_id: str,
        limit: int = 100,
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(
                AuditLog.record_type == record_type,
                AuditLog.record_id == record_id,
            )
            .order_by(AuditLog.operation_time.desc())
            .limit(limit)
            .all()
        )

    def get_batch_history(
        self,
        batch_no: str,
        limit: int = 1000,
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.batch_no == batch_no)
            .order_by(AuditLog.operation_time.desc())
            .limit(limit)
            .all()
        )

    def get_operations_by_operator(
        self,
        operator: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[AuditLog]:
        query = self.db.query(AuditLog).filter(AuditLog.operator == operator)
        if start_time:
            query = query.filter(AuditLog.operation_time >= start_time)
        if end_time:
            query = query.filter(AuditLog.operation_time <= end_time)
        return query.order_by(AuditLog.operation_time.desc()).limit(limit).all()
