from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from .models import (
    WindTunnelSmokeAlert,
    HistoryChange,
    ProcessingStatus,
)


class ChangeAuditor:

    def __init__(self, default_operator: str = "系统"):
        self.default_operator = default_operator

    def record_change(
        self,
        alert: WindTunnelSmokeAlert,
        field_name: str,
        new_value: Any,
        operator: Optional[str] = None,
        reason: str = "",
        is_temporary: bool = False,
    ) -> WindTunnelSmokeAlert:
        old_value = getattr(alert, field_name, None)
        if old_value == new_value:
            return alert

        change = HistoryChange(
            field_name=field_name,
            old_value=self._serialize(old_value),
            new_value=self._serialize(new_value),
            operator=operator or self.default_operator,
            reason=reason,
            is_temporary=is_temporary,
            timestamp=datetime.now().isoformat(),
        )
        alert.history.append(change)
        setattr(alert, field_name, new_value)
        return alert

    def record_manual_override(
        self,
        alert: WindTunnelSmokeAlert,
        field_name: str,
        new_value: Any,
        operator: str,
        reason: str,
        is_temporary: bool = True,
    ) -> WindTunnelSmokeAlert:
        old_status = alert.status
        alert = self.record_change(
            alert, field_name, new_value, operator, reason, is_temporary
        )
        if old_status != alert.status:
            self.record_change(
                alert,
                "status",
                ProcessingStatus.MANUAL_OVERRIDDEN.value,
                operator,
                f"人工介入修改 {field_name}，状态标记为人工覆盖",
                is_temporary,
            )
            alert.status = ProcessingStatus.MANUAL_OVERRIDDEN
        return alert

    def summarize_history(self, alert: WindTunnelSmokeAlert) -> str:
        if not alert.history:
            return "无变更历史"

        lines = []
        for idx, hc in enumerate(alert.history, 1):
            temp_tag = "【临时】" if hc.is_temporary else ""
            lines.append(
                f"{idx}. [{hc.timestamp}] {temp_tag}{hc.operator} 将 "
                f"{hc.field_name}: {hc.old_value} -> {hc.new_value}"
                f"（原因: {hc.reason or '未说明'}）"
            )
        return "\n".join(lines)

    def get_temporary_changes(self, alert: WindTunnelSmokeAlert):
        return [hc for hc in alert.history if hc.is_temporary]

    def _serialize(self, value: Any) -> Any:
        if isinstance(value, ProcessingStatus):
            return value.value
        try:
            return value
        except Exception:
            return str(value)
