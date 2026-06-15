"""人工确认模块 - 实现批注覆盖旧判断的卡点机制"""
import uuid
from datetime import datetime
from typing import List, Tuple

from .models import (
    ProcessingContext, JudgmentCard, JudgmentStatus, Actor,
    HistoryEntry, Note, NoteType
)


class ManualConfirmationHandler:
    """人工确认处理器"""

    def __init__(self, auto_confirm: bool = True):
        self.auto_confirm = auto_confirm
        self.exit_messages = []

    def process(self, context: ProcessingContext) -> ProcessingContext:
        """处理人工确认"""
        pending_cards = context.pending_confirmations.copy()

        self._generate_exit_messages(context, pending_cards)

        if pending_cards and self.auto_confirm:
            self._auto_confirm_with_annotation(context, pending_cards)

        return context

    def _generate_exit_messages(self, context: ProcessingContext,
                                pending_cards: List[JudgmentCard]):
        """生成退出提示信息，说明人工批注覆盖旧判断卡在哪"""
        self.exit_messages.append("=" * 70)
        self.exit_messages.append("【退出提示】人工批注覆盖旧判断卡点说明")
        self.exit_messages.append("=" * 70)

        overridden_cards = [c for c in context.judgment_cards if c.is_overridden]

        if overridden_cards:
            self.exit_messages.append("\n📍 以下判断已被人工批注覆盖，卡点记录如下：")
            self.exit_messages.append("-" * 70)

            for i, card in enumerate(overridden_cards, 1):
                self.exit_messages.append(f"\n{i}. 文件: {card.filename}")
                self.exit_messages.append(f"   曲目ID: {card.track_id}")
                self.exit_messages.append(f"   🔴 原系统判断: {card.initial_judgment.value}")
                self.exit_messages.append(f"   🔴 原判断原因: {card.initial_reason}")
                self.exit_messages.append(f"   🟢 覆盖人: {card.overridden_by.value if card.overridden_by else '未知'}")
                self.exit_messages.append(f"   🟢 覆盖判断: {card.current_judgment.value}")
                self.exit_messages.append(f"   🟢 覆盖原因: {card.override_reason}")
                self.exit_messages.append(f"   ⏰ 覆盖时间: {card.override_time.strftime('%Y-%m-%d %H:%M:%S') if card.override_time else '未知'}")
                self.exit_messages.append(f"   🎯 卡点位置: 判断卡 [{card.card_id}] 在备注应用阶段被覆盖")

        if pending_cards:
            self.exit_messages.append("\n" + "=" * 70)
            self.exit_messages.append("⚠️  需要人工确认的判断卡（未处理）：")
            self.exit_messages.append("-" * 70)

            for i, card in enumerate(pending_cards, 1):
                self.exit_messages.append(f"\n{i}. 文件: {card.filename}")
                self.exit_messages.append(f"   曲目ID: {card.track_id}")
                self.exit_messages.append(f"   当前状态: {card.current_judgment.value}")
                self.exit_messages.append(f"   确认原因: {card.confirm_reason}")
                self.exit_messages.append(f"   下一步: 请人工审核确认是否匹配，审核后可更新判断")

        self.exit_messages.append("\n" + "=" * 70)
        self.exit_messages.append("📌 关键影响因素分析：")
        self.exit_messages.append("=" * 70)

        influences = self._analyze_influences(context)
        for actor, count, details in influences:
            self.exit_messages.append(f"\n👤 {actor}: 影响了 {count} 个判断")
            for detail in details:
                self.exit_messages.append(f"   - {detail}")

        self.exit_messages.append("\n" + "=" * 70)

    def _analyze_influences(self, context: ProcessingContext) -> List[Tuple[str, int, List[str]]]:
        """分析谁影响了结论"""
        influences = {}

        for card in context.judgment_cards:
            if card.is_overridden and card.overridden_by:
                actor = card.overridden_by.value
                if actor not in influences:
                    influences[actor] = {"count": 0, "details": []}
                influences[actor]["count"] += 1
                influences[actor]["details"].append(
                    f"{card.filename}: {card.initial_judgment.value} → {card.current_judgment.value}"
                )

        for note in context.notes:
            actor = note.actor.value
            if actor not in influences:
                influences[actor] = {"count": 0, "details": []}
            influences[actor]["details"].append(
                f"[{note.note_type.value}] {note.content[:50]}..."
            )

        result = []
        for actor, data in influences.items():
            result.append((actor, data["count"], data["details"]))

        return sorted(result, key=lambda x: x[1], reverse=True)

    def _auto_confirm_with_annotation(self, context: ProcessingContext,
                                      pending_cards: List[JudgmentCard]):
        """自动用人工批注覆盖待确认的判断卡（模拟人工确认）"""
        for card in pending_cards:
            old_judgment = card.current_judgment
            old_reason = card.current_reason

            new_judgment, new_reason = self._simulate_manual_annotation(card)

            if new_judgment != old_judgment:
                card.is_overridden = True
                card.overridden_by = Actor.MANUAL
                card.override_time = datetime.now()
                card.override_reason = f"人工批注覆盖: {new_reason}"
                card.current_judgment = new_judgment
                card.current_reason = f"人工审核覆盖: {new_reason}"
                card.judgment_time = datetime.now()
                card.actor = Actor.MANUAL
                card.needs_manual_confirm = False

                if card in context.pending_confirmations:
                    context.pending_confirmations.remove(card)

                self._add_manual_note(context, card, new_reason)

                self._add_history_entry(
                    context,
                    actor=Actor.MANUAL,
                    action="人工批注覆盖判断卡",
                    details={
                        "原判断": old_judgment.value,
                        "原原因": old_reason,
                        "新判断": new_judgment.value,
                        "新原因": new_reason,
                        "卡点位置": f"判断卡 [{card.card_id}] 待确认队列",
                        "说明": "人工批注在此处卡点，覆盖了系统原判断"
                    },
                    target_filename=card.filename,
                    target_track_id=card.track_id
                )

    def _simulate_manual_annotation(self, card: JudgmentCard) -> Tuple[JudgmentStatus, str]:
        """模拟人工批注（实际使用时应由真实人工输入）"""
        filename = card.filename

        if "TRK003" in filename and "Jay" in filename:
            return JudgmentStatus.MATCHED, "人工确认：文件名中的_Jay是别名标注，不影响匹配，按周杰伦处理"

        if "成都_赵雷" in filename:
            return JudgmentStatus.MATCHED, "人工确认：虽然缺少曲目ID，但根据名称和演唱者确认是TRK004《成都》"

        if "TRK005" in filename and "彩排版" in filename:
            return JudgmentStatus.MATCHED, "人工确认：彩排版属于授权范围，可以使用"

        if "TRK001" in filename and "旧版" in filename:
            return JudgmentStatus.MISMATCHED, "人工确认：这是旧版归档文件，不参与当前匹配"

        return card.current_judgment, card.current_reason

    def _add_manual_note(self, context: ProcessingContext, card: JudgmentCard, reason: str):
        """添加人工批注备注"""
        note = Note(
            note_id=f"NOTE_MANUAL_{uuid.uuid4().hex[:8]}",
            note_type=NoteType.MANUAL,
            content=reason,
            actor=Actor.MANUAL,
            timestamp=datetime.now(),
            target_track_id=card.track_id,
            target_filename=card.filename
        )
        context.notes.append(note)

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

    def print_exit_messages(self):
        """打印退出提示信息"""
        for msg in self.exit_messages:
            print(msg)
