"""审计历史系统 - 记录每次修改、判断变更，让下一班能看到完整历史"""

import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
from pathlib import Path

from .models import AuditEntry, VerificationStatus, CalculationRule


class AuditTrail:
    def __init__(self, storage_path: Optional[str] = None):
        self._entries: List[AuditEntry] = []
        self._rule_history: Dict[str, List[CalculationRule]] = {}
        self._storage_path = storage_path or "./data/audit_log.json"
        self._tolerance_adjustments: List[Dict[str, Any]] = []

    def log_entry(
        self,
        operator: str,
        action: str,
        field_changed: str = "",
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        reason: str = "",
        affected_record_ids: Optional[List[str]] = None,
    ) -> AuditEntry:
        entry = AuditEntry(
            operator=operator,
            action=action,
            field_changed=field_changed,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            affected_record_ids=affected_record_ids or [],
        )
        self._entries.append(entry)
        return entry

    def log_tolerance_adjustment(
        self,
        operator: str,
        old_tolerance: float,
        new_tolerance: float,
        reason: str,
        affected_formula: str,
    ) -> Dict[str, Any]:
        adjustment = {
            "timestamp": datetime.now().isoformat(),
            "operator": operator,
            "old_tolerance": old_tolerance,
            "new_tolerance": new_tolerance,
            "reason": reason,
            "affected_formula": affected_formula,
        }
        self._tolerance_adjustments.append(adjustment)

        self.log_entry(
            operator=operator,
            action="调整容差",
            field_changed="tolerance",
            old_value=old_tolerance,
            new_value=new_tolerance,
            reason=reason,
        )
        return adjustment

    def log_manual_override(
        self,
        operator: str,
        record_id: str,
        old_status: VerificationStatus,
        new_status: VerificationStatus,
        reason: str,
        comment: str = "",
    ) -> AuditEntry:
        return self.log_entry(
            operator=operator,
            action="人工复核调整",
            field_changed="verification_status",
            old_value=old_status.value,
            new_value=new_status.value,
            reason=reason,
            affected_record_ids=[record_id],
        )

    def log_rule_change(
        self,
        operator: str,
        rule: CalculationRule,
        change_description: str,
    ) -> AuditEntry:
        if rule.formula_id not in self._rule_history:
            self._rule_history[rule.formula_id] = []
        self._rule_history[rule.formula_id].append(rule)

        return self.log_entry(
            operator=operator,
            action="修改计算规则",
            field_changed=f"rule_{rule.formula_id}",
            old_value=None,
            new_value={
                "formula_id": rule.formula_id,
                "description": rule.description,
                "version": rule.version,
            },
            reason=change_description,
        )

    def log_field_mapping_change(
        self,
        operator: str,
        source_field: str,
        old_standard: str,
        new_standard: str,
        data_source: str,
        reason: str,
    ) -> AuditEntry:
        return self.log_entry(
            operator=operator,
            action="修改字段映射",
            field_changed=f"mapping_{source_field}",
            old_value=old_standard,
            new_value=new_standard,
            reason=reason,
        )

    def get_history_for_record(self, record_id: str) -> List[AuditEntry]:
        return [e for e in self._entries if record_id in e.affected_record_ids]

    def get_history_for_operator(self, operator: str) -> List[AuditEntry]:
        return [e for e in self._entries if e.operator == operator]

    def get_history_for_field(self, field_name: str) -> List[AuditEntry]:
        return [e for e in self._entries if e.field_changed == field_name]

    def get_rule_history(self, formula_id: str) -> List[CalculationRule]:
        return self._rule_history.get(formula_id, [])

    def get_full_history_dataframe(self) -> pd.DataFrame:
        data = []
        for e in self._entries:
            data.append({
                "操作时间": e.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "操作人": e.operator,
                "操作类型": e.action,
                "修改字段": e.field_changed,
                "原值": str(e.old_value) if e.old_value is not None else "",
                "新值": str(e.new_value) if e.new_value is not None else "",
                "修改原因": e.reason,
                "影响记录": ", ".join(e.affected_record_ids),
                "操作ID": e.entry_id,
            })
        return pd.DataFrame(data)

    def get_timeline_summary(self) -> List[Dict[str, Any]]:
        timeline = []
        for e in self._entries:
            timeline.append({
                "time": e.timestamp.strftime("%H:%M:%S"),
                "operator": e.operator,
                "action": e.action,
                "detail": f"{e.field_changed}: {e.old_value} → {e.new_value}" if e.old_value else f"{e.reason}",
                "reason": e.reason,
            })
        return timeline

    def generate_change_report(self) -> str:
        if not self._entries:
            return "暂无操作历史记录"

        report = ["=" * 60]
        report.append("审计历史变更报告")
        report.append("=" * 60)
        report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"总操作次数: {len(self._entries)}")
        report.append(f"操作人统计: {self._get_operator_stats()}")
        report.append("")

        current_operator = None
        for e in sorted(self._entries, key=lambda x: x.timestamp):
            if e.operator != current_operator:
                report.append("")
                report.append(f"--- {e.operator} 的操作 ---")
                current_operator = e.operator

            report.append(f"[{e.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {e.action}")
            if e.field_changed:
                report.append(f"    字段: {e.field_changed}")
            if e.old_value is not None and e.new_value is not None:
                report.append(f"    变更: {e.old_value} → {e.new_value}")
            if e.reason:
                report.append(f"    原因: {e.reason}")
            if e.affected_record_ids:
                report.append(f"    影响记录: {', '.join(e.affected_record_ids)}")
            report.append(f"    操作ID: {e.entry_id}")
            report.append("")

        report.append("=" * 60)
        return "\n".join(report)

    def _get_operator_stats(self) -> Dict[str, int]:
        stats = {}
        for e in self._entries:
            stats[e.operator] = stats.get(e.operator, 0) + 1
        return stats

    def save_to_disk(self, path: Optional[str] = None):
        save_path = path or self._storage_path
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)

        data = {
            "entries": [
                {
                    "entry_id": e.entry_id,
                    "timestamp": e.timestamp.isoformat(),
                    "operator": e.operator,
                    "action": e.action,
                    "field_changed": e.field_changed,
                    "old_value": e.old_value,
                    "new_value": e.new_value,
                    "reason": e.reason,
                    "affected_record_ids": e.affected_record_ids,
                }
                for e in self._entries
            ],
            "tolerance_adjustments": self._tolerance_adjustments,
            "export_time": datetime.now().isoformat(),
        }

        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_from_disk(self, path: Optional[str] = None):
        load_path = path or self._storage_path
        if not Path(load_path).exists():
            return

        with open(load_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for entry_data in data.get("entries", []):
            entry = AuditEntry(
                entry_id=entry_data["entry_id"],
                timestamp=datetime.fromisoformat(entry_data["timestamp"]),
                operator=entry_data["operator"],
                action=entry_data["action"],
                field_changed=entry_data["field_changed"],
                old_value=entry_data["old_value"],
                new_value=entry_data["new_value"],
                reason=entry_data["reason"],
                affected_record_ids=entry_data["affected_record_ids"],
            )
            self._entries.append(entry)

        self._tolerance_adjustments = data.get("tolerance_adjustments", [])
