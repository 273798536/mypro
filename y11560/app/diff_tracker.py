import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from .models import AuditBatch, StateTransition, CheckinRecord, DepositRecord, RoomChangeRecord, BatchStatus
from .schemas import DiffItem, StateTransitionDiff


def compare_json(old_obj: Any, new_obj: Any, path: str = "") -> List[DiffItem]:
    changes = []
    
    if isinstance(old_obj, dict) and isinstance(new_obj, dict):
        all_keys = set(old_obj.keys()) | set(new_obj.keys())
        for key in all_keys:
            old_val = old_obj.get(key)
            new_val = new_obj.get(key)
            new_path = f"{path}.{key}" if path else key
            changes.extend(compare_json(old_val, new_val, new_path))
    elif isinstance(old_obj, list) and isinstance(new_obj, list):
        max_len = max(len(old_obj), len(new_obj))
        for i in range(max_len):
            old_val = old_obj[i] if i < len(old_obj) else None
            new_val = new_obj[i] if i < len(new_obj) else None
            new_path = f"{path}[{i}]"
            changes.extend(compare_json(old_val, new_val, new_path))
    else:
        if old_obj != new_obj:
            changes.append(DiffItem(field=path, old_value=old_obj, new_value=new_obj))
    
    return changes


def analyze_transition_diff(transition: StateTransition) -> StateTransitionDiff:
    snapshot_before = json.loads(transition.snapshot_before) if transition.snapshot_before else {}
    snapshot_after = json.loads(transition.snapshot_after) if transition.snapshot_after else {}
    
    changes = compare_json(snapshot_before, snapshot_after)
    
    return StateTransitionDiff(
        transition_id=transition.id,
        from_status=transition.from_status,
        to_status=transition.to_status,
        changes=changes
    )


def get_batch_transition_diffs(db: Session, batch_id: int) -> List[StateTransitionDiff]:
    transitions = db.query(StateTransition).filter(
        StateTransition.batch_id == batch_id
    ).order_by(StateTransition.transition_at).all()
    
    return [analyze_transition_diff(t) for t in transitions]


def get_freeze_status_comparison(db: Session, batch_id: int) -> Dict[str, Any]:
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        return {}
    
    freeze_transition = db.query(StateTransition).filter(
        StateTransition.batch_id == batch_id,
        StateTransition.to_status == BatchStatus.FROZEN
    ).order_by(StateTransition.transition_at.desc()).first()
    
    if not freeze_transition:
        return {"is_frozen": False}
    
    snapshot_before = json.loads(freeze_transition.snapshot_before) if freeze_transition.snapshot_before else {}
    snapshot_after = json.loads(freeze_transition.snapshot_after) if freeze_transition.snapshot_after else {}
    
    return {
        "is_frozen": True,
        "frozen_at": batch.frozen_at,
        "freeze_reason": batch.freeze_reason,
        "status_before_freeze": freeze_transition.from_status,
        "status_after_freeze": freeze_transition.to_status,
        "snapshot_before": snapshot_before,
        "snapshot_after": snapshot_after,
        "changes": compare_json(snapshot_before, snapshot_after)
    }


def build_batch_snapshot(batch: AuditBatch, db: Session) -> Dict[str, Any]:
    checkins = db.query(CheckinRecord).filter(CheckinRecord.batch_id == batch.id).all()
    deposits = db.query(DepositRecord).filter(DepositRecord.batch_id == batch.id).all()
    room_changes = db.query(RoomChangeRecord).filter(RoomChangeRecord.batch_id == batch.id).all()
    
    return {
        "batch": {
            "id": batch.id,
            "batch_no": batch.batch_no,
            "status": batch.status.value,
            "audit_date": batch.audit_date.isoformat() if batch.audit_date else None,
        },
        "checkins": [
            {
                "id": c.id,
                "record_no": c.record_no,
                "guest_name": c.guest_name,
                "room_no": c.room_no,
                "checkin_time": c.checkin_time.isoformat() if c.checkin_time else None,
                "room_rate": c.room_rate,
                "actual_room_fee": c.actual_room_fee,
                "invoice_amount": c.invoice_amount,
            }
            for c in checkins
        ],
        "deposits": [
            {
                "id": d.id,
                "record_no": d.record_no,
                "guest_name": d.guest_name,
                "deposit_amount": d.deposit_amount,
                "balance": d.balance,
            }
            for d in deposits
        ],
        "room_changes": [
            {
                "id": r.id,
                "record_no": r.record_no,
                "old_room_no": r.old_room_no,
                "new_room_no": r.new_room_no,
                "rate_difference": r.rate_difference,
            }
            for r in room_changes
        ]
    }
