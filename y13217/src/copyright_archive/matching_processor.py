"""匹配处理链 - 文件名与曲目表匹配、不匹配原因分析"""
import uuid
from datetime import datetime
from typing import Optional, List
from difflib import SequenceMatcher

from .models import (
    ProcessingContext, MatchResult, JudgmentStatus, MismatchReason,
    JudgmentCard, Actor, HistoryEntry, NoteType
)


class MatchingProcessor:
    """匹配处理器"""

    def process(self, context: ProcessingContext) -> ProcessingContext:
        """执行完整匹配流程"""
        self._initial_match(context)
        self._analyze_mismatches(context)
        self._create_judgment_cards(context)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="初步匹配完成",
            details={
                "已匹配数": sum(1 for m in context.match_results if m.status == JudgmentStatus.MATCHED),
                "不匹配数": sum(1 for m in context.match_results if m.status == JudgmentStatus.MISMATCHED),
                "待确认数": sum(1 for m in context.match_results if m.status == JudgmentStatus.PENDING)
            }
        )

        return context

    def _initial_match(self, context: ProcessingContext):
        """初步匹配"""
        active_repertoire = [r for r in context.repertoire if r.is_active]

        for cf in context.copyright_files:
            best_match = None
            best_score = 0.0

            for rep in active_repertoire:
                score = self._calculate_match_score(cf, rep)
                if score > best_score:
                    best_score = score
                    best_match = rep

            if best_score >= 0.8:
                status = JudgmentStatus.MATCHED
                reason = None
                details = ""
            elif best_score >= 0.5:
                status = JudgmentStatus.PENDING
                reason = MismatchReason.UNKNOWN
                details = f"匹配度{best_score:.2f}，介于阈值之间，需要人工确认"
            else:
                status = JudgmentStatus.MISMATCHED
                reason = MismatchReason.UNKNOWN
                details = f"匹配度{best_score:.2f}，低于阈值"

            result = MatchResult(
                filename=cf.filename,
                track_id=best_match.track_id if best_match else None,
                status=status,
                mismatch_reason=reason,
                mismatch_details=details,
                match_score=best_score,
                matched_track_name=best_match.track_name if best_match else None,
                matched_artist=best_match.artist if best_match else None,
                matched_version=best_match.version if best_match else None
            )
            context.match_results.append(result)

    def _calculate_match_score(self, cf, rep) -> float:
        """计算匹配分数"""
        scores = []
        weights = []

        if cf.track_id_from_file and rep.track_id:
            id_match = 1.0 if cf.track_id_from_file == rep.track_id else 0.0
            scores.append(id_match)
            weights.append(0.4)

        name_sim = SequenceMatcher(None, cf.track_name_from_file, rep.track_name).ratio()
        scores.append(name_sim)
        weights.append(0.35)

        artist_sim = SequenceMatcher(None, cf.artist_from_file, rep.artist).ratio()
        scores.append(artist_sim)
        weights.append(0.25)

        total_score = sum(s * w for s, w in zip(scores, weights)) / sum(weights)
        return total_score

    def _analyze_mismatches(self, context: ProcessingContext):
        """分析不匹配原因"""
        for result in context.match_results:
            if result.status == JudgmentStatus.MATCHED:
                continue

            cf = next((f for f in context.copyright_files if f.filename == result.filename), None)
            rep = next((r for r in context.repertoire if r.track_id == result.track_id), None)

            if not cf or not rep:
                continue

            reasons = []

            if cf.track_name_from_file and rep.track_name:
                name_sim = SequenceMatcher(None, cf.track_name_from_file, rep.track_name).ratio()
                if name_sim < 0.9 and name_sim >= 0.5:
                    reasons.append((MismatchReason.NAME_DIFFERENCE,
                                    f"文件名:'{cf.track_name_from_file}' vs 曲目表:'{rep.track_name}'"))
                elif name_sim < 0.5:
                    reasons.append((MismatchReason.NAME_DIFFERENCE,
                                    f"曲目名称差异较大: '{cf.track_name_from_file}' vs '{rep.track_name}'"))

            if cf.artist_from_file and rep.artist:
                artist_sim = SequenceMatcher(None, cf.artist_from_file, rep.artist).ratio()
                if artist_sim < 0.9 and artist_sim >= 0.5:
                    reasons.append((MismatchReason.ARTIST_DIFFERENCE,
                                    f"文件名:'{cf.artist_from_file}' vs 曲目表:'{rep.artist}'"))

            if cf.version_from_file != rep.version:
                if cf.version_from_file == "旧版" and rep.version == "正式版":
                    reasons.append((MismatchReason.VERSION_DIFFERENCE,
                                    f"文件是{cf.version_from_file}，曲目表是{rep.version}"))

            if not cf.track_id_from_file:
                reasons.append((MismatchReason.MISSING_ID, "文件名中缺少曲目ID"))

            if "彩排" in cf.filename or "Demo" in cf.filename:
                reasons.append((MismatchReason.EXTRA_SUFFIX,
                                f"文件名有额外后缀: {cf.version_from_file}"))

            if reasons:
                result.mismatch_reason = reasons[0][0]
                result.mismatch_details = "; ".join(r[1] for r in reasons)

    def _create_judgment_cards(self, context: ProcessingContext):
        """创建初始判断卡 - 为所有文件创建，确保备注能正确应用"""
        for result in context.match_results:
            reason_text = f"系统判断: {result.status.value}"
            if result.mismatch_reason:
                reason_text += f"，原因: {result.mismatch_reason.value}"
            if result.mismatch_details:
                reason_text += f"，详情: {result.mismatch_details}"

            card = JudgmentCard(
                card_id=f"CARD_{uuid.uuid4().hex[:12]}",
                filename=result.filename,
                track_id=result.track_id or "",
                initial_judgment=result.status,
                initial_reason=reason_text,
                current_judgment=result.status,
                current_reason=reason_text,
                actor=Actor.SYSTEM,
                judgment_time=datetime.now(),
                needs_manual_confirm=result.status in [JudgmentStatus.MISMATCHED, JudgmentStatus.PENDING]
            )

            if result.status == JudgmentStatus.MISMATCHED:
                card.confirm_reason = "系统判定不匹配，需要人工复核是否确实不匹配"
            elif result.status == JudgmentStatus.PENDING:
                card.confirm_reason = "匹配度介于阈值之间，需要人工确认是否匹配"
            elif result.status == JudgmentStatus.MATCHED:
                card.confirm_reason = "系统判定匹配，如有备注可覆盖此判断"

            context.judgment_cards.append(card)
            if card.needs_manual_confirm:
                context.pending_confirmations.append(card)

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
