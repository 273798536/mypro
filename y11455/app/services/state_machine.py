from typing import Optional
from sqlalchemy.orm import Session

from app.enums import ReceiptStatus, OperationType
from app.models import ExceptionReceipt, StatusHistory


class ReceiptStateMachine:
    VALID_TRANSITIONS = {
        ReceiptStatus.PENDING: [
            ReceiptStatus.REVIEWING,
            ReceiptStatus.APPROVED,
            ReceiptStatus.REJECTED,
            ReceiptStatus.CANCELLED,
            ReceiptStatus.FROZEN
        ],
        ReceiptStatus.REVIEWING: [
            ReceiptStatus.APPROVED,
            ReceiptStatus.REJECTED,
            ReceiptStatus.PENDING,
            ReceiptStatus.CANCELLED,
            ReceiptStatus.FROZEN
        ],
        ReceiptStatus.APPROVED: [
            ReceiptStatus.FROZEN,
            ReceiptStatus.ARCHIVED,
            ReceiptStatus.CANCELLED,
            ReceiptStatus.REJECTED,
            ReceiptStatus.PENDING
        ],
        ReceiptStatus.REJECTED: [
            ReceiptStatus.FROZEN,
            ReceiptStatus.ARCHIVED,
            ReceiptStatus.CANCELLED,
            ReceiptStatus.APPROVED,
            ReceiptStatus.PENDING
        ],
        ReceiptStatus.FROZEN: [
            ReceiptStatus.APPROVED,
            ReceiptStatus.REJECTED,
            ReceiptStatus.PENDING,
            ReceiptStatus.REVIEWING
        ],
        ReceiptStatus.CANCELLED: [
            ReceiptStatus.PENDING,
            ReceiptStatus.REVIEWING,
            ReceiptStatus.APPROVED,
            ReceiptStatus.REJECTED,
            ReceiptStatus.FROZEN
        ],
        ReceiptStatus.ARCHIVED: []
    }

    def __init__(self, db: Session, receipt: ExceptionReceipt):
        self.db = db
        self.receipt = receipt

    def can_transition_to(self, target_status: ReceiptStatus) -> bool:
        current = self.receipt.current_status
        if current == target_status:
            return True
        return target_status in self.VALID_TRANSITIONS.get(current, [])

    def transition(
        self,
        target_status: ReceiptStatus,
        operator: str,
        operation_type: OperationType,
        change_reason: Optional[str] = None
    ) -> bool:
        if not self.can_transition_to(target_status):
            return False

        from_status = self.receipt.current_status
        
        if from_status != target_status:
            status_history = StatusHistory(
                receipt_id=self.receipt.id,
                from_status=from_status,
                to_status=target_status,
                change_reason=change_reason,
                operator=operator,
                operation_type=operation_type
            )
            self.db.add(status_history)

            self.receipt.current_status = target_status
            self.receipt.operator = operator

        return True

    def freeze(self, operator: str, freeze_reason: str) -> bool:
        if self.receipt.is_frozen:
            return False
        
        status_before_freeze = self.receipt.current_status
        
        success = self.transition(
            target_status=ReceiptStatus.FROZEN,
            operator=operator,
            operation_type=OperationType.FREEZE,
            change_reason=freeze_reason
        )
        
        if success:
            self.receipt.is_frozen = True
            self.receipt.status_before_freeze = status_before_freeze
        
        return success

    def unfreeze(self, operator: str, unfreeze_reason: str) -> bool:
        if not self.receipt.is_frozen:
            return False
        
        target_status = self.receipt.status_before_freeze or ReceiptStatus.PENDING
        
        success = self.transition(
            target_status=target_status,
            operator=operator,
            operation_type=OperationType.UNFREEZE,
            change_reason=unfreeze_reason
        )
        
        if success:
            self.receipt.is_frozen = False
        
        return success

    def cancel(self, operator: str, cancel_reason: str) -> bool:
        if self.receipt.current_status == ReceiptStatus.ARCHIVED:
            return False
        
        return self.transition(
            target_status=ReceiptStatus.CANCELLED,
            operator=operator,
            operation_type=OperationType.CANCEL,
            change_reason=cancel_reason
        )

    def archive(self, operator: str, archive_remark: Optional[str] = None) -> bool:
        if self.receipt.is_frozen:
            return False
        
        if self.receipt.current_status not in [ReceiptStatus.APPROVED, ReceiptStatus.REJECTED]:
            return False
        
        return self.transition(
            target_status=ReceiptStatus.ARCHIVED,
            operator=operator,
            operation_type=OperationType.ARCHIVE,
            change_reason=archive_remark
        )
