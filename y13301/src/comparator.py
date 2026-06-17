from typing import List, Tuple, Optional
from .models import (
    EvaluationSample,
    ComparisonResult,
    JudgmentStatus,
    ModelPrediction,
    DuplicateEvaluation,
)


class GrayComparator:
    def __init__(
        self,
        old_threshold: float = 0.5,
        new_threshold: float = 0.5,
        respect_manual: bool = True,
    ):
        self.old_threshold = old_threshold
        self.new_threshold = new_threshold
        self.respect_manual = respect_manual

    def compare(
        self,
        samples: List[EvaluationSample],
        duplicates: Optional[List[DuplicateEvaluation]] = None,
    ) -> ComparisonResult:
        consistent = 0
        inconsistent = 0
        manual_revised = 0
        pending = 0
        to_confirm = 0
        threshold_impact = 0
        backtest_samples = []

        for sample in samples:
            sample.status = self._determine_status(sample)

            if sample.is_misjudgment_backtest:
                backtest_samples.append(sample)

            if sample.status == JudgmentStatus.MANUAL_REVISED:
                manual_revised += 1
            elif sample.status == JudgmentStatus.PENDING_MATERIAL:
                pending += 1
            elif sample.status == JudgmentStatus.TO_CONFIRM:
                to_confirm += 1

            if sample.old_model and sample.new_model:
                is_consistent, affected_by_threshold = self._check_consistency(sample)

                if affected_by_threshold:
                    threshold_impact += 1

                if self.respect_manual and sample.manual_judgment:
                    sample.notes = (
                        f"人工判断覆盖：{sample.manual_judgment}，"
                        f"旧模型：{sample.old_model.judgment}，"
                        f"新模型：{sample.new_model.judgment}"
                    )
                    if sample.status not in [
                        JudgmentStatus.TO_CONFIRM,
                        JudgmentStatus.PENDING_MATERIAL,
                        JudgmentStatus.WITHDRAWN,
                    ]:
                        if sample.status != JudgmentStatus.MANUAL_REVISED:
                            sample.status = JudgmentStatus.MANUAL_REVISED
                        manual_revised += 1
                    continue

                if is_consistent:
                    consistent += 1
                else:
                    inconsistent += 1

        return ComparisonResult(
            total_samples=len(samples),
            consistent_count=consistent,
            inconsistent_count=inconsistent,
            manual_revised_count=manual_revised,
            pending_count=pending,
            to_confirm_count=to_confirm,
            threshold_impact_count=threshold_impact,
            backtest_samples=backtest_samples,
            duplicate_evaluations=duplicates or [],
            samples=samples,
        )

    def _check_consistency(
        self, sample: EvaluationSample
    ) -> Tuple[bool, bool]:
        old_pred = sample.old_model
        new_pred = sample.new_model

        if not old_pred or not new_pred:
            return False, False

        judgment_consistent = old_pred.judgment == new_pred.judgment

        old_by_threshold = self._judge_by_threshold(old_pred.score, self.old_threshold)
        new_by_threshold = self._judge_by_threshold(new_pred.score, self.new_threshold)

        threshold_only_consistent = old_by_threshold == new_by_threshold
        affected_by_threshold = (
            old_pred.judgment != new_pred.judgment
            and threshold_only_consistent
        )

        return judgment_consistent, affected_by_threshold

    @staticmethod
    def _judge_by_threshold(score: float, threshold: float) -> str:
        return "通过" if score >= threshold else "不通过"

    def _determine_status(self, sample: EvaluationSample) -> JudgmentStatus:
        if sample.status == JudgmentStatus.TO_CONFIRM:
            return JudgmentStatus.TO_CONFIRM

        if sample.status == JudgmentStatus.PENDING_MATERIAL:
            return JudgmentStatus.PENDING_MATERIAL

        if sample.status == JudgmentStatus.WITHDRAWN:
            return JudgmentStatus.WITHDRAWN

        if sample.manual_judgment and sample.manual_reason:
            if (
                sample.old_model
                and sample.new_model
                and sample.manual_judgment != sample.new_model.judgment
            ):
                return JudgmentStatus.MANUAL_REVISED

        if sample.status == JudgmentStatus.WITHDRAWN:
            return JudgmentStatus.WITHDRAWN

        return JudgmentStatus.PROCESSED

    def apply_threshold_adjustment(
        self, sample: EvaluationSample, new_threshold: float
    ) -> ModelPrediction:
        if not sample.new_model:
            raise ValueError("样本缺少新模型预测结果")

        original_judgment = sample.new_model.judgment
        new_judgment = self._judge_by_threshold(sample.new_model.score, new_threshold)

        adjusted = ModelPrediction(
            model_version=sample.new_model.model_version,
            score=sample.new_model.score,
            judgment=new_judgment,
            threshold=new_threshold,
            features=sample.new_model.features.copy(),
            explanation=(
                f"阈值调整：{self.new_threshold} -> {new_threshold}，"
                f"原判断：{original_judgment} -> 新判断：{new_judgment}"
            ),
        )
        return adjusted
