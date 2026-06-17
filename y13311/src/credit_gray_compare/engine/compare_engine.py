"""灰度对比引擎：串联样本、版本、人工修正、接口返回。"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..models import (
    EvaluationRecord,
    InterfaceResponse,
    ManualCorrection,
    SampleSet,
    ThresholdVersion,
)


@dataclass
class SampleDecision:
    """单个样本的决策结果。"""

    sample_id: str
    score: Optional[float] = None
    decision: Optional[str] = None
    source: str = "model"


@dataclass
class GrayCompareResult:
    """灰度对比整体结果。"""

    baseline_decisions: Dict[str, SampleDecision] = field(default_factory=dict)
    candidate_decisions: Dict[str, SampleDecision] = field(default_factory=dict)
    corrections: List[ManualCorrection] = field(default_factory=list)
    responses: List[InterfaceResponse] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    decision_changes: List[Any] = field(default_factory=list)


class GrayCompareEngine:
    """灰度对比核心引擎。

    串联：样本集 × (基线版本, 候选版本) × 人工修正 × 接口返回
    """

    def __init__(
        self,
        baseline_threshold: ThresholdVersion,
        candidate_threshold: ThresholdVersion,
    ) -> None:
        self.baseline_threshold = baseline_threshold
        self.candidate_threshold = candidate_threshold

    def _score_samples(
        self,
        sample_set: SampleSet,
        responses: List[InterfaceResponse],
        threshold: ThresholdVersion,
    ) -> Dict[str, SampleDecision]:
        """根据接口返回与阈值计算每个样本的决策。"""
        response_map = {r.sample_id: r for r in responses}
        decisions: Dict[str, SampleDecision] = {}
        for sample in sample_set.samples:
            resp = response_map.get(sample.sample_id)
            score = resp.score if resp else None
            decision = threshold.decision(score) if score is not None else None
            decisions[sample.sample_id] = SampleDecision(
                sample_id=sample.sample_id,
                score=score,
                decision=decision,
                source="model" if resp else "missing",
            )
        return decisions

    def _apply_corrections(
        self,
        decisions: Dict[str, SampleDecision],
        corrections: List[ManualCorrection],
    ) -> Dict[str, SampleDecision]:
        """将已确认的人工修正叠加到决策结果上。"""
        result = {k: SampleDecision(**vars(v)) for k, v in decisions.items()}
        for corr in corrections:
            if corr.status.value != "confirmed":
                continue
            if corr.sample_id not in result:
                continue
            result[corr.sample_id] = SampleDecision(
                sample_id=corr.sample_id,
                score=corr.corrected_score,
                decision=corr.corrected_decision,
                source="manual",
            )
        return result

    def run(
        self,
        sample_set: SampleSet,
        responses: List[InterfaceResponse],
        corrections: Optional[List[ManualCorrection]] = None,
    ) -> GrayCompareResult:
        """执行一次灰度对比。"""
        corrections = corrections or []

        baseline_raw = self._score_samples(sample_set, responses, self.baseline_threshold)
        candidate_raw = self._score_samples(sample_set, responses, self.candidate_threshold)

        baseline = self._apply_corrections(baseline_raw, corrections)
        candidate = self._apply_corrections(candidate_raw, corrections)

        result = GrayCompareResult(
            baseline_decisions=baseline,
            candidate_decisions=candidate,
            corrections=corrections,
            responses=responses,
        )
        result.metrics = self._compute_metrics(sample_set, result)
        return result

    def _compute_metrics(
        self, sample_set: SampleSet, result: GrayCompareResult
    ) -> Dict[str, Any]:
        total = sample_set.size
        changed = 0
        pass_to_reject = pass_to_review = review_to_pass = review_to_reject = 0
        reject_to_pass = reject_to_review = 0

        for sid, base in result.baseline_decisions.items():
            cand = result.candidate_decisions.get(sid)
            if not cand:
                continue
            if base.decision != cand.decision:
                changed += 1
                pair = (base.decision, cand.decision)
                if pair == ("pass", "reject"):
                    pass_to_reject += 1
                elif pair == ("pass", "review"):
                    pass_to_review += 1
                elif pair == ("review", "pass"):
                    review_to_pass += 1
                elif pair == ("review", "reject"):
                    review_to_reject += 1
                elif pair == ("reject", "pass"):
                    reject_to_pass += 1
                elif pair == ("reject", "review"):
                    reject_to_review += 1

        return {
            "total_samples": total,
            "changed_count": changed,
            "changed_rate": changed / total if total else 0.0,
            "pass_to_reject": pass_to_reject,
            "pass_to_review": pass_to_review,
            "review_to_pass": review_to_pass,
            "review_to_reject": review_to_reject,
            "reject_to_pass": reject_to_pass,
            "reject_to_review": reject_to_review,
        }

    def to_evaluation_record(
        self,
        result: GrayCompareResult,
        sample_set_id: str,
        operator: str,
        memo: str = "",
    ) -> EvaluationRecord:
        """将对比结果转换为评测历史记录。"""
        from ..models import DecisionChange

        changes: List[DecisionChange] = []
        for sid, base in result.baseline_decisions.items():
            cand = result.candidate_decisions.get(sid)
            if not cand:
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
                    )
                )
        return EvaluationRecord(
            record_id=str(uuid.uuid4()),
            sample_set_id=sample_set_id,
            model_version_id=self.candidate_threshold.model_version_id,
            threshold_version_id=self.candidate_threshold.version_id,
            metrics=result.metrics,
            decision_changes=changes,
            operator=operator,
            memo=memo,
        )
