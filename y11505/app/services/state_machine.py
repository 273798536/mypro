from typing import Optional, Tuple
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.constants import (
    BatchStatus,
    RecordStatus,
    STATUS_TRANSITIONS,
    OperationType,
)
from app.models import Batch, StatusHistory, InspectionRecord
from app.services.audit_service import AuditService


class StateMachineService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
    
    def can_transition(self, current_status: BatchStatus, target_status: BatchStatus) -> bool:
        allowed_transitions = STATUS_TRANSITIONS.get(current_status, [])
        return target_status in allowed_transitions
    
    def transition_batch(
        self,
        batch: Batch,
        target_status: BatchStatus,
        operator: str,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        if not self.can_transition(batch.status, target_status):
            return False, f"无法从 {batch.status} 转换到 {target_status}"
        
        from_status = batch.status
        
        before_data = {
            "status": batch.status,
            "updated_at": batch.updated_at.isoformat() if batch.updated_at else None,
        }
        
        if target_status == BatchStatus.FROZEN:
            batch.status_before_freeze = batch.status
            batch.freeze_time = datetime.now()
            batch.freeze_operator = operator
            batch.freeze_reason = reason
        elif target_status == BatchStatus.SETTLED:
            batch.settle_time = datetime.now()
            batch.settle_operator = operator
            batch.settle_reason = reason
        elif from_status == BatchStatus.FROZEN and target_status == BatchStatus.DRAFT:
            batch.status_before_freeze = None
            batch.freeze_time = None
            batch.freeze_operator = None
            batch.freeze_reason = None
        
        batch.status = target_status
        batch.updated_at = datetime.now()
        
        after_data = {
            "status": batch.status,
            "status_before_freeze": batch.status_before_freeze,
            "updated_at": batch.updated_at.isoformat(),
        }
        
        self._create_status_history(
            batch_id=batch.id,
            record_type="batch",
            record_id=batch.id,
            from_status=from_status,
            to_status=target_status,
            change_reason=reason,
            operator=operator,
        )
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.STATUS_CHANGE,
            operator=operator,
            before_data=before_data,
            after_data=after_data,
            change_reason=reason,
        )
        
        self.db.commit()
        return True, "状态转换成功"
    
    def transition_record(
        self,
        record: InspectionRecord,
        target_status: RecordStatus,
        operator: str,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        from_status = record.status
        
        before_data = {
            "status": record.status,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        }
        
        record.status = target_status
        record.manual_reason = reason
        record.manual_operator = operator
        record.manual_time = datetime.now()
        record.updated_at = datetime.now()
        
        after_data = {
            "status": record.status,
            "manual_reason": reason,
            "manual_operator": operator,
            "manual_time": record.manual_time.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }
        
        self._create_status_history(
            batch_id=record.batch_id,
            record_type="inspection_record",
            record_id=record.id,
            from_status=from_status,
            to_status=target_status,
            change_reason=reason,
            operator=operator,
        )
        
        self.audit_service.log_operation(
            batch_id=record.batch_id,
            operation_type=OperationType.STATUS_CHANGE,
            record_type="inspection_record",
            record_id=record.id,
            operator=operator,
            before_data=before_data,
            after_data=after_data,
            change_reason=reason,
        )
        
        self.db.commit()
        return True, "记录状态更新成功"
    
    def _create_status_history(
        self,
        batch_id: str,
        record_type: str,
        record_id: str,
        from_status: Optional[str],
        to_status: str,
        change_reason: Optional[str],
        operator: str,
    ) -> StatusHistory:
        history = StatusHistory(
            id=str(uuid.uuid4()),
            batch_id=batch_id,
            record_type=record_type,
            record_id=record_id,
            from_status=from_status,
            to_status=to_status,
            change_reason=change_reason,
            operator=operator,
            change_time=datetime.now(),
        )
        self.db.add(history)
        self.db.flush()
        return history
