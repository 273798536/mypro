"""备注处理器 - 应用后补备注、口头备注、运营备注到判断卡"""
import uuid
from datetime import datetime
from typing import List

from .models import (
    ProcessingContext, JudgmentCard, JudgmentStatus, Actor,
    HistoryEntry, Note, NoteType, MatchResult
)


class NoteProcessor:
    """备注处理器"""

    def process(self, context: ProcessingContext) -> ProcessingContext:
        """应用所有备注"""
        for note in context.notes:
            self._apply_note(context, note)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="备注应用完成",
            details={
                "已应用备注数": len(context.notes),
                "林姐备注数": sum(1 for n in context.notes if n.actor == Actor.LIN_JIE),
                "运营主管备注数": sum(1 for n in context.notes if n.actor == Actor.OPERATION_MANAGER)
            }
        )

        return context

    def _apply_note(self, context: ProcessingContext, note: Note):
        """应用单条备注

        匹配优先级：
        1. 如果指定了 target_filename → 只按 filename 精确匹配（最精确，不扩散）
        2. 只有未指定 target_filename 时，才按 target_track_id 匹配（扩散到该曲目所有文件）
        3. 如果 filename 存在但匹配不到任何文件 → 记录告警，不 fallback 到 track_id
        """
        target_filename = note.target_filename
        target_track_id = note.target_track_id

        if not target_filename and not target_track_id:
            return

        matched_by = None
        cards_to_update = []

        if target_filename:
            matched_by = "filename"
            for card in context.judgment_cards:
                if card.filename == target_filename:
                    cards_to_update.append(card)

            if not cards_to_update:
                self._add_history_entry(
                    context,
                    actor=Actor.SYSTEM,
                    action="备注匹配告警",
                    details={
                        "告警信息": "备注指定了文件名但未匹配到任何判断卡，已跳过，未按曲目ID扩散",
                        "指定的filename": target_filename,
                        "指定的track_id": target_track_id or "(未指定)",
                        "备注内容": note.content,
                        "备注类型": note.note_type.value,
                        "建议": "请检查文件名是否正确，或移除filename字段让备注按曲目ID生效"
                    },
                    target_filename=target_filename,
                    target_track_id=target_track_id
                )
                return
        else:
            matched_by = "track_id"
            for card in context.judgment_cards:
                if card.track_id == target_track_id:
                    cards_to_update.append(card)

        match_results_to_update = []
        if matched_by == "filename":
            for result in context.match_results:
                if result.filename == target_filename:
                    match_results_to_update.append(result)
        else:
            for result in context.match_results:
                if result.track_id == target_track_id:
                    match_results_to_update.append(result)

        for card in cards_to_update:
            self._update_card_with_note(context, card, note)

        for result in match_results_to_update:
            self._update_match_result_with_note(context, result, note)

        self._add_history_entry(
            context,
            actor=note.actor,
            action=f"应用{note.note_type.value}",
            details={
                "备注内容": note.content,
                "匹配方式": f"按{matched_by}匹配",
                "影响文件数": len(cards_to_update),
                "影响判断卡": [c.filename for c in cards_to_update]
            },
            target_filename=target_filename,
            target_track_id=target_track_id
        )

    def _update_card_with_note(self, context: ProcessingContext, card: JudgmentCard, note: Note):
        """用备注更新判断卡"""
        old_judgment = card.current_judgment
        old_reason = card.current_reason

        new_judgment, new_reason = self._determine_new_judgment(card, note)

        should_override = (
            new_judgment != old_judgment
            or note.actor == Actor.OPERATION_MANAGER
            or any(keyword in note.content for keyword in ["临时", "调整", "改动", "改为", "确认"])
        )

        if should_override:
            card.is_overridden = True
            card.overridden_by = note.actor
            card.override_time = note.timestamp
            card.override_reason = note.content
            card.current_judgment = new_judgment
            if new_judgment != old_judgment:
                card.current_reason = f"{note.actor.value}覆盖原判断: {new_reason}"
            else:
                card.current_reason = f"{note.actor.value}补充/调整: {note.content} | 原判断: {old_reason}"
            card.judgment_time = note.timestamp
            card.actor = note.actor

            if card in context.pending_confirmations:
                context.pending_confirmations.remove(card)

            self._add_history_entry(
                context,
                actor=note.actor,
                action=f"判断卡被{note.note_type.value}覆盖",
                details={
                    "原判断": old_judgment.value,
                    "原原因": old_reason,
                    "新判断": new_judgment.value,
                    "新原因": card.current_reason,
                    "备注内容": note.content,
                    "改动类型": "判断变更" if new_judgment != old_judgment else "补充/调整"
                },
                target_filename=card.filename,
                target_track_id=card.track_id
            )
        else:
            card.current_reason += f" | {note.actor.value}备注确认: {note.content}"

            self._add_history_entry(
                context,
                actor=note.actor,
                action=f"{note.note_type.value}确认判断",
                details={
                    "当前判断": new_judgment.value,
                    "备注内容": note.content
                },
                target_filename=card.filename,
                target_track_id=card.track_id
            )

    def _update_match_result_with_note(self, context: ProcessingContext, result: MatchResult, note: Note):
        """用备注更新匹配结果"""
        if note.actor == Actor.LIN_JIE:
            if "可以用" in note.content or "确实是" in note.content:
                result.status = JudgmentStatus.MATCHED
                result.mismatch_reason = None
                result.mismatch_details = f"林姐口头确认: {note.content}"
            elif "不参与" in note.content or "归档用" in note.content:
                result.status = JudgmentStatus.MISMATCHED
                result.mismatch_details = f"林姐判断: {note.content}"

        elif note.actor == Actor.OPERATION_MANAGER:
            if "调整" in note.content or "改为" in note.content:
                result.mismatch_details = f"运营主管调整: {note.content} | 原状态: {result.status.value}"

    def _determine_new_judgment(self, card: JudgmentCard, note: Note) -> tuple:
        """根据备注内容确定新判断"""
        content = note.content

        if note.actor == Actor.LIN_JIE:
            if any(keyword in content for keyword in ["可以用", "确实是", "已确认", "不影响"]):
                return JudgmentStatus.MATCHED, f"林姐确认匹配 - {content}"
            elif any(keyword in content for keyword in ["不参与", "归档用", "排除"]):
                return JudgmentStatus.MISMATCHED, f"林姐判断排除 - {content}"

        if note.actor == Actor.OPERATION_MANAGER:
            if any(keyword in content for keyword in ["调整", "已确认", "改为"]):
                return JudgmentStatus.MATCHED, f"运营主管调整确认 - {content}"

        return card.current_judgment, card.current_reason

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
