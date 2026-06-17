"""历史追踪：人工确认前后变化进入历史，可按样本/版本复盘。"""

from __future__ import annotations

from typing import Dict, List

from ..models import (
    CorrectionStatus,
    DecisionChange,
    EvaluationHistory,
    EvaluationRecord,
    ManualCorrection,
)


class HistoryTracker:
    """评测历史追踪器。"""

    def __init__(self, history: EvaluationHistory | None = None) -> None:
        self.history = history or EvaluationHistory()

    def record_evaluation(self, record: EvaluationRecord) -> None:
        self.history.add(record)

    def record_correction(
        self, correction: ManualCorrection, source_record_id: str | None = None
    ) -> DecisionChange | None:
        """将一条人工修正记录转化为决策变化，写入相关评测历史。"""
        if correction.status != CorrectionStatus.CONFIRMED or not correction.is_changed:
            return None
        change = DecisionChange(
            sample_id=correction.sample_id,
            before_decision=correction.original_decision,
            before_score=correction.original_score,
            after_decision=correction.corrected_decision,
            after_score=correction.corrected_score,
            change_type="manual",
            reason=correction.reason or f"人工确认 by {correction.operator}",
        )
        if source_record_id:
            for r in self.history.records:
                if r.record_id == source_record_id:
                    r.decision_changes.append(change)
                    r.metrics["manual_correction_count"] = (
                        r.metrics.get("manual_correction_count", 0) + 1
                    )
                    break
        return change

    def sample_story(self, sample_id: str) -> List[Dict]:
        """复盘单个样本的决策演化过程。"""
        story: List[Dict] = []
        changes = self.history.changes_for_sample(sample_id)
        changes.sort(key=lambda c: (
            next(
                (
                    r.created_at
                    for r in self.history.records
                    if c in r.decision_changes
                ),
                None,
            ),
        ))
        for idx, c in enumerate(changes):
            story.append(
                {
                    "step": idx + 1,
                    "change_type": c.change_type,
                    "from": f"{c.before_decision or 'N/A'} ({c.before_score})",
                    "to": f"{c.after_decision or 'N/A'} ({c.after_score})",
                    "reason": c.reason,
                }
            )
        return story

    def review_summary(self) -> Dict[str, int]:
        """给算法值班人用的评审复盘摘要。"""
        total_changes = sum(len(r.decision_changes) for r in self.history.records)
        by_type: Dict[str, int] = {}
        for r in self.history.records:
            for c in r.decision_changes:
                by_type[c.change_type] = by_type.get(c.change_type, 0) + 1
        return {
            "records": len(self.history.records),
            "total_changes": total_changes,
            "by_type": by_type,
        }
