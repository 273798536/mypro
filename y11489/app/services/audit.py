from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.audit import AuditLog, ChangeHistory
from app.models.user import User
from app.models.states import RecordStatus


class AuditService:
    SENSITIVE_FIELDS = {
        "original_price",
        "adjusted_price",
        "price_difference",
        "hashed_password",
    }

    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[int],
        user: User,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        change_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            change_reason=change_reason,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role.value if hasattr(user.role, 'value') else str(user.role),
            ip_address=ip_address,
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def record_change(
        db: Session,
        entity_type: str,
        entity_id: int,
        field_name: str,
        old_value: Any,
        new_value: Any,
        user: User,
        version: int = 1,
        is_manual_change: bool = False,
        change_reason: Optional[str] = None,
        status_before: Optional[RecordStatus] = None,
        status_after: Optional[RecordStatus] = None,
    ) -> ChangeHistory:
        is_sensitive = field_name in AuditService.SENSITIVE_FIELDS

        change = ChangeHistory(
            entity_type=entity_type,
            entity_id=entity_id,
            version=version,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            is_sensitive_field=1 if is_sensitive else 0,
            is_manual_change=1 if is_manual_change else 0,
            change_reason=change_reason,
            changed_by=user.id,
            status_before=status_before.value if status_before else None,
            status_after=status_after.value if status_after else None,
        )
        db.add(change)
        db.commit()
        db.refresh(change)
        return change

    @staticmethod
    def record_changes_from_dict(
        db: Session,
        entity_type: str,
        entity_id: int,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any],
        user: User,
        version: int = 1,
        is_manual_change: bool = False,
        change_reason: Optional[str] = None,
        status_before: Optional[RecordStatus] = None,
        status_after: Optional[RecordStatus] = None,
    ):
        for field in set(list(old_data.keys()) + list(new_data.keys())):
            old_val = old_data.get(field)
            new_val = new_data.get(field)
            if old_val != new_val:
                AuditService.record_change(
                    db=db,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    field_name=field,
                    old_value=old_val,
                    new_value=new_val,
                    user=user,
                    version=version,
                    is_manual_change=is_manual_change,
                    change_reason=change_reason,
                    status_before=status_before,
                    status_after=status_after,
                )

    @staticmethod
    def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        masked = data.copy()
        for field in AuditService.SENSITIVE_FIELDS:
            if field in masked and masked[field] is not None:
                masked[field] = "***"
        return masked
