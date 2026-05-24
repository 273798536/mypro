from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
import json

from .models import (
    AuditBatch, BatchStatus, StateTransition, User,
    CheckinRecord, DepositRecord, RoomChangeRecord
)
from .permissions import can_perform_action_on_batch, Permission


STATE_TRANSITIONS = {
    (BatchStatus.DRAFT, BatchStatus.SUBMITTED): Permission.SUBMIT_BATCH,
    (BatchStatus.SUBMITTED, BatchStatus.UNDER_REVIEW): Permission.REVIEW_BATCH,
    (BatchStatus.SUBMITTED, BatchStatus.REJECTED): Permission.REJECT_BATCH,
    (BatchStatus.UNDER_REVIEW, BatchStatus.APPROVED): Permission.APPROVE_BATCH,
    (BatchStatus.UNDER_REVIEW, BatchStatus.REJECTED): Permission.REJECT_BATCH,
    (BatchStatus.APPROVED, BatchStatus.FROZEN): Permission.FREEZE_BATCH,
    (BatchStatus.APPROVED, BatchStatus.ARCHIVED): Permission.ARCHIVE_BATCH,
    (BatchStatus.FROZEN, BatchStatus.APPROVED): Permission.UNFREEZE_BATCH,
    (BatchStatus.ARCHIVED, BatchStatus.APPROVED): Permission.UNARCHIVE_BATCH,
    (BatchStatus.REJECTED, BatchStatus.SUBMITTED): Permission.SUBMIT_BATCH,
}


def can_transition(from_status: BatchStatus, to_status: BatchStatus) -> bool:
    return (from_status, to_status) in STATE_TRANSITIONS


def get_required_permission(from_status: BatchStatus, to_status: BatchStatus) -> Optional[str]:
    return STATE_TRANSITIONS.get((from_status, to_status))


def take_batch_snapshot(batch: AuditBatch, db: Session) -> str:
    checkins = db.query(CheckinRecord).filter(CheckinRecord.batch_id == batch.id).all()
    deposits = db.query(DepositRecord).filter(DepositRecord.batch_id == batch.id).all()
    room_changes = db.query(RoomChangeRecord).filter(RoomChangeRecord.batch_id == batch.id).all()
    
    snapshot = {
        "batch": {
            "id": batch.id,
            "batch_no": batch.batch_no,
            "status": batch.status.value,
            "audit_date": batch.audit_date.isoformat() if batch.audit_date else None,
        },
        "checkins_count": len(checkins),
        "deposits_count": len(deposits),
        "room_changes_count": len(room_changes),
        "total_room_fee": sum(c.actual_room_fee for c in checkins),
        "total_deposit": sum(d.deposit_amount for d in deposits),
        "total_invoice": sum(c.invoice_amount for c in checkins),
    }
    return json.dumps(snapshot, ensure_ascii=False)


def transition_batch_state(
    db: Session,
    batch: AuditBatch,
    target_status: BatchStatus,
    user: User,
    reason: Optional[str] = None
) -> Tuple[bool, str]:
    if batch.status == target_status:
        return True, "Already in target state"
    
    if not can_transition(batch.status, target_status):
        return False, f"Cannot transition from {batch.status} to {target_status}"
    
    required_perm = get_required_permission(batch.status, target_status)
    if required_perm and not can_perform_action_on_batch(user, required_perm, batch.status):
        return False, f"Permission denied: {required_perm}"
    
    snapshot_before = take_batch_snapshot(batch, db)
    from_status = batch.status
    batch.status = target_status
    
    if target_status == BatchStatus.FROZEN:
        batch.frozen_at = datetime.now()
        batch.frozen_by = user.id
        batch.freeze_reason = reason
    elif target_status == BatchStatus.ARCHIVED:
        batch.archived_at = datetime.now()
        batch.archived_by = user.id
    
    transition = StateTransition(
        batch_id=batch.id,
        from_status=from_status,
        to_status=target_status,
        transition_by=user.id,
        reason=reason,
        snapshot_before=snapshot_before,
        snapshot_after=take_batch_snapshot(batch, db)
    )
    db.add(transition)
    db.commit()
    db.refresh(batch)
    
    return True, "Transition successful"


def submit_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.SUBMITTED, user, reason)


def start_review(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.UNDER_REVIEW, user, reason)


def approve_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.APPROVED, user, reason)


def reject_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.REJECTED, user, reason)


def freeze_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.FROZEN, user, reason)


def unfreeze_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.APPROVED, user, reason)


def archive_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.ARCHIVED, user, reason)


def unarchive_batch(db: Session, batch: AuditBatch, user: User, reason: Optional[str] = None) -> Tuple[bool, str]:
    return transition_batch_state(db, batch, BatchStatus.APPROVED, user, reason)


def get_batch_transitions(db: Session, batch_id: int):
    return db.query(StateTransition).filter(StateTransition.batch_id == batch_id).order_by(StateTransition.transition_at).all()
