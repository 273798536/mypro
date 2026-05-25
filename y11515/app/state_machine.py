from datetime import datetime
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app.models import (
    Record, Batch, RecordState, RecordStateHistory,
    BatchStateHistory, OverrideRecord
)


class StateTransitionError(Exception):
    pass


class StateMachine:
    VALID_TRANSITIONS = {
        RecordState.DRAFT: [RecordState.SUBMITTED, RecordState.WITHDRAWN, RecordState.ARCHIVED],
        RecordState.SUBMITTED: [RecordState.UNDER_REVIEW, RecordState.WITHDRAWN, RecordState.ARCHIVED],
        RecordState.UNDER_REVIEW: [RecordState.APPROVED, RecordState.REJECTED, RecordState.WITHDRAWN, RecordState.ARCHIVED],
        RecordState.APPROVED: [RecordState.FROZEN, RecordState.ARCHIVED],
        RecordState.REJECTED: [RecordState.SUBMITTED, RecordState.ARCHIVED],
        RecordState.FROZEN: [RecordState.APPROVED, RecordState.ARCHIVED],
        RecordState.WITHDRAWN: [RecordState.SUBMITTED, RecordState.ARCHIVED],
        RecordState.ARCHIVED: [],
    }

    @classmethod
    def can_transition(cls, from_state: str, to_state: str) -> bool:
        if from_state not in cls.VALID_TRANSITIONS:
            return False
        return to_state in cls.VALID_TRANSITIONS[from_state]

    @classmethod
    def validate_transition(cls, from_state: str, to_state: str, operator: str, permission_level: str = "normal") -> None:
        if from_state == to_state:
            return

        if not cls.can_transition(from_state, to_state):
            raise StateTransitionError(
                f"Invalid state transition: {from_state} -> {to_state}"
            )

        if to_state in [RecordState.APPROVED, RecordState.REJECTED] and permission_level != "supervisor":
            raise StateTransitionError(
                f"Permission denied: {operator} does not have supervisor permission to {to_state}"
            )


class RecordStateMachine(StateMachine):
    @classmethod
    def transition(
        cls,
        db: Session,
        record: Record,
        to_state: str,
        operator: str,
        reason: str = "",
        permission_level: str = "normal",
        transition_type: str = "manual"
    ) -> Tuple[Record, RecordStateHistory]:
        from_state = record.status

        cls.validate_transition(from_state, to_state, operator, permission_level)

        if from_state != to_state:
            history = RecordStateHistory(
                record_id=record.id,
                from_state=from_state,
                to_state=to_state,
                transition_type=transition_type,
                operator=operator,
                reason=reason
            )
            db.add(history)

            record.status = to_state
            record.updated_at = datetime.now()

            return record, history
        return record, None

    @classmethod
    def submit(cls, db: Session, record: Record, operator: str) -> Tuple[Record, Optional[RecordStateHistory]]:
        return cls.transition(
            db, record, RecordState.SUBMITTED, operator,
            reason="提交审核", transition_type="submit"
        )

    @classmethod
    def start_review(cls, db: Session, record: Record, operator: str) -> Tuple[Record, Optional[RecordStateHistory]]:
        return cls.transition(
            db, record, RecordState.UNDER_REVIEW, operator,
            reason="开始复核", transition_type="review_start"
        )

    @classmethod
    def approve(cls, db: Session, record: Record, operator: str, reason: str = "", permission_level: str = "supervisor") -> Tuple[Record, Optional[RecordStateHistory]]:
        return cls.transition(
            db, record, RecordState.APPROVED, operator,
            reason=reason or "审核通过", transition_type="approve",
            permission_level=permission_level
        )

    @classmethod
    def reject(cls, db: Session, record: Record, operator: str, reason: str, permission_level: str = "supervisor") -> Tuple[Record, Optional[RecordStateHistory]]:
        return cls.transition(
            db, record, RecordState.REJECTED, operator,
            reason=reason, transition_type="reject",
            permission_level=permission_level
        )

    @classmethod
    def withdraw(cls, db: Session, record: Record, operator: str, reason: str = "") -> Tuple[Record, Optional[RecordStateHistory]]:
        return cls.transition(
            db, record, RecordState.WITHDRAWN, operator,
            reason=reason or "撤回", transition_type="withdraw"
        )

    @classmethod
    def archive(cls, db: Session, record: Record, operator: str, reason: str = "") -> Tuple[Record, Optional[RecordStateHistory]]:
        return cls.transition(
            db, record, RecordState.ARCHIVED, operator,
            reason=reason or "归档", transition_type="archive"
        )

    @classmethod
    def force_archive(cls, db: Session, record: Record, operator: str, reason: str = "") -> Tuple[Record, RecordStateHistory]:
        from_state = record.status

        if from_state == RecordState.ARCHIVED:
            history = RecordStateHistory(
                record_id=record.id,
                from_state=from_state,
                to_state=RecordState.ARCHIVED,
                transition_type="archive_skip",
                operator=operator,
                reason="已是归档状态"
            )
            db.add(history)
            return record, history

        history = RecordStateHistory(
            record_id=record.id,
            from_state=from_state,
            to_state=RecordState.ARCHIVED,
            transition_type="force_archive",
            operator=operator,
            reason=reason or "强制归档"
        )
        db.add(history)

        record.status = RecordState.ARCHIVED
        record.updated_at = datetime.now()

        return record, history

    @classmethod
    def override(
        cls,
        db: Session,
        record: Record,
        to_state: str,
        operator: str,
        reason: str,
        permission_level: str = "supervisor"
    ) -> Tuple[Record, OverrideRecord, RecordStateHistory]:
        from_state = record.status

        if permission_level != "supervisor":
            raise StateTransitionError(
                f"Permission denied: {operator} does not have supervisor permission to override"
            )

        override = OverrideRecord(
            record_id=record.id,
            original_status=from_state,
            new_status=to_state,
            override_reason=reason,
            operator=operator,
            permission_level=permission_level
        )
        db.add(override)

        if record.original_status is None:
            record.original_status = from_state

        record.status = to_state
        record.review_reason = reason
        record.updated_at = datetime.now()

        history = RecordStateHistory(
            record_id=record.id,
            from_state=from_state,
            to_state=to_state,
            transition_type="override",
            operator=operator,
            reason=reason
        )
        db.add(history)

        return record, override, history


