from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
from decimal import Decimal
from app.models.audit import AuditLog, AuditAction
from app.models.user import User
from app.models.ledger import EquipmentLedger


def json_serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat() if value else None
    return value


def compare_values(old_val: Any, new_val: Any) -> bool:
    if old_val is None and new_val is None:
        return False
    if old_val is None or new_val is None:
        return True
    if isinstance(old_val, datetime) and isinstance(new_val, datetime):
        return old_val != new_val
    return str(old_val) != str(new_val)


def calculate_field_diffs(
    previous_values: Dict[str, Any],
    new_values: Dict[str, Any],
    tracked_fields: Optional[list] = None
) -> Dict[str, Dict[str, Any]]:
    if tracked_fields is None:
        tracked_fields = [
            'customer_name', 'equipment_name', 'equipment_model', 'quantity',
            'unit_price', 'total_amount', 'deposit_amount', 'deposit_deducted',
            'rental_start_date', 'rental_end_date', 'actual_return_date',
            'status', 'is_dirty', 'is_duplicate'
        ]
    
    diffs = {}
    for field in tracked_fields:
        old_val = previous_values.get(field)
        new_val = new_values.get(field)
        if compare_values(old_val, new_val):
            diffs[field] = {
                'old_value': json_serialize_value(old_val),
                'new_value': json_serialize_value(new_val)
            }
    return diffs


def ledger_to_dict(ledger: EquipmentLedger) -> Dict[str, Any]:
    result = {}
    for column in ledger.__table__.columns:
        value = getattr(ledger, column.name)
        result[column.name] = json_serialize_value(value)
    return result


def create_audit_log(
    db: Session,
    ledger_id: int,
    user: User,
    action: AuditAction,
    previous_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    change_reason: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    field_changes = None
    if previous_values and new_values:
        field_changes = calculate_field_diffs(previous_values, new_values)
    
    audit_log = AuditLog(
        ledger_id=ledger_id,
        user_id=user.id,
        username=user.username,
        user_role=user.role.value,
        action=action,
        previous_values=previous_values,
        new_values=new_values,
        change_reason=change_reason,
        field_changes=field_changes,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.flush()
    return audit_log


def get_audit_logs_by_ledger(
    db: Session,
    ledger_id: int,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(AuditLog).filter(AuditLog.ledger_id == ledger_id)
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return total, logs
