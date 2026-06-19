from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from .models import SnapshotRecord, SampleEvidence, ProcessingStatus


@dataclass
class RevisionExplanation:
    record_id: str
    sample_id: str
    old_result: Dict[str, Any]
    new_result: Dict[str, Any]
    change_type: str
    reasons: List[str]
    feature_diffs: Dict[str, Dict[str, Any]]
    evidence_refs: List[str]
    confidence: float

    def to_human_readable(self) -> str:
        change_text = {
            "false_positive_to_true_negative": "误报 → 正确拒绝（旧模型误判为正例，新模型正确判为负例）",
            "false_negative_to_true_positive": "漏报 → 正确命中（旧模型漏判，新模型正确识别）",
            "true_positive_to_false_negative": "正确命中 → 漏报（新模型漏判了）",
            "true_negative_to_false_positive": "正确拒绝 → 误报（新模型误报了）",
            "score_increase": "分数提升",
            "score_decrease": "分数下降",
            "status_change": "状态变更",
        }.get(self.change_type, self.change_type)

        reasons_str = "\n  - ".join(self.reasons) if self.reasons else "无具体原因"
        evidence_str = "\n  - ".join(self.evidence_refs) if self.evidence_refs else "无关联证据"

        feature_diffs_str = ""
        if self.feature_diffs:
            feature_diffs_str = "\n特征变化:\n"
            for feat, diff in self.feature_diffs.items():
                feature_diffs_str += f"  - {feat}: {diff.get('old')} → {diff.get('new')} (变化: {diff.get('change')})\n"

        return f"""
【改判解释】
记录ID: {self.record_id}
样本ID: {self.sample_id}
变更类型: {change_text}
置信度: {self.confidence:.2%}

旧结果:
  分数: {self.old_result.get('score')}
  阈值: {self.old_result.get('threshold')}
  通过: {self.old_result.get('is_approved')}
  状态: {self.old_result.get('status')}

新结果:
  分数: {self.new_result.get('score')}
  阈值: {self.new_result.get('threshold')}
  通过: {self.new_result.get('is_approved')}
  状态: {self.new_result.get('status')}

改判原因:
  - {reasons_str}

{feature_diffs_str}
关联证据:
  - {evidence_str}
"""


