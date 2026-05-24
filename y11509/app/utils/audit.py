from functools import wraps
from datetime import datetime
from flask import request, g
from app.models import db, AuditTrail, ActionType, RecordType, RecordStatus


def create_audit_trail(
    record_type: RecordType,
    record_id: int,
    record_no: str,
    action: ActionType,
    operator_id: int = None,
    operator_name: str = None,
    old_status: RecordStatus = None,
    new_status: RecordStatus = None,
    old_values: dict = None,
    new_values: dict = None,
    change_reason: str = None,
):
    audit = AuditTrail(
        record_type=record_type,
        record_id=record_id,
        record_no=record_no,
        action=action,
        operator_id=operator_id or getattr(g, "user_id", 1),
        operator_name=operator_name or getattr(g, "user_name", "系统管理员"),
        old_status=old_status,
        new_status=new_status,
        old_values=old_values,
        new_values=new_values,
        change_reason=change_reason,
        ip_address=request.remote_addr if request else "127.0.0.1",
        user_agent=request.user_agent.string if request and request.user_agent else "Unknown",
    )
    db.session.add(audit)
    db.session.flush()
    return audit


def audit_action(action: ActionType, record_type: RecordType, get_record_func):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            record_id = kwargs.get("record_id") or kwargs.get("id")
            old_record = None
            old_values = None
            old_status = None

            if record_id:
                old_record = get_record_func(record_id)
                if old_record:
                    old_status = old_record.status
                    old_values = {
                        col.name: getattr(old_record, col.name)
                        for col in old_record.__table__.columns
                        if col.name not in ["id", "created_at", "updated_at"]
                    }

            result = f(*args, **kwargs)

            if old_record and hasattr(result, "status_code") and result.status_code < 400:
                new_record = get_record_func(record_id)
                new_values = None
                new_status = None
                if new_record:
                    new_status = new_record.status
                    new_values = {
                        col.name: getattr(new_record, col.name)
                        for col in new_record.__table__.columns
                        if col.name not in ["id", "created_at", "updated_at"]
                    }

                create_audit_trail(
                    record_type=record_type,
                    record_id=record_id,
                    record_no=old_record.record_no if old_record else None,
                    action=action,
                    old_status=old_status,
                    new_status=new_status,
                    old_values=old_values,
                    new_values=new_values,
                    change_reason=kwargs.get("reason") or request.json.get("reason") if request and request.is_json else None,
                )
                db.session.commit()

            return result

        return decorated_function

    return decorator
