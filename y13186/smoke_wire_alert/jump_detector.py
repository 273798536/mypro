from __future__ import annotations

from typing import Optional, List, Tuple

from .models import (
    WindTunnelSmokeAlert,
    JumpCause,
    HistoryChange,
)


class JumpDetector:

    JUMP_RATIO_THRESHOLD = 0.15
    JUMP_ABS_DIFF = 2.0

    def detect(
        self,
        alert: WindTunnelSmokeAlert,
        history_changes: Optional[List[HistoryChange]] = None,
    ) -> Tuple[bool, Optional[JumpCause], Optional[str]]:
        history_changes = history_changes or alert.history
        prev_val = alert.previous_result
        curr_val = alert.formula_result

        has_late_attachment = any(a.is_late for a in alert.attachments)
        has_threshold_change = False
        has_unit_change = False
        for hc in history_changes:
            fn = (hc.field_name or "").lower()
            if "threshold" in fn or "阈值" in fn:
                if hc.old_value != hc.new_value and (
                    hc.old_value is not None or hc.new_value is not None
                ):
                    has_threshold_change = True
            if "unit" in fn or "单位" in fn:
                if hc.old_value != hc.new_value:
                    has_unit_change = True

        has_trigger = has_late_attachment or has_threshold_change or has_unit_change
        if not has_trigger and prev_val is None:
            alert.jump_detected = False
            alert.jump_cause = None
            alert.jump_detail = None
            return False, None, None

        jumped = False
        if prev_val is not None and curr_val is not None and prev_val != curr_val:
            jumped = self._is_jump(prev_val, curr_val)

        if not jumped and has_trigger:
            if prev_val is not None and curr_val is not None and prev_val != curr_val:
                jumped = True

        if not jumped:
            alert.jump_detected = False
            alert.jump_cause = None
            alert.jump_detail = None
            return False, None, None

        cause, detail = self._attribute(
            alert, history_changes, prev_val, curr_val,
            has_late_attachment, has_threshold_change, has_unit_change,
        )

        alert.jump_detected = True
        alert.jump_cause = cause
        alert.jump_detail = detail

        if alert.next_step is None or "跳变" not in (alert.next_step or ""):
            alert.next_step = (
                f"检测到结果跳变({prev_val} -> {curr_val})。"
                f"原因：{cause.value if cause else '未知'}，{detail}"
            )

        return True, cause, detail

    def _is_jump(self, prev: float, curr: float) -> bool:
        if prev == 0:
            return abs(curr) > self.JUMP_ABS_DIFF
        ratio = abs(curr - prev) / abs(prev)
        abs_diff = abs(curr - prev)
        return ratio >= self.JUMP_RATIO_THRESHOLD and abs_diff >= self.JUMP_ABS_DIFF / 10

    def _attribute(
        self,
        alert: WindTunnelSmokeAlert,
        history_changes: List[HistoryChange],
        prev_val: Optional[float],
        curr_val: Optional[float],
        has_late: bool,
        has_th: bool,
        has_unit: bool,
    ) -> Tuple[JumpCause, str]:
        if has_late:
            late_atts = [a for a in alert.attachments if a.is_late]
            att_names = [a.name or a.id for a in late_atts]
            fields = set()
            for a in late_atts:
                fields.update(a.fields_affected)
            return (
                JumpCause.LATE_ATTACHMENT_ARRIVED,
                (
                    f"晚到附件 {att_names} 到达，"
                    f"影响字段 {sorted(fields)}，"
                    f"计算结果由 {prev_val} 跳变至 {curr_val}。"
                    f"建议：将附件到达时间与时间窗口对齐，"
                    f"避免后续记录出现同类跳变。"
                ),
            )

        if has_th:
            th_changes = [
                hc for hc in history_changes
                if "threshold" in (hc.field_name or "").lower()
                or "阈值" in (hc.field_name or "")
            ]
            if th_changes:
                hc = th_changes[-1]
                return (
                    JumpCause.THRESHOLD_CHANGED,
                    (
                        f"字段 '{hc.field_name}' 由 {hc.old_value} 改为 {hc.new_value}"
                        f"（操作人: {hc.operator or '未知'}，原因: {hc.reason or '未说明'}）。"
                        f"建议：若为临时调整，需在交接班记录中注明恢复时间。"
                    ),
                )

        if has_unit:
            unit_changes = [
                hc for hc in history_changes
                if "unit" in (hc.field_name or "").lower()
                or "单位" in (hc.field_name or "")
            ]
            if unit_changes:
                hc = unit_changes[-1]
                return (
                    JumpCause.UNIT_CHANGED,
                    (
                        f"历史变更显示单位调整: "
                        f"{hc.field_name} {hc.old_value} -> {hc.new_value}"
                        f"（操作人: {hc.operator or '未知'}）。"
                        f"建议：确认单位换算是否已在公式中体现。"
                    ),
                )

        return (
            JumpCause.THRESHOLD_CHANGED,
            (
                f"检测到数值跳变({prev_val} -> {curr_val})，"
                f"但未在历史变更中找到明确原因。"
                f"建议：核对本批次阈值、单位、附件是否存在未记录的改动。"
            ),
        )
