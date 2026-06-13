from __future__ import annotations

from typing import Optional, List, Tuple, Any

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
        current: WindTunnelSmokeAlert,
        previous: Optional[WindTunnelSmokeAlert],
        history_changes: Optional[List[HistoryChange]] = None,
    ) -> Tuple[bool, Optional[JumpCause], Optional[str]]:
        if previous is None and current.previous_result is None and not history_changes:
            current.jump_detected = False
            return False, None, None

        prev_val = None
        if previous is not None and previous.formula_result is not None:
            prev_val = previous.formula_result
        if current.previous_result is not None:
            prev_val = current.previous_result

        curr_val = current.formula_result

        threshold_changed = False
        unit_changed = False
        late_att = False
        if current.attachments:
            late_att = any(a.is_late for a in current.attachments)

        if history_changes:
            for hc in history_changes:
                fn = (hc.field_name or "").lower()
                if "threshold" in fn or "阈值" in fn:
                    if hc.old_value != hc.new_value and (hc.old_value is not None or hc.new_value is not None):
                        threshold_changed = True
                if "unit" in fn or "单位" in fn:
                    if hc.old_value != hc.new_value:
                        unit_changed = True

        jumped = False
        if prev_val is not None and curr_val is not None:
            jumped = self._is_jump(prev_val, curr_val)

        if not jumped:
            if late_att or threshold_changed or unit_changed:
                if prev_val is not None and curr_val is not None and prev_val != curr_val:
                    jumped = True

        if not jumped:
            current.jump_detected = False
            return False, None, None

        cause, detail = self._attribute(
            current, previous, history_changes or [], prev_val, curr_val
        )

        current.jump_detected = True
        current.jump_cause = cause
        current.jump_detail = detail

        if current.next_step is None:
            current.next_step = (
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
        current: WindTunnelSmokeAlert,
        previous: Optional[WindTunnelSmokeAlert],
        history_changes: List[HistoryChange],
        prev_val: float,
        curr_val: float,
    ) -> Tuple[JumpCause, str]:
        if current.attachments:
            late_atts = [a for a in current.attachments if a.is_late]
            if late_atts:
                att_names = [a.name or a.id for a in late_atts]
                fields = set()
                for a in late_atts:
                    fields.update(a.fields_affected)
                return (
                    JumpCause.LATE_ATTACHMENT_ARRIVED,
                    (
                        f"晚到附件 {att_names} 到达，"
                        f"影响字段 {list(fields)}，"
                        f"计算结果由 {prev_val} 跳变至 {curr_val}。"
                        f"建议：将附件到达时间与时间窗口对齐，"
                        f"避免后续记录出现同类跳变。"
                    ),
                )

        threshold_fields = {"threshold_high", "threshold_low", "阈值上限", "阈值下限"}
        for hc in history_changes:
            if hc.field_name in threshold_fields:
                return (
                    JumpCause.THRESHOLD_CHANGED,
                    (
                        f"字段 '{hc.field_name}' 由 {hc.old_value} 改为 {hc.new_value}"
                        f"(操作人: {hc.operator or '未知'}，原因: {hc.reason or '未说明'})。"
                        f"建议：若为临时调整，需在交接班记录中注明恢复时间。"
                    ),
                )

        if previous is not None:
            unit_changes = []
            for fld in ["smoke_density_unit", "wind_speed_unit", "threshold_unit"]:
                old_u = getattr(previous, fld, None)
                new_u = getattr(current, fld, None)
                if old_u != new_u and (old_u or new_u):
                    unit_changes.append((fld, old_u, new_u))
            if unit_changes:
                change_txt = "；".join(
                    f"{f}: {o} -> {n}" for f, o, n in unit_changes
                )
                return (
                    JumpCause.UNIT_CHANGED,
                    (
                        f"单位发生变更({change_txt})，"
                        f"可能导致 {prev_val} -> {curr_val} 的数值跳变。"
                        f"建议：核对本次是否真的更换了测量单位，"
                        f"或验证换算系数是否正确。"
                    ),
                )

        for hc in history_changes:
            if "unit" in hc.field_name.lower() or "单位" in hc.field_name:
                return (
                    JumpCause.UNIT_CHANGED,
                    (
                        f"历史变更显示单位调整: "
                        f"{hc.field_name} {hc.old_value} -> {hc.new_value}"
                        f"(操作人: {hc.operator or '未知'})。"
                        f"建议：确认单位换算是否已在公式中体现。"
                    ),
                )

        return (
            JumpCause.THRESHOLD_CHANGED,
            (
                f"未找到明确变更字段，但结果由 {prev_val} 跳变至 {curr_val}。"
                f"建议：核对本批次阈值、单位、附件是否存在未记录的改动。"
            ),
        )
