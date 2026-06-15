"""历史追踪模块 - 确保林姐的判断和运营主管的改动都保留在历史中"""
import uuid
from datetime import datetime
from typing import List, Dict, Any

from .models import (
    ProcessingContext, HistoryEntry, Actor, JudgmentCard,
    JudgmentStatus, NoteType
)


class HistoryTracker:
    """历史追踪器"""

    def finalize_history(self, context: ProcessingContext) -> ProcessingContext:
        """整理并完善历史记录"""
        self._add_judgment_card_history(context)
        self._add_summary_entry(context)
        self._ensure_linjie_judgments_preserved(context)
        self._ensure_operation_changes_preserved(context)

        context.history.sort(key=lambda x: x.timestamp)

        return context

    def _add_judgment_card_history(self, context: ProcessingContext):
        """为每个判断卡添加完整的变更历史记录"""
        for card in context.judgment_cards:
            if card.is_overridden:
                self._add_history_entry(
                    context,
                    actor=Actor.SYSTEM,
                    action="判断卡变更摘要",
                    details={
                        "判断卡ID": card.card_id,
                        "文件": card.filename,
                        "曲目ID": card.track_id,
                        "初始判断": card.initial_judgment.value,
                        "初始原因": card.initial_reason,
                        "最终判断": card.current_judgment.value,
                        "最终原因": card.current_reason,
                        "被覆盖": "是",
                        "覆盖人": card.overridden_by.value if card.overridden_by else "未知",
                        "覆盖时间": card.override_time.strftime("%Y-%m-%d %H:%M:%S") if card.override_time else "",
                        "覆盖原因": card.override_reason
                    },
                    target_filename=card.filename,
                    target_track_id=card.track_id
                )

    def _add_summary_entry(self, context: ProcessingContext):
        """添加总结条目"""
        total_cards = len(context.judgment_cards)
        overridden_count = sum(1 for c in context.judgment_cards if c.is_overridden)
        matched_count = sum(1 for c in context.judgment_cards if c.current_judgment == JudgmentStatus.MATCHED)
        mismatched_count = sum(1 for c in context.judgment_cards if c.current_judgment == JudgmentStatus.MISMATCHED)
        linjie_overrides = sum(1 for c in context.judgment_cards if c.overridden_by == Actor.LIN_JIE)
        operation_overrides = sum(1 for c in context.judgment_cards if c.overridden_by == Actor.OPERATION_MANAGER)

        pending_count = len(context.pending_confirmations)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="处理完成总结",
            details={
                "判断卡总数": total_cards,
                "已覆盖数": overridden_count,
                "林姐覆盖数": linjie_overrides,
                "运营主管覆盖数": operation_overrides,
                "最终匹配数": matched_count,
                "最终不匹配数": mismatched_count,
                "待人工确认数": pending_count
            }
        )

    def _ensure_linjie_judgments_preserved(self, context: ProcessingContext):
        """确保林姐的所有判断都明确记录在历史中，不会丢失"""
        linjie_cards = [c for c in context.judgment_cards if c.overridden_by == Actor.LIN_JIE]

        for card in linjie_cards:
            self._add_history_entry(
                context,
                actor=Actor.LIN_JIE,
                action="林姐判断记录（留存）",
                details={
                    "文件": card.filename,
                    "曲目ID": card.track_id,
                    "林姐判断": card.current_judgment.value,
                    "判断理由": card.current_reason,
                    "覆盖的原判断": card.initial_judgment.value,
                    "判断时间": card.judgment_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "说明": "此记录已留存，下一班同事可看到完整判断过程，不仅仅是最终结果"
                },
                target_filename=card.filename,
                target_track_id=card.track_id
            )

    def _ensure_operation_changes_preserved(self, context: ProcessingContext):
        """确保运营主管的临时改动都记录在历史中，不只是改当前页"""
        operation_cards = [c for c in context.judgment_cards if c.overridden_by == Actor.OPERATION_MANAGER]

        for card in operation_cards:
            self._add_history_entry(
                context,
                actor=Actor.OPERATION_MANAGER,
                action="运营主管临时改动（已入历史）",
                details={
                    "文件": card.filename,
                    "曲目ID": card.track_id,
                    "改动类型": "彩排前临时调整",
                    "原判断": card.initial_judgment.value,
                    "原原因": card.initial_reason,
                    "新判断": card.current_judgment.value,
                    "新原因": card.current_reason,
                    "改动时间": card.override_time.strftime("%Y-%m-%d %H:%M:%S") if card.override_time else "",
                    "说明": "此改动已记入完整历史，可追溯变更过程，而非仅修改当前结果"
                },
                target_filename=card.filename,
                target_track_id=card.track_id
            )

    def _add_history_entry(self, context: ProcessingContext, actor: Actor, action: str,
                           details: dict, target_filename: str = None,
                           target_track_id: str = None):
        """添加历史记录"""
        entry = HistoryEntry(
            entry_id=f"HIST_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(),
            actor=actor,
            action=action,
            details=details,
            target_filename=target_filename,
            target_track_id=target_track_id
        )
        context.history.append(entry)
