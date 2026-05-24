from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models import Batch, BatchStatus, Record, RecordStatus, AuditLog, UserRole


class StateTransitionError(Exception):
    pass


class BatchStateMachine:
    VALID_TRANSITIONS = {
        BatchStatus.DRAFT: [BatchStatus.IMPORTING, BatchStatus.WITHDRAWN],
        BatchStatus.IMPORTING: [BatchStatus.IMPORTED, BatchStatus.DRAFT, BatchStatus.FROZEN],
        BatchStatus.IMPORTED: [BatchStatus.REVIEWING, BatchStatus.FROZEN, BatchStatus.WITHDRAWN],
        BatchStatus.REVIEWING: [BatchStatus.APPROVED, BatchStatus.REJECTED, BatchStatus.FROZEN, BatchStatus.IMPORTED],
        BatchStatus.APPROVED: [BatchStatus.SETTLED, BatchStatus.FROZEN, BatchStatus.REVIEWING],
        BatchStatus.REJECTED: [BatchStatus.IMPORTED, BatchStatus.FROZEN, BatchStatus.ARCHIVED],
        BatchStatus.FROZEN: [],
        BatchStatus.SETTLED: [BatchStatus.ARCHIVED, BatchStatus.FROZEN],
        BatchStatus.ARCHIVED: [BatchStatus.FROZEN],
        BatchStatus.WITHDRAWN: [BatchStatus.DRAFT, BatchStatus.FROZEN],
    }

    def __init__(self, db: Session, batch: Batch, operator: str, operator_role: str = UserRole.OPERATOR):
        self.db = db
        self.batch = batch
        self.operator = operator
        self.operator_role = operator_role

    def can_transition_to(self, target_status: BatchStatus) -> bool:
        if self.batch.status == BatchStatus.FROZEN:
            return False
        return target_status in self.VALID_TRANSITIONS.get(self.batch.status, [])

    def transition_to(self, target_status: BatchStatus, reason: str = None, **kwargs) -> Batch:
        if not self.can_transition_to(target_status):
            raise StateTransitionError(
                f"Cannot transition from {self.batch.status.value} to {target_status.value}"
            )
        
        old_status = self.batch.status
        
        changes = {
            "status": {
                "old": old_status.value,
                "new": target_status.value
            }
        }
        
        self.batch.status = target_status
        self.batch.updated_at = datetime.utcnow()
        
        if target_status == BatchStatus.FROZEN:
            self.batch.status_before_frozen = old_status
            self.batch.frozen_at = datetime.utcnow()
            self.batch.frozen_by = self.operator
            self.batch.frozen_reason = reason
            changes["frozen_reason"] = reason
        
        self._log_audit(
            action=f"STATUS_CHANGE:{target_status.value}",
            old_status=old_status.value,
            new_status=target_status.value,
            reason=reason,
            changes=changes
        )
        
        self.db.add(self.batch)
        self.db.flush()
        return self.batch

    def unfreeze(self) -> Batch:
        if self.batch.status != BatchStatus.FROZEN:
            raise StateTransitionError("Batch is not frozen")
        
        if not self.batch.status_before_frozen:
            target_status = BatchStatus.DRAFT
        else:
            target_status = self.batch.status_before_frozen
        
        old_status = self.batch.status
        changes = {
            "status": {
                "old": old_status.value,
                "new": target_status.value
            },
            "unfrozen_by": self.operator
        }
        
        self.batch.status = target_status
        self.batch.status_before_frozen = None
        self.batch.updated_at = datetime.utcnow()
        
        self._log_audit(
            action="UNFREEZE",
            old_status=old_status.value,
            new_status=target_status.value,
            reason="Unfreeze batch",
            changes=changes
        )
        
        self.db.add(self.batch)
        self.db.flush()
        return self.batch

    def _log_audit(self, action: str, old_status: str = None, new_status: str = None,
                   reason: str = None, changes: dict = None):
        role_value = self.operator_role.value if hasattr(self.operator_role, 'value') else str(self.operator_role)
        audit_log = AuditLog(
            batch_id=self.batch.id,
            action=action,
            old_status=old_status,
            new_status=new_status,
            reason=reason,
            operator=self.operator,
            operator_role=role_value,
            changes=changes or {}
        )
        self.db.add(audit_log)


