"""结果拆解：将灰度变化拆分为样本变化、阈值变化、人工改判三部分。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from ..models import DecisionChange, ManualCorrection, SampleSet
from .compare_engine import GrayCompareEngine, GrayCompareResult, SampleDecision


@dataclass
class ChangeGroup:
    """一组变化。"""

    changes: List[DecisionChange] = field(default_factory=list)
    summary: Dict[str, int] = field(default_factory=dict)

    @property
    def count(self) -> int:
        return len(self.changes)


@dataclass
class DecomposedResult:
    """拆解后的灰度对比结果。"""

    sample_change: ChangeGroup = field(default_factory=ChangeGroup)
    threshold_change: ChangeGroup = field(default_factory=ChangeGroup)
    manual_change: ChangeGroup = field(default_factory=ChangeGroup)

    def summary(self) -> Dict[str, int]:
        return {
            "sample_change": self.sample_change.count,
            "threshold_change": self.threshold_change.count,
            "manual_change": self.manual_change.count,
        }


class ResultDecomposer:
    """将灰度对比结果拆分为样本变化 / 阈值变化 / 人工改判。"""

    def __init__(self, engine: GrayCompareEngine) -> None:
        self.engine = engine

    def decompose(
        self,
        baseline_samples: SampleSet,
        candidate_samples: SampleSet,
        result: GrayCompareResult,
        corrections: List[ManualCorrection],
    ) -> DecomposedResult:
        decomposed = DecomposedResult()

        decomposed.sample_change.changes = self._sample_changes(
            baseline_samples, candidate_samples, result
        )
        decomposed.sample_change.summary = self._summarize(decomposed.sample_change.changes)

        decomposed.threshold_change.changes = self._threshold_changes(
            baseline_samples, candidate_samples, result
        )
        decomposed.threshold_change.summary = self._summarize(decomposed.threshold_change.changes)

        decomposed.manual_change.changes = self._manual_changes(corrections)
        decomposed.manual_change.summary = self._summarize(decomposed.manual_change.changes)

        return decomposed

    def _sample_changes(
        self,
        baseline_samples: SampleSet,
        candidate_samples: SampleSet,
        result: GrayCompareResult,
    ) -> List[DecisionChange]:
        base_ids = baseline_samples.sample_ids()
        cand_ids = candidate_samples.sample_ids()
        added = cand_ids - base_ids
        removed = base_ids - cand_ids
        changes: List[DecisionChange] = []
        for sid in added:
            cand = result.candidate_decisions.get(sid)
            changes.append(
                DecisionChange(
                    sample_id=sid,
                    before_decision=None,
                    after_decision=cand.decision if cand else None,
                    after_score=cand.score if cand else None,
                    change_type="sample",
                    reason="样本新增",
                )
            )
        for sid in removed:
            base = result.baseline_decisions.get(sid)
            changes.append(
                DecisionChange(
                    sample_id=sid,
                    before_decision=base.decision if base else None,
                    before_score=base.score if base else None,
                    after_decision=None,
                    change_type="sample",
                    reason="样本移除",
                )
            )
        return changes

    def _threshold_changes(
        self,
        baseline_samples: SampleSet,
        candidate_samples: SampleSet,
        result: GrayCompareResult,
    ) -> List[DecisionChange]:
        common_ids = baseline_samples.sample_ids() & candidate_samples.sample_ids()
        changes: List[DecisionChange] = []
        for sid in common_ids:
            base = result.baseline_decisions.get(sid)
            cand = result.candidate_decisions.get(sid)
            if not base or not cand:
                continue
            if base.source == "manual" or cand.source == "manual":
                continue
            if base.decision != cand.decision:
                changes.append(
                    DecisionChange(
                        sample_id=sid,
                        before_decision=base.decision,
                        before_score=base.score,
                        after_decision=cand.decision,
                        after_score=cand.score,
                        change_type="threshold",
                        reason="阈值调整导致决策变化",
                    )
                )
        return changes

    def _manual_changes(self, corrections: List[ManualCorrection]) -> List[DecisionChange]:
        changes: List[DecisionChange] = []
        for corr in corrections:
            if not corr.is_changed:
                continue
            changes.append(
                DecisionChange(
                    sample_id=corr.sample_id,
                    before_decision=corr.original_decision,
                    before_score=corr.original_score,
                    after_decision=corr.corrected_decision,
                    after_score=corr.corrected_score,
                    change_type="manual",
                    reason=corr.reason,
                )
            )
        return changes

    def _summarize(self, changes: List[DecisionChange]) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for c in changes:
            key = f"{c.before_decision or 'N/A'}->{c.after_decision or 'N/A'}"
            summary[key] = summary.get(key, 0) + 1
        return summary