class BatchStateMachine(StateMachine):
    @classmethod
    def transition(
        cls,
        db: Session,
        batch: Batch,
        to_state: str,
        operator: str,
        reason: str = "",
        transition_type: str = "manual"
    ) -> Tuple[Batch, BatchStateHistory]:
        from_state = batch.status

        if from_state != to_state:
            history = BatchStateHistory(
                batch_id=batch.id,
                from_state=from_state,
                to_state=to_state,
                transition_type=transition_type,
                operator=operator,
                reason=reason
            )
            db.add(history)

            batch.status = to_state
            batch.updated_at = datetime.now()

            return batch, history
        return batch, None

    @classmethod
    def freeze(cls, db: Session, batch: Batch, operator: str, reason: str) -> Tuple[Batch, BatchStateHistory]:
        batch.is_frozen = True
        batch.frozen_at = datetime.now()
        batch.frozen_by = operator
        batch.freeze_reason = reason
        batch.updated_at = datetime.now()

        history = BatchStateHistory(
            batch_id=batch.id,
            from_state=batch.status,
            to_state=RecordState.FROZEN,
            transition_type="freeze",
            operator=operator,
            reason=reason
        )
        db.add(history)

        return batch, history

    @classmethod
    def unfreeze(cls, db: Session, batch: Batch, operator: str, reason: str) -> Tuple[Batch, BatchStateHistory]:
        previous_status = batch.state_histories[-1].from_state if batch.state_histories else RecordState.SUBMITTED

        batch.is_frozen = False
        batch.unfrozen_at = datetime.now()
        batch.unfrozen_by = operator
        batch.unfreeze_reason = reason
        batch.updated_at = datetime.now()

        history = BatchStateHistory(
            batch_id=batch.id,
            from_state=RecordState.FROZEN,
            to_state=previous_status,
            transition_type="unfreeze",
            operator=operator,
            reason=reason
        )
        db.add(history)

        batch.status = previous_status

        return batch, history

    @classmethod
    def archive(cls, db: Session, batch: Batch, operator: str, reason: str = "") -> Tuple[Batch, BatchStateHistory]:
        return cls.transition(
            db, batch, RecordState.ARCHIVED, operator,
            reason=reason or "批次归档", transition_type="archive"
        )

    @classmethod
    def force_archive(cls, db: Session, batch: Batch, operator: str, reason: str = "") -> Tuple[Batch, BatchStateHistory]:
        from_state = batch.status

        if from_state == RecordState.ARCHIVED:
            history = BatchStateHistory(
                batch_id=batch.id,
                from_state=from_state,
                to_state=RecordState.ARCHIVED,
                transition_type="archive_skip",
                operator=operator,
                reason="已是归档状态"
            )
            db.add(history)
            return batch, history

        history = BatchStateHistory(
            batch_id=batch.id,
            from_state=from_state,
            to_state=RecordState.ARCHIVED,
            transition_type="force_archive",
            operator=operator,
            reason=reason or "强制归档"
        )
        db.add(history)

        batch.status = RecordState.ARCHIVED
        batch.is_frozen = False
        batch.updated_at = datetime.now()

        return batch, history