class RevisionExplainer:
    def __init__(self):
        self.explanation_history: List[RevisionExplanation] = []

    def explain_revision(
        self,
        new_record: SnapshotRecord,
        old_result: Optional[Dict[str, Any]] = None,
        old_evidence: Optional[List[SampleEvidence]] = None,
    ) -> RevisionExplanation:
        if old_result is None:
            old_result = new_record.previous_result or {}

        old_is_approved = old_result.get("is_approved", False)
        old_score = old_result.get("score", 0.0)
        old_status = old_result.get("status", "unknown")

        new_is_approved = new_record.is_approved()
        new_score = new_record.score
        new_status = new_record.processing_status.value

        change_type = self._determine_change_type(
            old_is_approved, new_is_approved, old_score, new_score, old_status, new_status
        )

        reasons = self._generate_reasons(
            new_record, old_result, old_score, new_score, old_is_approved, new_is_approved
        )

        feature_diffs = self._compare_features(new_record, old_result, old_evidence)

        evidence_refs = self._collect_evidence_refs(new_record, old_evidence)

        confidence = self._calculate_confidence(feature_diffs, reasons)

        sample_id = "unknown"
        if new_record.evidence_chain:
            sample_id = new_record.evidence_chain[0].sample_id
        elif old_evidence:
            sample_id = old_evidence[0].sample_id

        explanation = RevisionExplanation(
            record_id=new_record.record_id,
            sample_id=sample_id,
            old_result={
                "score": old_score,
                "threshold": old_result.get("threshold", new_record.threshold),
                "is_approved": old_is_approved,
                "status": old_status,
            },
            new_result={
                "score": new_score,
                "threshold": new_record.threshold,
                "is_approved": new_is_approved,
                "status": new_status,
            },
            change_type=change_type,
            reasons=reasons,
            feature_diffs=feature_diffs,
            evidence_refs=evidence_refs,
            confidence=confidence,
        )

        self.explanation_history.append(explanation)
        return explanation

    def compare_records(
        self, old_record: SnapshotRecord, new_record: SnapshotRecord
    ) -> RevisionExplanation:
        old_result = {
            "score": old_record.score,
            "threshold": old_record.threshold,
            "is_approved": old_record.is_approved(),
            "status": old_record.processing_status.value,
            "features": self._extract_features_from_evidence(old_record.evidence_chain),
        }

        return self.explain_revision(
            new_record=new_record,
            old_result=old_result,
            old_evidence=old_record.evidence_chain,
        )

    def explain_misjudged_sample(
        self,
        misjudged_sample: SampleEvidence,
        new_record: SnapshotRecord,
        old_model_label: str,
    ) -> RevisionExplanation:
        old_result = {
            "score": misjudged_sample.labels.get("old_score", 0.0),
            "threshold": new_record.threshold,
            "is_approved": old_model_label == "positive",
            "status": ProcessingStatus.NORMAL.value,
            "features": misjudged_sample.features,
            "label": old_model_label,
        }

        explanation = self.explain_revision(
            new_record=new_record,
            old_result=old_result,
            old_evidence=[misjudged_sample],
        )

        new_label = "positive" if new_record.is_approved() else "negative"
        if old_model_label != new_label:
            explanation.reasons.insert(0, f"旧模型标记为 '{old_model_label}'，新模型标记为 '{new_label}'")

        return explanation

    def get_explanation_by_record(self, record_id: str) -> Optional[RevisionExplanation]:
        for exp in reversed(self.explanation_history):
            if exp.record_id == record_id:
                return exp
        return None

    def _determine_change_type(
        self,
        old_approved: bool,
        new_approved: bool,
        old_score: float,
        new_score: float,
        old_status: str,
        new_status: str,
    ) -> str:
        if old_approved and not new_approved:
            if self._is_true_positive(old_score) and not self._is_true_positive(new_score):
                return "true_positive_to_false_negative"
            return "score_decrease"

        if not old_approved and new_approved:
            if not self._is_true_positive(old_score) and self._is_true_positive(new_score):
                return "false_negative_to_true_positive"
            return "score_increase"

        if old_approved and new_approved:
            if self._is_false_positive(old_score) and self._is_true_positive(new_score):
                return "false_positive_to_true_negative"
            return "score_increase" if new_score > old_score else "score_decrease"

        if not old_approved and not new_approved:
            if self._is_false_positive(old_score) and not self._is_false_positive(new_score):
                return "true_negative_to_false_positive"
            return "score_increase" if new_score > old_score else "score_decrease"

        if old_status != new_status:
            return "status_change"

        return "no_change"

    def _generate_reasons(
        self,
        new_record: SnapshotRecord,
        old_result: Dict[str, Any],
        old_score: float,
        new_score: float,
        old_approved: bool,
        new_approved: bool,
    ) -> List[str]:
        reasons = []

        score_diff = new_score - old_score
        if abs(score_diff) > 0.001:
            direction = "上升" if score_diff > 0 else "下降"
            reasons.append(f"分数{direction}了 {abs(score_diff):.4f} ({old_score:.4f} → {new_score:.4f})")

        threshold = new_record.threshold
        old_threshold = old_result.get("threshold", threshold)
        if abs(threshold - old_threshold) > 0.001:
            reasons.append(f"阈值从 {old_threshold:.4f} 调整为 {threshold:.4f}")

        old_dist = abs(old_score - threshold)
        new_dist = abs(new_score - threshold)
        if old_dist != new_dist:
            old_side = "≥" if old_score >= threshold else "<"
            new_side = "≥" if new_score >= threshold else "<"
            reasons.append(
                f"与阈值关系: 旧分数 {old_side} 阈值（距离 {old_dist:.4f}），新分数 {new_side} 阈值（距离 {new_dist:.4f}）"
            )

        if new_record.processing_status != ProcessingStatus.NORMAL:
            reasons.append(f"处理状态变更为: {new_record.processing_status.value}")

        if new_record.small_sample_masked:
            reasons.append(f"小样本被均值掩盖: {new_record.small_sample_mask_reason or '未说明原因'}")

        if new_record.processing_errors:
            for error in new_record.processing_errors:
                reasons.append(f"处理错误: {error}")

        if old_approved != new_approved:
            if new_approved:
                reasons.append("结论变更: 从不通过变为通过")
            else:
                reasons.append("结论变更: 从通过变为不通过")

        if not reasons:
            reasons.append("无显著变化")

        return reasons

    def _compare_features(
        self,
        new_record: SnapshotRecord,
        old_result: Dict[str, Any],
        old_evidence: Optional[List[SampleEvidence]],
    ) -> Dict[str, Dict[str, Any]]:
        diffs: Dict[str, Dict[str, Any]] = {}

        old_features = old_result.get("features", {})
        if old_evidence:
            old_features.update(self._extract_features_from_evidence(old_evidence))

        new_features = self._extract_features_from_evidence(new_record.evidence_chain)

        all_features = set(old_features.keys()) | set(new_features.keys())

        for feat in all_features:
            old_val = old_features.get(feat)
            new_val = new_features.get(feat)

            if old_val != new_val:
                change = self._calculate_change(old_val, new_val)
                diffs[feat] = {
                    "old": old_val,
                    "new": new_val,
                    "change": change,
                }

        return diffs

    def _extract_features_from_evidence(self, evidence_list: List[SampleEvidence]) -> Dict[str, Any]:
        features: Dict[str, Any] = {}
        for evidence in evidence_list:
            features.update(evidence.features)
        return features

    def _calculate_change(self, old_val: Any, new_val: Any) -> str:
        if isinstance(old_val, (int, float)) and isinstance(new_val, (int, float)):
            diff = new_val - old_val
            if old_val != 0:
                pct = (diff / old_val) * 100
                return f"{diff:+.4f} ({pct:+.2f}%)"
            return f"{diff:+.4f}"
        return f"{old_val} → {new_val}"

    def _collect_evidence_refs(
        self, new_record: SnapshotRecord, old_evidence: Optional[List[SampleEvidence]]
    ) -> List[str]:
        refs = []

        if old_evidence:
            for e in old_evidence:
                ref = f"旧证据: {e.evidence_id} (样本 {e.sample_id})"
                if e.source_url:
                    ref += f" - {e.source_url}"
                refs.append(ref)

        for e in new_record.evidence_chain:
            ref = f"新证据: {e.evidence_id} (样本 {e.sample_id})"
            if e.source_url:
                ref += f" - {e.source_url}"
            refs.append(ref)

        return refs

    def _calculate_confidence(
        self, feature_diffs: Dict[str, Dict[str, Any]], reasons: List[str]
    ) -> float:
        if not feature_diffs and len(reasons) <= 1:
            return 0.5

        confidence = 0.7

        if feature_diffs:
            confidence += min(0.15, len(feature_diffs) * 0.03)

        significant_changes = sum(
            1 for diff in feature_diffs.values()
            if isinstance(diff.get("old"), (int, float))
            and isinstance(diff.get("new"), (int, float))
            and abs(diff["new"] - diff["old"]) > 0.01
        )
        confidence += min(0.15, significant_changes * 0.05)

        return min(1.0, confidence)

    def _is_true_positive(self, score: float, threshold: float = 0.5) -> bool:
        return score >= threshold

    def _is_false_positive(self, score: float, threshold: float = 0.5) -> bool:
        return score < threshold
