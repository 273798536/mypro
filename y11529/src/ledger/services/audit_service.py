from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd

from ..models import (
    LedgerRecord, RecordStatus, RecordType, Role,
    AuditLog, VersionDiff, ChangeReason, ActionType
)


class DiffItem:
    def __init__(
        self,
        field_name: str,
        old_value: Optional[str],
        new_value: Optional[str],
        is_sensitive: bool = False,
    ):
        self.field_name = field_name
        self.old_value = old_value
        self.new_value = new_value
        self.is_sensitive = is_sensitive

    def to_dict(self, desensitize: bool = False) -> Dict[str, Any]:
        return {
            "field_name": self.field_name,
            "old_value": "***" if (self.is_sensitive and desensitize) else self.old_value,
            "new_value": "***" if (self.is_sensitive and desensitize) else self.new_value,
            "is_sensitive": self.is_sensitive,
        }


class AuditDiff:
    def __init__(
        self,
        audit_log: AuditLog,
        diffs: List[VersionDiff],
    ):
        self.audit_log = audit_log
        self.diffs = [DiffItem(d.field_name, d.old_value, d.new_value, d.is_sensitive) for d in diffs]

    def to_dict(self, desensitize: bool = False) -> Dict[str, Any]:
        return {
            "action": self.audit_log.action.value,
            "action_by": self.audit_log.action_by,
            "action_by_role": self.audit_log.action_by_role.value if self.audit_log.action_by_role else None,
            "action_note": self.audit_log.action_note,
            "action_time": self.audit_log.created_at.isoformat() if self.audit_log.created_at else None,
            "version_before": self.audit_log.version_before,
            "version_after": self.audit_log.version_after,
            "diffs": [d.to_dict(desensitize) for d in self.diffs],
        }


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def get_record_history(
        self,
        record_id: int,
        desensitize: bool = False,
    ) -> List[AuditDiff]:
        audit_logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.ledger_record_id == record_id)
            .order_by(AuditLog.created_at.desc())
            .all()
        )

        result = []
        for log in audit_logs:
            diffs = (
                self.db.query(VersionDiff)
                .filter(VersionDiff.audit_log_id == log.id)
                .all()
            )
            result.append(AuditDiff(log, diffs))

        return result

    def compare_versions(
        self,
        record_id: int,
        version1: int,
        version2: int,
        desensitize: bool = False,
    ) -> Dict[str, Any]:
        logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.ledger_record_id == record_id)
            .order_by(AuditLog.created_at)
            .all()
        )

        data_v1 = None
        data_v2 = None

        for log in logs:
            if log.version_after == version1:
                data_v1 = log.after_data
            if log.version_after == version2:
                data_v2 = log.after_data

        if data_v1 is None or data_v2 is None:
            raise ValueError("One or both versions not found")

        diffs = []
        all_keys = set(data_v1.keys()) | set(data_v2.keys())
        sensitive_fields = {"tax_amount", "duty_amount", "vat_amount", "declared_value"}

        for key in all_keys:
            old_val = data_v1.get(key)
            new_val = data_v2.get(key)

            if old_val != new_val:
                is_sensitive = key in sensitive_fields
                diffs.append({
                    "field_name": key,
                    "old_value": "***" if (is_sensitive and desensitize) else old_val,
                    "new_value": "***" if (is_sensitive and desensitize) else new_val,
                    "is_sensitive": is_sensitive,
                })

        return {
            "record_id": record_id,
            "version1": version1,
            "version2": version2,
            "diffs": diffs,
        }

    def get_change_reason_summary(
        self,
        record_id: int,
    ) -> List[Dict[str, Any]]:
        logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.ledger_record_id == record_id)
            .filter(AuditLog.action.in_([ActionType.UPDATE, ActionType.REJECT, ActionType.RECALL]))
            .order_by(AuditLog.created_at)
            .all()
        )

        result = []
        for log in logs:
            result.append({
                "action": log.action.value,
                "action_by": log.action_by,
                "action_time": log.created_at.isoformat() if log.created_at else None,
                "reason": log.action_note,
            })

        return result

    def get_audit_trail(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action_by: Optional[str] = None,
        action_type: Optional[ActionType] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(AuditLog)

        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        if action_by:
            query = query.filter(AuditLog.action_by == action_by)
        if action_type:
            query = query.filter(AuditLog.action == action_type)

        logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

        return [
            {
                "id": log.id,
                "record_id": log.ledger_record_id,
                "action": log.action.value,
                "action_by": log.action_by,
                "action_by_role": log.action_by_role.value if log.action_by_role else None,
                "action_note": log.action_note,
                "action_time": log.created_at.isoformat() if log.created_at else None,
                "version_before": log.version_before,
                "version_after": log.version_after,
            }
            for log in logs
        ]


class RoleViewService:
    SENSITIVE_FIELDS = {
        "tax_amount", "duty_amount", "vat_amount", "declared_value",
        "original_tax", "supplementary_tax", "total_tax",
    }

    ROLE_FIELD_PERMISSIONS = {
        Role.DATA_ENTRY: {
            "allowed": {"record_no", "status", "tracking_no", "package_no", "customs_no",
                       "declaration_no", "hs_code", "goods_description", "quantity",
                       "is_exception", "exception_note"},
            "desensitize": SENSITIVE_FIELDS,
        },
        Role.REVIEWER: {
            "allowed": {"record_no", "status", "tracking_no", "package_no", "customs_no",
                       "declaration_no", "hs_code", "goods_description", "quantity",
                       "declared_value", "tax_amount", "duty_amount", "vat_amount",
                       "is_exception", "exception_note", "exception_owner",
                       "current_handler", "change_reason", "change_reason_note"},
            "desensitize": set(),
        },
        Role.MANAGER: {
            "allowed": {"record_no", "status", "tracking_no", "package_no", "customs_no",
                       "declaration_no", "hs_code", "goods_description", "quantity",
                       "declared_value", "tax_amount", "duty_amount", "vat_amount",
                       "is_exception", "exception_note", "exception_owner",
                       "current_handler", "final_handler", "change_reason", "change_reason_note",
                       "notice_no", "original_tax", "supplementary_tax", "total_tax"},
            "desensitize": set(),
        },
        Role.AUDITOR: {
            "allowed": {"*"},
            "desensitize": set(),
        },
        Role.EXPORT_ONLY: {
            "allowed": {"record_no", "status", "tracking_no", "package_no",
                       "declaration_no", "hs_code", "goods_description",
                       "is_exception", "exception_owner",
                       "change_reason", "change_reason_note"},
            "desensitize": SENSITIVE_FIELDS,
        },
    }

    @classmethod
    def filter_record_for_role(
        cls,
        record_data: Dict[str, Any],
        role: Role,
    ) -> Dict[str, Any]:
        permissions = cls.ROLE_FIELD_PERMISSIONS.get(role, cls.ROLE_FIELD_PERMISSIONS[Role.EXPORT_ONLY])
        allowed = permissions["allowed"]
        desensitize = permissions["desensitize"]

        if "*" in allowed:
            filtered = record_data.copy()
        else:
            filtered = {k: v for k, v in record_data.items() if k in allowed}

        for field in desensitize:
            if field in filtered:
                filtered[field] = "***"

        return filtered

    @classmethod
    def filter_records_for_role(
        cls,
        records: List[Dict[str, Any]],
        role: Role,
    ) -> List[Dict[str, Any]]:
        return [cls.filter_record_for_role(r, role) for r in records]
