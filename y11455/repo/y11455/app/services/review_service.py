import json
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.enums import ReceiptStatus, OperationType, ReviewChannel, FreezeReason
from app.models import (
    ExceptionReceipt,
    OverruleHistory,
    FreezeRecord,
    AuditLog
)
from app.services.state_machine import ReceiptStateMachine


class ReviewService:
    def __init__(self, db: Session):
        self.db = db

    def batch_review(
        self,
        receipt_ids: List[int],
        review_result: ReceiptStatus,
        operator: str,
        review_channel: ReviewChannel = ReviewChannel.MANUAL_REVIEW,
        review_remark: Optional[str] = None,
        compensate_amount: Optional[float] = None,
        responsibility: Optional[str] = None
    ) -> dict:
        success_count = 0
        failed_ids = []

        for receipt_id in receipt_ids:
            receipt = self.db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
            if not receipt:
                failed_ids.append(receipt_id)
                continue

            if receipt.is_frozen:
                failed_ids.append(receipt_id)
                continue

            state_machine = ReceiptStateMachine(self.db, receipt)
            
            if not state_machine.can_transition_to(review_result):
                failed_ids.append(receipt_id)
                continue

            success = state_machine.transition(
                target_status=review_result,
                operator=operator,
                operation_type=OperationType.REVIEW,
                change_reason=review_remark
            )

            if success:
                receipt.review_channel = review_channel
                receipt.latest_review_remark = review_remark
                receipt.reviewed_at = datetime.now()

                if compensate_amount is not None:
                    receipt.compensate_amount = compensate_amount
                    receipt.amount_diff = compensate_amount - receipt.refund_amount

                if responsibility is not None:
                    receipt.responsibility = responsibility

                success_count += 1

        self.db.add(AuditLog(
            operation_type=OperationType.REVIEW,
            target_type="receipt",
            operator=operator,
            detail=json.dumps({
                "receipt_ids": receipt_ids,
                "review_result": review_result.value,
                "success_count": success_count,
                "failed_ids": failed_ids
            }, ensure_ascii=False)
        ))

        self.db.commit()

        return {
            "total": len(receipt_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }

    def overrule(
        self,
        receipt_id: int,
        new_status: ReceiptStatus,
        overrule_reason: str,
        operator: str,
        new_compensate_amount: Optional[float] = None,
        new_responsibility: Optional[str] = None
    ) -> bool:
        receipt = self.db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
        if not receipt:
            return False

        if receipt.is_frozen:
            return False

        original_status = receipt.current_status
        original_compensate = receipt.compensate_amount
        original_responsibility = receipt.responsibility

        state_machine = ReceiptStateMachine(self.db, receipt)

        if not state_machine.can_transition_to(new_status):
            return False

        overrule_history = OverruleHistory(
            receipt_id=receipt.id,
            original_status=original_status,
            new_status=new_status,
            original_compensate_amount=original_compensate,
            new_compensate_amount=new_compensate_amount if new_compensate_amount is not None else original_compensate,
            original_responsibility=original_responsibility,
            new_responsibility=new_responsibility if new_responsibility is not None else original_responsibility,
            overrule_reason=overrule_reason,
            overrule_channel=ReviewChannel.MANUAL_REVIEW,
            operator=operator
        )
        self.db.add(overrule_history)

        success = state_machine.transition(
            target_status=new_status,
            operator=operator,
            operation_type=OperationType.OVERRULE,
            change_reason=overrule_reason
        )

        if success:
            receipt.is_manually_overruled = True
            receipt.manual_review_reason = overrule_reason

            if new_compensate_amount is not None:
                receipt.compensate_amount = new_compensate_amount
                receipt.amount_diff = new_compensate_amount - receipt.refund_amount

            if new_responsibility is not None:
                receipt.responsibility = new_responsibility

            receipt.reviewed_at = datetime.now()

            self.db.add(AuditLog(
                operation_type=OperationType.OVERRULE,
                target_type="receipt",
                target_id=receipt.id,
                operator=operator,
                detail=json.dumps({
                    "original_status": original_status.value,
                    "new_status": new_status.value,
                    "overrule_reason": overrule_reason
                }, ensure_ascii=False)
            ))

            self.db.commit()

        return success

    def batch_freeze(
        self,
        receipt_ids: List[int],
        freeze_reason: FreezeReason,
        operator: str
    ) -> dict:
        success_count = 0
        failed_ids = []

        for receipt_id in receipt_ids:
            receipt = self.db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
            if not receipt or receipt.is_frozen:
                failed_ids.append(receipt_id)
                continue

            state_machine = ReceiptStateMachine(self.db, receipt)

            if not state_machine.can_transition_to(ReceiptStatus.FROZEN):
                failed_ids.append(receipt_id)
                continue

            success = state_machine.freeze(
                operator=operator,
                freeze_reason=freeze_reason.value
            )

            if success:
                receipt.freeze_reason = freeze_reason
                receipt.frozen_at = datetime.now()

                freeze_record = FreezeRecord(
                    receipt_id=receipt.id,
                    freeze_reason=freeze_reason,
                    status_before_freeze=receipt.status_before_freeze,
                    freeze_operator=operator
                )
                self.db.add(freeze_record)

                success_count += 1

        self.db.add(AuditLog(
            operation_type=OperationType.FREEZE,
            target_type="receipt",
            operator=operator,
            detail=json.dumps({
                "receipt_ids": receipt_ids,
                "freeze_reason": freeze_reason.value,
                "success_count": success_count,
                "failed_ids": failed_ids
            }, ensure_ascii=False)
        ))

        self.db.commit()

        return {
            "total": len(receipt_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }

    def batch_unfreeze(
        self,
        receipt_ids: List[int],
        unfreeze_reason: str,
        operator: str
    ) -> dict:
        success_count = 0
        failed_ids = []

        for receipt_id in receipt_ids:
            receipt = self.db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
            if not receipt or not receipt.is_frozen:
                failed_ids.append(receipt_id)
                continue

            state_machine = ReceiptStateMachine(self.db, receipt)

            success = state_machine.unfreeze(
                operator=operator,
                unfreeze_reason=unfreeze_reason
            )

            if success:
                receipt.freeze_reason = None
                receipt.frozen_at = None

                latest_freeze = self.db.query(FreezeRecord).filter(
                    FreezeRecord.receipt_id == receipt.id,
                    FreezeRecord.is_unfrozen == False
                ).order_by(FreezeRecord.id.desc()).first()

                if latest_freeze:
                    latest_freeze.is_unfrozen = True
                    latest_freeze.unfreeze_reason = unfreeze_reason
                    latest_freeze.unfreeze_operator = operator
                    latest_freeze.unfrozen_at = datetime.now()

                success_count += 1

        self.db.add(AuditLog(
            operation_type=OperationType.UNFREEZE,
            target_type="receipt",
            operator=operator,
            detail=json.dumps({
                "receipt_ids": receipt_ids,
                "unfreeze_reason": unfreeze_reason,
                "success_count": success_count,
                "failed_ids": failed_ids
            }, ensure_ascii=False)
        ))

        self.db.commit()

        return {
            "total": len(receipt_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }

    def batch_cancel(
        self,
        receipt_ids: List[int],
        cancel_reason: str,
        operator: str
    ) -> dict:
        success_count = 0
        failed_ids = []

        for receipt_id in receipt_ids:
            receipt = self.db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
            if not receipt:
                failed_ids.append(receipt_id)
                continue

            state_machine = ReceiptStateMachine(self.db, receipt)

            success = state_machine.cancel(
                operator=operator,
                cancel_reason=cancel_reason
            )

            if success:
                success_count += 1
            else:
                failed_ids.append(receipt_id)

        self.db.add(AuditLog(
            operation_type=OperationType.CANCEL,
            target_type="receipt",
            operator=operator,
            detail=json.dumps({
                "receipt_ids": receipt_ids,
                "cancel_reason": cancel_reason,
                "success_count": success_count,
                "failed_ids": failed_ids
            }, ensure_ascii=False)
        ))

        self.db.commit()

        return {
            "total": len(receipt_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }

    def batch_archive(
        self,
        receipt_ids: List[int],
        operator: str,
        archive_remark: Optional[str] = None
    ) -> dict:
        success_count = 0
        failed_ids = []

        for receipt_id in receipt_ids:
            receipt = self.db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
            if not receipt:
                failed_ids.append(receipt_id)
                continue

            state_machine = ReceiptStateMachine(self.db, receipt)

            success = state_machine.archive(
                operator=operator,
                archive_remark=archive_remark
            )

            if success:
                success_count += 1
            else:
                failed_ids.append(receipt_id)

        self.db.add(AuditLog(
            operation_type=OperationType.ARCHIVE,
            target_type="receipt",
            operator=operator,
            detail=json.dumps({
                "receipt_ids": receipt_ids,
                "archive_remark": archive_remark,
                "success_count": success_count,
                "failed_ids": failed_ids
            }, ensure_ascii=False)
        ))

        self.db.commit()

        return {
            "total": len(receipt_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }
