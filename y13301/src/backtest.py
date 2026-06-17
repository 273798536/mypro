from typing import List, Dict, Optional
from .models import (
    EvaluationSample,
    ModelPrediction,
    SampleSource,
    JudgmentStatus,
)


class MisjudgmentBacktest:
    def __init__(self):
        self.explanation_templates = {
            "score_diff": "新模型得分从{old_score:.3f}调整为{new_score:.3f}，"
            "变化幅度达{diff:.3f}，跨越了判定阈值",
            "feature_change": "关键特征权重变化：{feature_changes}，"
            "导致模型对该样本的判断逻辑发生改变",
            "threshold_shift": "判定阈值由{old_threshold}调整为{new_threshold}，"
            "原得分{old_score:.3f}在旧阈值下为{old_judgment}，"
            "新得分{new_score:.3f}在新阈值下为{new_judgment}",
            "correction": "旧模型误判已被修正：原判断为{old_judgment}，"
            "人工标注为{manual_judgment}，新模型输出为{new_judgment}",
            "still_incorrect": "新模型仍未正确判断：人工标注为{manual_judgment}，"
            "新模型输出为{new_judgment}，需进一步分析",
        }

    def prepare_backtest_sample(
        self,
        original_sample: EvaluationSample,
        new_model_prediction: ModelPrediction,
    ) -> EvaluationSample:
        backtest_sample = EvaluationSample(
            sample_id=f"{original_sample.sample_id}_BT",
            conversation_id=original_sample.conversation_id,
            content=original_sample.content,
            source=SampleSource.BACKTEST,
            old_model=original_sample.old_model,
            new_model=new_model_prediction,
            manual_judgment=original_sample.manual_judgment,
            manual_reason=original_sample.manual_reason,
            status=JudgmentStatus.PROCESSED,
            tags=[*original_sample.tags, "回测样本", "旧模型误判"],
            is_misjudgment_backtest=True,
            notes=f"回测样本：原样本ID {original_sample.sample_id}",
        )

        backtest_sample.revision_explanation = self.generate_explanation(
            backtest_sample
        )

        return backtest_sample

    def generate_explanation(self, sample: EvaluationSample) -> str:
        if not sample.old_model or not sample.new_model:
            return "缺少模型预测数据，无法生成改判解释"

        explanations = []

        old_pred = sample.old_model
        new_pred = sample.new_model
        manual = sample.manual_judgment

        score_diff = new_pred.score - old_pred.score
        if abs(score_diff) >= 0.1:
            explanations.append(
                self.explanation_templates["score_diff"].format(
                    old_score=old_pred.score,
                    new_score=new_pred.score,
                    diff=score_diff,
                )
            )

        feature_changes = self._analyze_feature_changes(old_pred, new_pred)
        if feature_changes:
            explanations.append(
                self.explanation_templates["feature_change"].format(
                    feature_changes=feature_changes
                )
            )

        if old_pred.threshold != new_pred.threshold:
            old_judge = "通过" if old_pred.score >= old_pred.threshold else "不通过"
            new_judge = "通过" if new_pred.score >= new_pred.threshold else "不通过"
            explanations.append(
                self.explanation_templates["threshold_shift"].format(
                    old_threshold=old_pred.threshold,
                    new_threshold=new_pred.threshold,
                    old_score=old_pred.score,
                    old_judgment=old_judge,
                    new_score=new_pred.score,
                    new_judgment=new_judge,
                )
            )

        if manual:
            if new_pred.judgment == manual and old_pred.judgment != manual:
                explanations.append(
                    self.explanation_templates["correction"].format(
                        old_judgment=old_pred.judgment,
                        manual_judgment=manual,
                        new_judgment=new_pred.judgment,
                    )
                )
            elif new_pred.judgment != manual:
                explanations.append(
                    self.explanation_templates["still_incorrect"].format(
                        manual_judgment=manual,
                        new_judgment=new_pred.judgment,
                    )
                )

        if not explanations:
            explanations.append(
                f"新旧模型判断由{old_pred.judgment}变为{new_pred.judgment}，"
                f"得分变化{score_diff:+.3f}，需结合具体业务场景进一步分析"
            )

        return "；".join(explanations)

    def batch_backtest(
        self,
        misjudged_samples: List[EvaluationSample],
        new_predictions: Dict[str, ModelPrediction],
    ) -> List[EvaluationSample]:
        results = []
        for sample in misjudged_samples:
            if sample.sample_id in new_predictions:
                backtest = self.prepare_backtest_sample(
                    sample, new_predictions[sample.sample_id]
                )
                results.append(backtest)
        return results

    def analyze_backtest_results(
        self, backtest_samples: List[EvaluationSample]
    ) -> Dict:
        total = len(backtest_samples)
        corrected = 0
        still_incorrect = 0
        partially_correct = 0

        for sample in backtest_samples:
            if not sample.old_model or not sample.new_model:
                continue

            manual = sample.manual_judgment
            old_j = sample.old_model.judgment
            new_j = sample.new_model.judgment

            if manual:
                if old_j != manual and new_j == manual:
                    corrected += 1
                elif old_j != manual and new_j != manual:
                    still_incorrect += 1
                else:
                    partially_correct += 1

        return {
            "total_backtest": total,
            "corrected_count": corrected,
            "correction_rate": corrected / total if total > 0 else 0,
            "still_incorrect_count": still_incorrect,
            "partially_correct_count": partially_correct,
        }

    @staticmethod
    def _analyze_feature_changes(
        old_pred: ModelPrediction, new_pred: ModelPrediction
    ) -> str:
        old_feats = old_pred.features or {}
        new_feats = new_pred.features or {}

        all_keys = set(old_feats.keys()) | set(new_feats.keys())
        changes = []

        for key in sorted(all_keys):
            old_val = old_feats.get(key, 0)
            new_val = new_feats.get(key, 0)

            try:
                old_num = float(old_val)
                new_num = float(new_val)
                diff = new_num - old_num
                if abs(diff) >= 0.05:
                    direction = "提升" if diff > 0 else "下降"
                    changes.append(f"{key}{direction}{abs(diff):.3f}")
            except (ValueError, TypeError):
                if old_val != new_val:
                    changes.append(f"{key}: {old_val} → {new_val}")

        if len(changes) > 3:
            return "、".join(changes[:3]) + f"等{len(changes)}项特征"
        elif changes:
            return "、".join(changes)
        else:
            return ""
