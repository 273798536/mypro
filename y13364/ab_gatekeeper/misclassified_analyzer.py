import re
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter

from .models import Sample, SampleSource, SampleStatus, DecisionRecord, DecisionReason, generate_id


class MisclassifiedAnalyzer:
    EXPLANATION_KEYWORDS = {
        "特征增强": ["特征", "feature", "embedding", "向量化", "表示", "语义", "语境"],
        "数据增强": ["样本", "数据量", "训练集", "增广", "augment", "采样"],
        "模型优化": ["结构", "架构", "层数", "注意力", "attention", "正则化", "dropout"],
        "阈值调整": ["阈值", "threshold", "置信度", "score", "决策边界"],
        "标签修正": ["标注", "标签", "ground.?truth", "修正", "纠正"],
        "训练策略": ["学习率", "lr", "loss", "损失函数", "batch", "epoch", "优化器", "optimizer"],
    }

    def __init__(self):
        self.explanations: Dict[str, Dict[str, Any]] = {}

    def _extract_text_features(self, text: str) -> List[str]:
        features = []
        for category, keywords in self.EXPLANATION_KEYWORDS.items():
            for kw in keywords:
                if re.search(kw, text, re.IGNORECASE):
                    features.append(category)
                    break
        return list(set(features))

    def _analyze_score_change(
        self,
        old_score: Optional[float],
        new_score: Optional[float],
        old_pred: Optional[str],
        new_pred: Optional[str],
        true_label: Optional[str],
    ) -> Dict[str, Any]:
        result = {
            "score_delta": None,
            "score_direction": "unchanged",
            "prediction_changed": False,
            "corrected_misclassification": False,
            "introduced_error": False,
            "detail": "",
        }
        if old_score is not None and new_score is not None:
            delta = new_score - old_score
            result["score_delta"] = round(delta, 4)
            if delta > 0.05:
                result["score_direction"] = "显著提升"
            elif delta > 0:
                result["score_direction"] = "略有提升"
            elif delta < -0.05:
                result["score_direction"] = "显著下降"
            elif delta < 0:
                result["score_direction"] = "略有下降"

        if old_pred and new_pred:
            result["prediction_changed"] = (old_pred != new_pred)
            if true_label:
                old_correct = (old_pred == true_label)
                new_correct = (new_pred == true_label)
                if not old_correct and new_correct:
                    result["corrected_misclassification"] = True
                    result["detail"] = f"旧模型预测[{old_pred}]错误，新模型预测[{new_pred}]正确，改判成功"
                elif old_correct and not new_correct:
                    result["introduced_error"] = True
                    result["detail"] = f"旧模型预测[{old_pred}]正确，新模型预测[{new_pred}]错误，引入新错误"
                elif not old_correct and not new_correct:
                    result["detail"] = f"旧模型预测[{old_pred}]、新模型预测[{new_pred}]均与真实标签[{true_label}]不符，仍需改进"
                else:
                    result["detail"] = f"新旧模型预测均正确(均为[{new_pred}])"
            else:
                if result["prediction_changed"]:
                    result["detail"] = f"预测结果从[{old_pred}]变为[{new_pred}]，真实标签未知，需人工确认"
                else:
                    result["detail"] = f"新旧模型预测一致(均为[{new_pred}])"
        return result

    def _match_contextual_evidence(
        self,
        sample: Sample,
        all_samples: List[Sample],
    ) -> List[Dict[str, Any]]:
        evidence = []
        related = [s for s in all_samples if s.task_id == sample.task_id and s.sample_id != sample.sample_id]
        related.sort(key=lambda x: x.timestamp, reverse=True)

        old_logs = [s for s in related if s.source == SampleSource.TRAIN_LOG_OLD]
        for ol in old_logs[:3]:
            features = self._extract_text_features(ol.content)
            if features:
                evidence.append({
                    "type": "旧版训练日志佐证",
                    "source_sample_id": ol.sample_id,
                    "timestamp": ol.timestamp,
                    "relevant_features": features,
                    "snippet": ol.content[:120] + ("..." if len(ol.content) > 120 else ""),
                })

        withdraws = [s for s in related if s.source == SampleSource.WITHDRAW_RECORD]
        for w in withdraws[:2]:
            evidence.append({
                "type": "撤回记录佐证",
                "source_sample_id": w.sample_id,
                "timestamp": w.timestamp,
                "relevant_features": ["训练流程回滚"],
                "snippet": w.content[:120] + ("..." if len(w.content) > 120 else ""),
            })

        verbals = [s for s in related if s.source == SampleSource.VERBAL_NOTE]
        for v in verbals[:2]:
            evidence.append({
                "type": "口头备注佐证",
                "source_sample_id": v.sample_id,
                "timestamp": v.timestamp,
                "relevant_features": ["人工经验补充"],
                "snippet": v.content[:120] + ("..." if len(v.content) > 120 else ""),
            })

        return evidence

    def analyze_sample(
        self,
        sample: Sample,
        all_samples: List[Sample],
    ) -> Dict[str, Any]:
        if not sample.is_misclassified_return:
            return {"sample_id": sample.sample_id, "is_misclassified_return": False}

        content_features = self._extract_text_features(sample.content)
        score_analysis = self._analyze_score_change(
            sample.old_model_score,
            sample.prediction_score,
            sample.old_model_prediction,
            sample.predicted_label,
            sample.original_label,
        )
        evidence = self._match_contextual_evidence(sample, all_samples)

        explained = False
        explanation_categories = []
        if content_features:
            explanation_categories.extend(content_features)
        for ev in evidence:
            explanation_categories.extend(ev.get("relevant_features", []))
        explanation_categories = list(set(explanation_categories))

        if explanation_categories and (score_analysis["corrected_misclassification"] or score_analysis["prediction_changed"]):
            explained = True

        explanation_text_parts = []
        if score_analysis["detail"]:
            explanation_text_parts.append(score_analysis["detail"])
        if explanation_categories:
            explanation_text_parts.append(f"可能归因于：{'、'.join(explanation_categories)}")
        if evidence:
            evidence_strs = [f"{e['type']}(来自样本{e['source_sample_id']})" for e in evidence]
            explanation_text_parts.append(f"关联证据链：{'；'.join(evidence_strs)}")
        if not explanation_text_parts:
            explanation_text_parts.append("暂无足够证据解释改判原因，建议人工复核样本细节")

        explanation_text = "；".join(explanation_text_parts)

        result = {
            "sample_id": sample.sample_id,
            "is_misclassified_return": True,
            "task_id": sample.task_id,
            "true_label": sample.original_label,
            "old_model": {
                "prediction": sample.old_model_prediction,
                "score": sample.old_model_score,
            },
            "new_model": {
                "prediction": sample.predicted_label,
                "score": sample.prediction_score,
            },
            "score_analysis": score_analysis,
            "explanation_categories": explanation_categories,
            "context_evidence": evidence,
            "explained": explained,
            "needs_manual_review": not explained,
            "explanation_text": explanation_text,
        }
        self.explanations[sample.sample_id] = result
        return result

    def analyze_all(self, samples: List[Sample]) -> Dict[str, Any]:
        misclassified_samples = [s for s in samples if s.is_misclassified_return]
        individual_results = []
        for s in misclassified_samples:
            individual_results.append(self.analyze_sample(s, samples))

        total = len(misclassified_samples)
        corrected = sum(1 for r in individual_results if r.get("score_analysis", {}).get("corrected_misclassification"))
        introduced = sum(1 for r in individual_results if r.get("score_analysis", {}).get("introduced_error"))
        explained = sum(1 for r in individual_results if r.get("explained"))
        needs_review = sum(1 for r in individual_results if r.get("needs_manual_review"))
        prediction_changed = sum(1 for r in individual_results if r.get("score_analysis", {}).get("prediction_changed"))

        category_counter = Counter()
        for r in individual_results:
            for cat in r.get("explanation_categories", []):
                category_counter[cat] += 1

        report = {
            "total_misclassified_samples": total,
            "corrected_count": corrected,
            "correction_rate": round(corrected / total, 4) if total else 0.0,
            "introduced_error_count": introduced,
            "prediction_changed_count": prediction_changed,
            "explained_count": explained,
            "explanation_rate": round(explained / total, 4) if total else 0.0,
            "needs_manual_review_count": needs_review,
            "needs_manual_review": needs_review > 0,
            "category_distribution": dict(category_counter),
            "individual_analysis": individual_results,
            "manual_review_reason": (
                f"共{needs_review}条误判样本暂无法自动解释改判原因"
                if needs_review > 0
                else ""
            ),
            "summary": self._build_summary(
                total, corrected, introduced, explained, needs_review, dict(category_counter)
            ),
        }
        return report

    def _build_summary(
        self,
        total: int,
        corrected: int,
        introduced: int,
        explained: int,
        needs_review: int,
        categories: Dict[str, int],
    ) -> str:
        if total == 0:
            return "未检测到旧模型误判回检样本"
        parts = [f"本次共回检{total}条旧模型误判样本"]
        if corrected > 0:
            pct = round(corrected / total * 100, 1)
            parts.append(f"其中{corrected}条({pct}%)已由新模型成功改判正确")
        if introduced > 0:
            parts.append(f"新模型在{introduced}条样本上引入了新的错误，需要关注")
        if explained > 0:
            parts.append(f"{explained}条可自动归因，主要涉及{'、'.join(categories.keys()) if categories else '多维度'}")
        if needs_review > 0:
            parts.append(f"{needs_review}条暂无法自动解释，需要人工复核")
        return "；".join(parts)

    def build_decision_records(self, samples: List[Sample]) -> List[DecisionRecord]:
        records = []
        for s in samples:
            if not s.is_misclassified_return:
                continue
            analysis = self.explanations.get(s.sample_id) or self.analyze_sample(s, samples)
            passed = analysis.get("score_analysis", {}).get("corrected_misclassification", False)
            reason = DecisionReason.MISCLASSIFIED_EXPLAINED if analysis.get("explained") else DecisionReason.METRIC_BELOW_THRESHOLD
            detail = analysis.get("explanation_text", "")
            evidence_chain = [
                f"{e['type']}:{e['source_sample_id']}" for e in analysis.get("context_evidence", [])
            ]
            affected_sources = [SampleSource.MISCLASSIFIED_RETURN]
            for e in analysis.get("context_evidence", []):
                src_type = e["type"]
                if "旧版" in src_type:
                    affected_sources.append(SampleSource.TRAIN_LOG_OLD)
                elif "撤回" in src_type:
                    affected_sources.append(SampleSource.WITHDRAW_RECORD)
                elif "口头" in src_type:
                    affected_sources.append(SampleSource.VERBAL_NOTE)
            affected_sources = list(set(affected_sources))
            records.append(DecisionRecord(
                decision_id=generate_id("dec"),
                sample_id=s.sample_id,
                passed=passed,
                reason=reason,
                detail=detail,
                evidence_chain=evidence_chain,
                affected_by_sources=affected_sources,
            ))
        return records
