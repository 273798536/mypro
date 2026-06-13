from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from .models import (
    WindTunnelSmokeAlert,
    ManualNote,
    AlertAttachment,
    ProcessingStatus,
    BlockReason,
)
from .engine import ProcessingEngine


class AlertProcessor:

    def __init__(self, engine: Optional[ProcessingEngine] = None):
        self.engine = engine or ProcessingEngine()

    def process_alert(
        self,
        alert: WindTunnelSmokeAlert,
    ) -> WindTunnelSmokeAlert:
        self.engine.process(alert)
        self._align_manual_notes(alert)
        self._retain_blocked_record(alert)
        return alert

    def process_batch(
        self,
        alerts: List[WindTunnelSmokeAlert],
    ) -> List[WindTunnelSmokeAlert]:
        return [self.process_alert(a) for a in alerts]

    def _align_manual_notes(self, alert: WindTunnelSmokeAlert) -> None:
        if not alert.manual_notes:
            return

        for note in alert.manual_notes:
            note.aligns_with_alert = None
            note.misalignment_reason = None

            if note.judgment is None:
                continue

            judgment = (note.judgment or "").strip()
            j_positive = any(
                k in judgment
                for k in ["报警", "预警", "异常", "超阈值", "超限", "是", "触发"]
            )
            j_negative = any(
                k in judgment
                for k in ["正常", "无异常", "未超限", "否", "不触发", "没问题"]
            )

            if alert.status in (ProcessingStatus.ALERT,):
                system_says_alert = True
            elif alert.status in (ProcessingStatus.NORMAL,):
                system_says_alert = False
            else:
                system_says_alert = None

            if system_says_alert is not None and (j_positive or j_negative):
                user_says_alert = j_positive and not j_negative
                aligns = system_says_alert == user_says_alert
                note.aligns_with_alert = aligns
                if not aligns:
                    if alert.status == ProcessingStatus.ALERT and j_negative:
                        note.misalignment_reason = (
                            f"系统判定触发预警(计算值{alert.formula_result})，"
                            f"但备注人工判断为【正常】。"
                            f"建议核实：1)阈值配置；2)人工判断依据；"
                            f"3)是否存在未登记的现场豁免。"
                        )
                    elif alert.status == ProcessingStatus.NORMAL and j_positive:
                        note.misalignment_reason = (
                            f"系统判定正常(计算值{alert.formula_result})，"
                            f"但备注人工判断为【报警】。"
                            f"建议核实：1)现场是否有传感器漂移未校准；"
                            f"2)人工判断是否参考了额外的现场情况；"
                            f"3)是否需要临时上调/下调阈值。"
                        )
            elif system_says_alert is None:
                note.misalignment_reason = (
                    "系统未得出明确结论(可能阻塞在公式/单位/阈值)，"
                    "无法与人工备注自动对齐，请先解除阻塞后重跑。"
                )

    def _retain_blocked_record(self, alert: WindTunnelSmokeAlert) -> None:
        if alert.status == ProcessingStatus.BLOCKED:
            return

    def attach_late_data(
        self,
        alert: WindTunnelSmokeAlert,
        attachment: AlertAttachment,
    ) -> WindTunnelSmokeAlert:
        attachment.is_late = True
        if not attachment.fields_affected:
            attachment.fields_affected = list(attachment.content.keys())
        for k, v in attachment.content.items():
            if k not in alert.raw_fields or alert.raw_fields[k] is None:
                alert.raw_fields[k] = v

        if not alert.next_step:
            alert.next_step = (
                "晚到附件已合并。下一步：使用重跑命令重新处理本条记录，"
                "并关注跳变检测结果，确认是否由晚到附件造成。"
            )

        if alert.block_reason == BlockReason.LATE_ATTACHMENT:
            alert.block_reason = None
            alert.block_detail = None

        alert.attachments.append(attachment)
        return alert

    def reprocess(
        self,
        alert: WindTunnelSmokeAlert,
        previous_snapshot: Optional[dict] = None,
    ) -> WindTunnelSmokeAlert:
        if previous_snapshot:
            alert.previous_result = previous_snapshot.get("formula_result")

        for att in alert.attachments:
            if att.is_late:
                alert.block_reason = None
                alert.block_detail = None
                self._clear_model_fields_for_attachment(alert, att)
                break

        self.engine.process(alert)

        for note in alert.manual_notes:
            note.aligns_with_alert = None
            note.misalignment_reason = None

        self._align_manual_notes(alert)
        return alert

    def _clear_model_fields_for_attachment(
        self, alert: WindTunnelSmokeAlert, attachment: AlertAttachment
    ) -> None:
        alias_to_std = {}
        for std, aliases in self.engine.field_aliases.items():
            for alias in aliases:
                alias_to_std[alias] = std
        std_fields_to_clear = set()
        for field_name in attachment.fields_affected:
            if field_name in alias_to_std:
                std_fields_to_clear.add(alias_to_std[field_name])
        if not std_fields_to_clear:
            std_fields_to_clear = {"threshold_high", "threshold_low", "formula", "threshold_unit"}
        for std in std_fields_to_clear:
            if hasattr(alert, std):
                setattr(alert, std, None)
