from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from models import (
    RecordState, BatchState, AbnormalRecord, Batch,
    RecordStateLog, BatchStateLog
)


RECORD_TRANSITIONS = {
    RecordState.DRAFT: {
        RecordState.PENDING_REVIEW, RecordState.APPROVED, RecordState.REJECTED,
        RecordState.RECALLED
    },
    RecordState.PENDING_REVIEW: {
        RecordState.APPROVED, RecordState.REJECTED,
        RecordState.DRAFT, RecordState.RECALLED, RecordState.FROZEN
    },
    RecordState.APPROVED: {RecordState.SETTLED, RecordState.DRAFT, RecordState.FROZEN},
    RecordState.REJECTED: {RecordState.DRAFT, RecordState.FROZEN, RecordState.APPROVED},
    RecordState.FROZEN: {RecordState.DRAFT, RecordState.SETTLED, RecordState.APPROVED, RecordState.REJECTED},
    RecordState.SETTLED: {RecordState.ARCHIVED, RecordState.DRAFT},
    RecordState.RECALLED: {RecordState.DRAFT},
    RecordState.ARCHIVED: set(),
}


BATCH_TRANSITIONS = {
    BatchState.CREATED: {BatchState.IMPORTING, BatchState.RECALLED},
    BatchState.IMPORTING: {
        BatchState.PENDING_REVIEW, BatchState.PARTIAL_FAILED, BatchState.RECALLED
    },
    BatchState.PARTIAL_FAILED: {
        BatchState.IMPORTING, BatchState.PENDING_REVIEW,
        BatchState.FROZEN, BatchState.RECALLED
    },
    BatchState.PENDING_REVIEW: {
        BatchState.IMPORTING, BatchState.FROZEN,
        BatchState.SETTLED, BatchState.RECALLED
    },
    BatchState.FROZEN: {BatchState.PENDING_REVIEW, BatchState.SETTLED},
    BatchState.SETTLED: {BatchState.ARCHIVED, BatchState.PENDING_REVIEW},
    BatchState.RECALLED: {BatchState.CREATED},
    BatchState.ARCHIVED: set(),
}


class InvalidStateTransitionError(Exception):
    def __init__(self, from_state: str, to_state: str, entity_type: str = "record"):
        self.from_state = from_state
        self.to_state = to_state
        self.entity_type = entity_type
        super().__init__(
            f"Invalid {entity_type} state transition: {from_state} -> {to_state}"
        )


def can_transition_record(current_state: RecordState, target_state: RecordState) -> bool:
    return target_state in RECORD_TRANSITIONS.get(current_state, set())


def can_transition_batch(current_state: BatchState, target_state: BatchState) -> bool:
    return target_state in BATCH_TRANSITIONS.get(current_state, set())


def transition_record_state(
    db: Session,
    record: AbnormalRecord,
    target_state: RecordState,
    operator: str,
    reason: str,
    log_data: Optional[Dict[str, Any]] = None,
    force: bool = False
) -> AbnormalRecord:
    from_state = record.state

    if not force and not can_transition_record(from_state, target_state):
        raise InvalidStateTransitionError(
            from_state.value, target_state.value, "record"
        )

    log = RecordStateLog(
        record_id=record.id,
        from_state=from_state,
        to_state=target_state,
        operator=operator,
        reason=reason,
        change_time=datetime.now(),
        log_data=log_data or {}
    )
    db.add(log)

    record.state = target_state
    record.updated_at = datetime.now()

    return record


def transition_batch_state(
    db: Session,
    batch: Batch,
    target_state: BatchState,
    operator: str,
    reason: str,
    log_data: Optional[Dict[str, Any]] = None,
    force: bool = False
) -> Batch:
    from_state = batch.state

    if not force and not can_transition_batch(from_state, target_state):
        raise InvalidStateTransitionError(
            from_state.value, target_state.value, "batch"
        )

    log = BatchStateLog(
        batch_id=batch.id,
        from_state=from_state,
        to_state=target_state,
        operator=operator,
        reason=reason,
        change_time=datetime.now(),
        log_data=log_data or {}
    )
    db.add(log)

    batch.state = target_state
    batch.updated_at = datetime.now()

    return batch


def auto_update_batch_state(db: Session, batch: Batch, operator: str) -> Batch:
    records = batch.records
    if not records:
        return batch

    states = [r.state for r in records]

    if all(s == RecordState.SETTLED for s in states):
        return transition_batch_state(
            db, batch, BatchState.SETTLED, operator,
            "所有记录已结算", log_data={"auto": True}
        )

    if any(s == RecordState.FROZEN for s in states):
        if batch.state != BatchState.FROZEN:
            return transition_batch_state(
                db, batch, BatchState.FROZEN, operator,
                "存在已冻结记录", log_data={"auto": True}
            )

    if all(s in (RecordState.APPROVED, RecordState.REJECTED) for s in states):
        if batch.state == BatchState.PENDING_REVIEW:
            pass

    return batch
