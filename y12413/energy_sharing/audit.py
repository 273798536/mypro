from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from .models import AuditEntry
from .storage import DataStore


class AuditTrail:
    def __init__(self, store: DataStore):
        self.store = store

    def log_change(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        old_value: Any = None,
        new_value: Any = None,
        reason: str = "",
        operator: str = "",
        affected_results: Optional[list[str]] = None,
    ) -> AuditEntry:
        entry = AuditEntry(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            operator=operator,
            affected_results=affected_results or [],
        )
        self.store.save_audit(entry)
        return entry

    def log_project_create(self, project_id: str, name: str, operator: str = "") -> AuditEntry:
        return self.log_change(
            entity_type="ProjectContract",
            entity_id=project_id,
            action="create",
            new_value={"name": name},
            reason="创建项目合同",
            operator=operator,
        )

    def log_baseline_adjust(
        self,
        project_id: str,
        month: str,
        old_kwh: float,
        new_kwh: float,
        reason: str,
        adjustment_id: str,
        operator: str = "",
    ) -> AuditEntry:
        return self.log_change(
            entity_type="ProjectContract",
            entity_id=project_id,
            action="baseline_adjust",
            old_value={"month": month, "kwh": old_kwh},
            new_value={"month": month, "kwh": new_kwh},
            reason=reason,
            operator=operator,
        )

    def log_ratio_update(
        self,
        project_id: str,
        old_version: int,
        new_version: int,
        reason: str,
        operator: str = "",
    ) -> AuditEntry:
        return self.log_change(
            entity_type="ProjectContract",
            entity_id=project_id,
            action="ratio_update",
            old_value={"version": old_version},
            new_value={"version": new_version},
            reason=reason,
            operator=operator,
        )

    def log_meter_reading(
        self,
        project_id: str,
        reading_id: str,
        month: str,
        kwh: float,
        is_backfilled: bool,
        reason: str = "",
        operator: str = "",
    ) -> AuditEntry:
        action = "backfill" if is_backfilled else "add"
        return self.log_change(
            entity_type="MeterReading",
            entity_id=reading_id,
            action=action,
            new_value={"project_id": project_id, "month": month, "kwh": kwh},
            reason=reason or ("补录电表读数" if is_backfilled else "新增电表读数"),
            operator=operator,
        )

    def log_maintenance(
        self,
        project_id: str,
        record_id: str,
        start_date: str,
        end_date: str,
        excluded_kwh: float,
        operator: str = "",
    ) -> AuditEntry:
        return self.log_change(
            entity_type="MaintenanceRecord",
            entity_id=record_id,
            action="add",
            new_value={
                "project_id": project_id,
                "start_date": start_date,
                "end_date": end_date,
                "excluded_kwh": excluded_kwh,
            },
            reason="新增检修记录",
            operator=operator,
        )

    def log_calculation(
        self,
        project_id: str,
        result_id: str,
        version: int,
        trigger_reason: str,
        operator: str = "",
    ) -> AuditEntry:
        return self.log_change(
            entity_type="SharingResult",
            entity_id=result_id,
            action="calculate",
            new_value={"project_id": project_id, "version": version},
            reason=trigger_reason or "计算收益分成",
            operator=operator,
        )

    def log_impacted_by_new_data(
        self,
        project_id: str,
        new_entity_type: str,
        new_entity_id: str,
        affected_result_ids: list[str],
        reason: str,
        operator: str = "",
    ) -> AuditEntry:
        return self.log_change(
            entity_type=new_entity_type,
            entity_id=new_entity_id,
            action="impact",
            new_value={"affected_results": affected_result_ids},
            reason=reason,
            operator=operator,
            affected_results=affected_result_ids,
        )

    def get_history(self, entity_id: Optional[str] = None) -> list[dict]:
        audits = self.store.load_audits(entity_id)
        return [
            {
                "time": a.timestamp,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "action": a.action,
                "reason": a.reason,
                "old": a.old_value,
                "new": a.new_value,
                "operator": a.operator,
                "affected_results": a.affected_results,
            }
            for a in audits
        ]

    def get_project_history(self, project_id: str) -> list[dict]:
        all_audits = self.store.load_audits()
        project_audits = [
            a for a in all_audits
            if a.entity_id == project_id
            or (a.old_value and isinstance(a.old_value, dict) and a.old_value.get("project_id") == project_id)
            or (a.new_value and isinstance(a.new_value, dict) and a.new_value.get("project_id") == project_id)
        ]
        return [
            {
                "时间": a.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "操作类型": a.entity_type,
                "操作": a.action,
                "原因": a.reason,
                "旧值": a.old_value,
                "新值": a.new_value,
                "操作人": a.operator,
                "影响结果": a.affected_results,
            }
            for a in sorted(project_audits, key=lambda x: x.timestamp)
        ]
