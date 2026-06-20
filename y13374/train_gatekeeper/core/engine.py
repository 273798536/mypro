from typing import List, Tuple, Dict
from .models import (
    Sample,
    SampleSource,
    GateParams,
    GateDecision,
    EvalResult,
    AttributionResult,
    MisjudgeExplain,
)


class GateEngine:
    def __init__(self, params: GateParams):
        self.params = params

    def evaluate(self, samples: List[Sample]) -> EvalResult:
        result = EvalResult()
        result.param_snapshot_id = ""

        param_errors = self.params.validate()
        result.param_errors = param_errors
        if param_errors:
            result.decision = GateDecision.FAIL
            result.next_steps = [
                "参数校验失败，请先修复以上参数问题，再重新执行评测。",
                "修复后可运行: train-gatekeeper run --config config.json",
            ]
            return result

        gray_samples = self._apply_gray_ratio(samples)
        total = len(gray_samples)

        if total < self.params.min_total_samples:
            result.decision = GateDecision.WARNING
            result.total_samples = total
            result.next_steps.append(
                f"样本数量不足（当前 {total}，最少需要 {self.params.min_total_samples}），"
                f"结论仅供参考。下一步：请补充更多样本到 data/input/ 目录，或调低 min_total_samples 阈值。"
            )
            return result

        correct = sum(1 for s in gray_samples if s.is_correct())
        accuracy = correct / total if total > 0 else 0.0

        result.total_samples = total
        result.correct_samples = correct
        result.accuracy = accuracy

        if accuracy >= self.params.pass_threshold:
            result.decision = GateDecision.PASS
        elif accuracy < self.params.fail_threshold:
            result.decision = GateDecision.FAIL
        else:
            result.decision = GateDecision.WARNING

        result.fail_samples = [
            s.sample_id for s in gray_samples if not s.is_correct()]
        result.boundary_samples = [
            s.sample_id for s in gray_samples if s.source == SampleSource.BOUNDARY]
        result.old_queue_samples = [
            s.sample_id for s in gray_samples if s.source == SampleSource.OLD_QUEUE]
        result.misjudge_samples = [
            s.sample_id for s in gray_samples if s.source == SampleSource.MISJUDGE]

        result.attributions = self._run_attribution_analysis(gray_samples, result.decision)

        misjudge_samples = [s for s in gray_samples if s.source == SampleSource.MISJUDGE]
        result.misjudge_explanations = self._explain_misjudges(misjudge_samples)

        result.next_steps.extend(self._generate_next_steps(result))

        return result

    def _apply_gray_ratio(self, samples: List[Sample]) -> List[Sample]:
        if self.params.gray_ratio >= 1.0:
            return list(samples)
        keep_count = max(1, int(len(samples) * self.params.gray_ratio))
        return samples[:keep_count]

    def _run_attribution_analysis(
        self, samples: List[Sample], base_decision: GateDecision
    ) -> List[AttributionResult]:
        attributions = []
        base_accuracy = self._calc_accuracy(samples)

        factors = [
            ("old_queue", SampleSource.OLD_QUEUE, "旧版失败队列样本"),
            ("boundary", SampleSource.BOUNDARY, "边界样本"),
            ("misjudge", SampleSource.MISJUDGE, "旧模型误判样本"),
        ]

        for factor_key, source, desc in factors:
            filtered = [s for s in samples if s.source != source]
            if not filtered:
                continue
            filtered_accuracy = self._calc_accuracy(filtered)
            filtered_decision = self._decision_from_accuracy(filtered_accuracy)
            impact_acc_diff = base_accuracy - filtered_accuracy
            impact_decision = filtered_decision != base_decision

            affected = [s.sample_id for s in samples if s.source == source and not s.is_correct()]

            description = (
                f"移除{desc}后，准确率从 {base_accuracy:.2%} 变为 {filtered_accuracy:.2%}，"
                f"结论从 {base_decision.value} 变为 {filtered_decision.value}。"
            )
            if impact_decision:
                description += f"该因素影响了最终结论。"
            else:
                description += f"该因素未改变最终结论。"

            attributions.append(AttributionResult(
                factor=factor_key,
                impact_decision=impact_decision,
                impact_accuracy=impact_acc_diff,
                description=description,
                affected_samples=affected,
            ))

        return attributions

    def _explain_misjudges(self, samples: List[Sample]) -> List[MisjudgeExplain]:
        explanations = []
        for s in samples:
            old_pred = s.metadata.get("old_predicted_label", "unknown")
            old_score = s.metadata.get("old_score", None)
            new_pred = s.predicted_label or "unknown"
            new_score = s.score
            expected = s.expected_label
            changed_correct = s.is_correct() if s.is_correct() is not None else False
            score_change = None
            if old_score is not None and new_score is not None:
                score_change = new_score - old_score

            if changed_correct:
                reason = f"旧模型预测为 {old_pred}（错误），新模型预测为 {new_pred}（正确）。"
                if score_change is not None:
                    reason += f"置信度从 {old_score:.4f} 提升到 {new_score:.4f}。"
                reason += "改判原因：新模型训练数据覆盖了该场景，特征表示更准确。"
            else:
                reason = f"旧模型预测为 {old_pred}，新模型预测为 {new_pred}。"
                if score_change is not None:
                    reason += f"置信度从 {old_score:.4f} 变为 {new_score:.4f}。"
                reason += "注意：该样本新旧模型表现未改判或仍判断错误，建议人工复核。"

            explanations.append(MisjudgeExplain(
                sample_id=s.sample_id,
                old_predicted=old_pred,
                new_predicted=new_pred,
                expected=expected,
                changed_correct=changed_correct,
                reason=reason,
                score_change=score_change,
            ))
        return explanations

    def _calc_accuracy(self, samples: List[Sample]) -> float:
        if not samples:
            return 0.0
        correct = sum(1 for s in samples if s.is_correct())
        return correct / len(samples)

    def _decision_from_accuracy(self, accuracy: float) -> GateDecision:
        if accuracy >= self.params.pass_threshold:
            return GateDecision.PASS
        elif accuracy < self.params.fail_threshold:
            return GateDecision.FAIL
        else:
            return GateDecision.WARNING

    def _generate_next_steps(self, result: EvalResult) -> List[str]:
        steps = []

        if result.decision == GateDecision.PASS:
            steps.append("评测通过，可以继续上线流程。如需导出报告，运行：train-gatekeeper report --run-id " + result.run_id)
        elif result.decision == GateDecision.FAIL:
            steps.append(
                "评测失败，请先修复失败样本。失败样本列表见 data/exceptions/fail_samples.json。"
            )
            key_factor = None
            for attr in result.attributions:
                if attr.impact_decision:
                    key_factor = attr.factor
                    break
            if key_factor == "old_queue":
                steps.append(
                    "归因提示：旧版失败队列样本影响了结论。"
                    "下一步：检查旧版队列是否仍有效，可调整 max_old_queue_ratio 或移除无效样本。"
                )
            elif key_factor == "boundary":
                steps.append(
                    "归因提示：边界样本影响了结论。"
                    "下一步：边界样本本身难度较高，建议单独评估边界处理策略。"
                )
        elif result.decision == GateDecision.WARNING:
            steps.append(
                "评测结果处于警戒区间，请人工复核后决定是否上线。"
            )

        if result.misjudge_explanations:
            fixed_count = sum(1 for m in result.misjudge_explanations if m.changed_correct)
            total = len(result.misjudge_explanations)
            steps.append(
                f"旧误判样本 {total} 条，其中 {fixed_count} 条已被新模型正确预测。"
                f"详细改判说明见报告 misjudge_explanations 字段。"
            )

        steps.append(
            "查看当前状态：运行 train-gatekeeper status"
        )
        steps.append(
            "导出最新报告：运行 train-gatekeeper report"
        )

        return steps