class RecordStateMachine:
    VALID_TRANSITIONS = {
        RecordStatus.PENDING: [RecordStatus.VERIFIED, RecordStatus.CORRECTED, RecordStatus.WAIVED, 
                               RecordStatus.INVALID, RecordStatus.DUPLICATE],
        RecordStatus.VERIFIED: [RecordStatus.CORRECTED, RecordStatus.WAIVED, RecordStatus.INVALID, RecordStatus.PENDING],
        RecordStatus.CORRECTED: [RecordStatus.VERIFIED, RecordStatus.WAIVED, RecordStatus.INVALID, RecordStatus.PENDING],
        RecordStatus.WAIVED: [RecordStatus.VERIFIED, RecordStatus.CORRECTED, RecordStatus.INVALID, RecordStatus.PENDING],
        RecordStatus.INVALID: [RecordStatus.VERIFIED, RecordStatus.CORRECTED, RecordStatus.WAIVED, RecordStatus.PENDING],
        RecordStatus.DUPLICATE: [RecordStatus.PENDING, RecordStatus.INVALID],
    }

    def __init__(self, db: Session, record: Record, operator: str, operator_role: str = UserRole.OPERATOR):
        self.db = db
        self.record = record
        self.operator = operator
        self.operator_role = operator_role

    def can_transition_to(self, target_status: RecordStatus) -> bool:
        return target_status in self.VALID_TRANSITIONS.get(self.record.status, [])

    def transition_to(self, target_status: RecordStatus, reason: str = None, 
                      correction_note: str = None, is_correct: bool = None,
                      compensation_amount: float = None) -> Record:
        if not self.can_transition_to(target_status):
            raise StateTransitionError(
                f"Cannot transition record from {self.record.status.value} to {target_status.value}"
            )
        
        old_status = self.record.status
        
        changes = {
            "status": {
                "old": old_status.value,
                "new": target_status.value
            }
        }
        
        self.record.status = target_status
        self.record.updated_at = datetime.utcnow()
        
        if target_status in [RecordStatus.VERIFIED, RecordStatus.CORRECTED, RecordStatus.WAIVED]:
            self.record.reviewed_at = datetime.utcnow()
            self.record.reviewer = self.operator
            if reason:
                self.record.review_reason = reason
            if is_correct is not None:
                self.record.is_correct = is_correct
        
        if target_status == RecordStatus.CORRECTED:
            self.record.corrected_at = datetime.utcnow()
            self.record.corrected_by = self.operator
            if correction_note:
                self.record.correction_note = correction_note
        
        if compensation_amount is not None:
            changes["compensation_amount"] = {
                "old": self.record.compensation_amount,
                "new": compensation_amount
            }
            self.record.compensation_amount = compensation_amount
        
        self._log_audit(
            action=f"RECORD_STATUS:{target_status.value}",
            old_status=old_status.value,
            new_status=target_status.value,
            reason=reason or correction_note,
            changes=changes
        )
        
        self.db.add(self.record)
        self.db.flush()
        return self.record

    def _log_audit(self, action: str, old_status: str = None, new_status: str = None,
                   reason: str = None, changes: dict = None):
        role_value = self.operator_role.value if hasattr(self.operator_role, 'value') else str(self.operator_role)
        audit_log = AuditLog(
            batch_id=self.record.batch_id,
            record_id=self.record.id,
            action=action,
            old_status=old_status,
            new_status=new_status,
            reason=reason,
            operator=self.operator,
            operator_role=role_value,
            changes=changes or {}
        )
        self.db.add(audit_log)


def check_batch_operation_permission(batch_status: BatchStatus, operation: str, role: UserRole) -> Tuple[bool, str]:
    permission_matrix = {
        "import": {
            "allowed_statuses": [BatchStatus.DRAFT],
            "allowed_roles": [UserRole.OPERATOR, UserRole.ADMIN]
        },
        "review": {
            "allowed_statuses": [BatchStatus.REVIEWING],
            "allowed_roles": [UserRole.REVIEWER, UserRole.ADMIN]
        },
        "freeze": {
            "allowed_statuses": [BatchStatus.DRAFT, BatchStatus.IMPORTING, BatchStatus.IMPORTED, 
                                BatchStatus.REVIEWING, BatchStatus.APPROVED, BatchStatus.REJECTED,
                                BatchStatus.SETTLED, BatchStatus.ARCHIVED, BatchStatus.WITHDRAWN],
            "allowed_roles": [UserRole.ADMIN, UserRole.SETTLEMENT]
        },
        "settle": {
            "allowed_statuses": [BatchStatus.APPROVED],
            "allowed_roles": [UserRole.SETTLEMENT, UserRole.ADMIN]
        },
        "archive": {
            "allowed_statuses": [BatchStatus.SETTLED, BatchStatus.REJECTED],
            "allowed_roles": [UserRole.ADMIN]
        },
        "withdraw": {
            "allowed_statuses": [BatchStatus.DRAFT, BatchStatus.IMPORTED],
            "allowed_roles": [UserRole.OPERATOR, UserRole.ADMIN]
        },
        "correct_record": {
            "allowed_statuses": [BatchStatus.IMPORTED, BatchStatus.REVIEWING, BatchStatus.APPROVED],
            "allowed_roles": [UserRole.REVIEWER, UserRole.ADMIN]
        },
        "export": {
            "allowed_statuses": [BatchStatus.APPROVED, BatchStatus.SETTLED, BatchStatus.FROZEN],
            "allowed_roles": [UserRole.SETTLEMENT, UserRole.ADMIN, UserRole.REVIEWER]
        }
    }
    
    if operation not in permission_matrix:
        return False, "Unknown operation"
    
    config = permission_matrix[operation]
    
    if batch_status not in config["allowed_statuses"]:
        return False, f"Operation not allowed in status: {batch_status.value}"
    
    if role not in config["allowed_roles"]:
        return False, f"Role {role.value} has no permission for this operation"
    
    return True, "OK"
