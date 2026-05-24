from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.schemas import AuditLog


class AuditLogger:
    def __init__(self, db: Session):
        self.db = db

    def log_operation(
        self,
        operation_type: str,
        entity_type: str,
        entity_id: str,
        operator: str,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        change_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        log = AuditLog(
            operation_type=operation_type,
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            old_value=old_value,
            new_value=new_value,
            change_reason=change_reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def log_create(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        new_value: Dict[str, Any],
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="CREATE",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            new_value=new_value,
            **kwargs,
        )

    def log_update(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        old_value: Dict[str, Any],
        new_value: Dict[str, Any],
        change_reason: Optional[str] = None,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="UPDATE",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            old_value=old_value,
            new_value=new_value,
            change_reason=change_reason,
            **kwargs,
        )

    def log_delete(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        old_value: Dict[str, Any],
        change_reason: Optional[str] = None,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="DELETE",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            old_value=old_value,
            change_reason=change_reason,
            **kwargs,
        )

    def log_merge(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        merged_from: list,
        merge_reason: str,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="MERGE",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            new_value={"merged_from": merged_from},
            change_reason=merge_reason,
            **kwargs,
        )

    def log_withdraw(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        withdraw_reason: str,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="WITHDRAW",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            change_reason=withdraw_reason,
            **kwargs,
        )

    def log_freeze(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="FREEZE",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            **kwargs,
        )

    def log_export(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        record_count: int,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="EXPORT",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            new_value={"record_count": record_count},
            **kwargs,
        )

    def log_adjustment(
        self,
        entity_type: str,
        entity_id: str,
        operator: str,
        old_value: Dict[str, Any],
        new_value: Dict[str, Any],
        adjustment_reason: str,
        **kwargs,
    ) -> AuditLog:
        return self.log_operation(
            operation_type="MANUAL_ADJUST",
            entity_type=entity_type,
            entity_id=entity_id,
            operator=operator,
            old_value=old_value,
            new_value=new_value,
            change_reason=adjustment_reason,
            **kwargs,
        )
