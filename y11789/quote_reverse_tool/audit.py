from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

from .models import AuditTrail, ReverseResult, DataSource, DataSourceInfo


class AuditManager:
    def __init__(self, audit_log_path: Optional[str] = None):
        self.audit_log_path = audit_log_path
        self.audit_trails: List[AuditTrail] = []

    def log_action(
        self,
        action: str,
        before_value: Any = None,
        after_value: Any = None,
        operator: str = "system",
        reason: Optional[str] = None
    ) -> AuditTrail:
        trail = AuditTrail(
            timestamp=datetime.now(),
            action=action,
            before_value=before_value,
            after_value=after_value,
            operator=operator,
            reason=reason
        )
        self.audit_trails.append(trail)

        if self.audit_log_path:
            self._append_to_file(trail)

        return trail

    def log_manual_correction(
        self,
        field_name: str,
        old_value: Any,
        new_value: Any,
        operator: str,
        reason: str
    ) -> AuditTrail:
        return self.log_action(
            action=f"人工修正: {field_name}",
            before_value=old_value,
            after_value=new_value,
            operator=operator,
            reason=reason
        )

    def log_config_change(
        self,
        config_type: str,
        config_id: str,
        old_value: Any,
        new_value: Any,
        operator: str,
        reason: Optional[str] = None
    ) -> AuditTrail:
        return self.log_action(
            action=f"配置变更: {config_type}/{config_id}",
            before_value=old_value,
            after_value=new_value,
            operator=operator,
            reason=reason
        )

    def get_trails_by_action(self, action_keyword: str) -> List[AuditTrail]:
        return [t for t in self.audit_trails if action_keyword in t.action]

    def get_trails_by_operator(self, operator: str) -> List[AuditTrail]:
        return [t for t in self.audit_trails if t.operator == operator]

    def get_trails_in_timerange(self, start: datetime, end: datetime) -> List[AuditTrail]:
        return [t for t in self.audit_trails if start <= t.timestamp <= end]

    def _append_to_file(self, trail: AuditTrail):
        if not os.path.exists(os.path.dirname(self.audit_log_path)):
            os.makedirs(os.path.dirname(self.audit_log_path), exist_ok=True)

        with open(self.audit_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(trail.to_dict(), ensure_ascii=False) + '\n')

    def generate_audit_report(self, result: ReverseResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("审计追踪报告")
        lines.append("=" * 60)

        lines.append(f"\n📋 数据来源:")
        if result.data_sources:
            for ds in result.data_sources:
                lines.append(f"  • [{ds.source.value}] {ds.file_name} - {ds.record_id} (加载于 {ds.loaded_at.strftime('%H:%M:%S')})")
        else:
            lines.append("  无数据源记录")

        lines.append(f"\n📝 操作记录:")
        all_trails = self.audit_trails + result.audit_trails
        if all_trails:
            for trail in all_trails:
                lines.append(f"\n  [{trail.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {trail.action}")
                lines.append(f"    操作人: {trail.operator}")
                if trail.before_value is not None:
                    lines.append(f"    变更前: {trail.before_value}")
                if trail.after_value is not None:
                    lines.append(f"    变更后: {trail.after_value}")
                if trail.reason:
                    lines.append(f"    原因: {trail.reason}")
        else:
            lines.append("  无操作记录")

        lines.append("\n" + "=" * 60)
        return "\n".join(lines)

    def to_dict(self) -> List[Dict[str, Any]]:
        return [t.to_dict() for t in self.audit_trails]
