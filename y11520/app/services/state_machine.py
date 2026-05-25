from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.enums import RecordStatus, ReviewResult
from app.models.models import Batch, StatusLog, ReviewRecord, User


class StateTransitionError(Exception):
    pass


class StateMachine:
    VALID_TRANSITIONS = {
        RecordStatus.DRAFT: [RecordStatus.PENDING_REVIEW, RecordStatus.ARCHIVED],
        RecordStatus.PENDING_REVIEW: [RecordStatus.REVIEWED, RecordStatus.REJECTED, RecordStatus.DRAFT, RecordStatus.FROZEN],
        RecordStatus.REVIEWED: [RecordStatus.SETTLED, RecordStatus.FROZEN, RecordStatus.PENDING_REVIEW],
        RecordStatus.FROZEN: [RecordStatus.DRAFT, RecordStatus.PENDING_REVIEW, RecordStatus.REVIEWED, RecordStatus.SETTLED],
        RecordStatus.REJECTED: [RecordStatus.DRAFT, RecordStatus.ARCHIVED, RecordStatus.FROZEN],
        RecordStatus.SETTLED: [RecordStatus.ARCHIVED, RecordStatus.FROZEN],
        RecordStatus.ARCHIVED: []
    }

    @classmethod
    def can_transition(cls, from_status: RecordStatus, to_status: RecordStatus) -> bool:
        return to_status in cls.VALID_TRANSITIONS.get(from_status, [])

    @classmethod
    def transition(
        cls,
        db: Session,
        batch: Batch,
        to_status: RecordStatus,
        operator: User,
        reason: Optional[str] = None,
        manual_reason: Optional[str] = None
    ) -> Batch:
        from_status = batch.status
        
        if from_status == RecordStatus.FROZEN and to_status != RecordStatus.FROZEN:
            if not cls.can_transition(RecordStatus.FROZEN, to_status):
                raise StateTransitionError(
                    f"Cannot unfreeze from frozen to {to_status}"
                )
        else:
            if not cls.can_transition(from_status, to_status):
                raise StateTransitionError(
                    f"Cannot transition from {from_status} to {to_status}"
                )

        log = StatusLog(
            batch_id=batch.id,
            from_status=from_status,
            to_status=to_status,
            operator_id=operator.id,
            reason=reason,
            manual_reason=manual_reason
        )
        db.add(log)

        batch.status = to_status
        db.add(batch)
        db.flush()

        return batch

    @classmethod
    def submit_for_review(
        cls,
        db: Session,
        batch: Batch,
        operator: User,
        manual_reason: Optional[str] = None
    ) -> Batch:
        return cls.transition(
            db, batch, RecordStatus.PENDING_REVIEW, operator,
            reason="提交复核",
            manual_reason=manual_reason
        )

    @classmethod
    def review(
        cls,
        db: Session,
        batch: Batch,
        operator: User,
        result: ReviewResult,
        comment: Optional[str] = None,
        manual_reason: Optional[str] = None
    ) -> Batch:
        review_record = ReviewRecord(
            batch_id=batch.id,
            reviewer_id=operator.id,
            review_result=result,
            comment=comment
        )
        db.add(review_record)

        if result == ReviewResult.APPROVED:
            return cls.transition(
                db, batch, RecordStatus.REVIEWED, operator,
                reason=f"复核通过: {comment or ''}",
                manual_reason=manual_reason
            )
        elif result == ReviewResult.REJECTED:
            return cls.transition(
                db, batch, RecordStatus.REJECTED, operator,
                reason=f"复核驳回: {comment or ''}",
                manual_reason=manual_reason
            )
        elif result == ReviewResult.NEEDS_REVISION:
            return cls.transition(
                db, batch, RecordStatus.DRAFT, operator,
                reason=f"需修改: {comment or ''}",
                manual_reason=manual_reason
            )
        
        return batch

    @classmethod
    def freeze(
        cls,
        db: Session,
        batch: Batch,
        operator: User,
        freeze_reason: str,
        manual_reason: Optional[str] = None
    ) -> Batch:
        if batch.status == RecordStatus.FROZEN:
            raise StateTransitionError("Batch is already frozen")
        
        batch.status_before_freeze = batch.status
        batch.freeze_reason = freeze_reason
        batch.freeze_time = datetime.utcnow()

        return cls.transition(
            db, batch, RecordStatus.FROZEN, operator,
            reason=f"冻结: {freeze_reason}",
            manual_reason=manual_reason
        )

    @classmethod
    def unfreeze(
        cls,
        db: Session,
        batch: Batch,
        operator: User,
        unfreeze_reason: str,
        target_status: Optional[RecordStatus] = None,
        manual_reason: Optional[str] = None
    ) -> Batch:
        if batch.status != RecordStatus.FROZEN:
            raise StateTransitionError("Batch is not frozen")
        
        if target_status is None:
            target_status = batch.status_before_freeze
        
        if target_status is None:
            target_status = RecordStatus.DRAFT

        batch.unfreeze_reason = unfreeze_reason
        batch.unfreeze_time = datetime.utcnow()

        result = cls.transition(
            db, batch, target_status, operator,
            reason=f"解冻: {unfreeze_reason}",
            manual_reason=manual_reason
        )
        return result

    @classmethod
    def settle(
        cls,
        db: Session,
        batch: Batch,
        operator: User,
        manual_reason: Optional[str] = None
    ) -> Batch:
        return cls.transition(
            db, batch, RecordStatus.SETTLED, operator,
            reason="结算完成",
            manual_reason=manual_reason
        )

    @classmethod
    def archive(
        cls,
        db: Session,
        batch: Batch,
        operator: User,
        manual_reason: Optional[str] = None
    ) -> Batch:
        return cls.transition(
            db, batch, RecordStatus.ARCHIVED, operator,
            reason="撤回归档",
            manual_reason=manual_reason
        )
