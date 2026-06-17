from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import math

from models import (
    ModelOutput, ThresholdConfig, ThresholdDriftRecord,
    Attachment, BadDataRecord, JudgmentStatus
)


class ThresholdDriftDetector:
    def __init__(
        self,
        drift_sensitivity: float = 0.15,
        min_samples_for_drift: int = 5,
        lookback_window_hours: int = 24,
    ):
        self.drift_sensitivity = drift_sensitivity
        self.min_samples_for_drift = min_samples_for_drift
        self.lookback_window = timedelta(hours=lookback_window_hours)

    def _calculate_historical_stats(
        self,
        historical_outputs: List[ModelOutput],
        sample_product_line_map: Dict[str, str],
        sample_category_map: Dict[str, str],
        product_line: str,
        category: str,
    ) -> Tuple[float, float]:
        relevant = []
        for mo in historical_outputs:
            pl = sample_product_line_map.get(mo.sample_id)
            cat = sample_category_map.get(mo.sample_id)
            if pl == product_line and cat == category:
                relevant.append(mo)

        if len(relevant) < self.min_samples_for_drift:
            return 0.0, 1.0

        scores = [mo.model_score for mo in relevant]
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        std = math.sqrt(variance)
        return mean, std if std > 0 else 1.0

    def detect_drifts(
        self,
        current_outputs: List[ModelOutput],
        historical_outputs: List[ModelOutput],
        threshold_configs: List[ThresholdConfig],
        sample_product_line_map: Dict[str, str],
        sample_category_map: Dict[str, str],
    ) -> List[ThresholdDriftRecord]:
        drift_records: List[ThresholdDriftRecord] = []

        baseline_stats = defaultdict(lambda: (0.0, 1.0))
        for tc in threshold_configs:
            if tc.is_active:
                key = (tc.product_line, tc.category)
                mean, std = self._calculate_historical_stats(
                    historical_outputs,
                    sample_product_line_map,
                    sample_category_map,
                    tc.product_line,
                    tc.category
                )
                baseline_stats[key] = (mean, std)

        group_scores = defaultdict(list)
        for mo in current_outputs:
            pl = sample_product_line_map.get(mo.sample_id, "UNKNOWN")
            cat = sample_category_map.get(mo.sample_id, "UNKNOWN")
            group_scores[(pl, cat)].append(mo)

        for (pl, cat), outputs in group_scores.items():
            if len(outputs) < self.min_samples_for_drift:
                continue

            baseline_mean, baseline_std = baseline_stats.get((pl, cat), (0.0, 1.0))
            current_scores = [mo.model_score for mo in outputs]
            current_mean = sum(current_scores) / len(current_scores)

            drift_magnitude = abs(current_mean - baseline_mean) / baseline_std if baseline_std > 0 else 0.0

            if drift_magnitude >= self.drift_sensitivity:
                active_threshold = None
                for tc in threshold_configs:
                    if tc.product_line == pl and tc.category == cat and tc.is_active:
                        active_threshold = tc
                        break

                for mo in outputs:
                    drift = ThresholdDriftRecord(
                        sample_id=mo.sample_id,
                        product_line=pl,
                        category=cat,
                        current_threshold_version=active_threshold.version if active_threshold else "UNKNOWN",
                        drift_magnitude=drift_magnitude,
                        suggested_action="SUSPEND_FOR_REVIEW",
                        needs_operation_confirm=True,
                    )
                    drift_records.append(drift)

        return drift_records

    def detect_individual_drift(
        self,
        model_output: ModelOutput,
        baseline_mean: float,
        baseline_std: float,
        active_threshold: ThresholdConfig,
    ) -> Optional[ThresholdDriftRecord]:
        if baseline_std <= 0:
            return None

        drift_magnitude = abs(model_output.model_score - baseline_mean) / baseline_std

        if drift_magnitude >= self.drift_sensitivity:
            return ThresholdDriftRecord(
                sample_id=model_output.sample_id,
                product_line=active_threshold.product_line,
                category=active_threshold.category,
                current_threshold_version=active_threshold.version,
                drift_magnitude=drift_magnitude,
                suggested_action="SUSPEND_FOR_REVIEW",
                needs_operation_confirm=True,
            )
        return None


class LateAttachmentLinker:
    def __init__(self, late_arrival_window_hours: int = 48):
        self.late_window = timedelta(hours=late_arrival_window_hours)

    def identify_late_attachments(
        self,
        attachments: List[Attachment],
        sample_capture_times: Dict[str, datetime],
        judgment_times: Dict[str, datetime],
    ) -> List[Attachment]:
        late_attachments: List[Attachment] = []

        for att in attachments:
            if att.is_late_arrival:
                late_attachments.append(att)
                continue

            capture_time = sample_capture_times.get(att.sample_id)
            judgment_time = judgment_times.get(att.sample_id)

            if capture_time and judgment_time:
                if att.uploaded_at > judgment_time:
                    time_diff = att.uploaded_at - judgment_time
                    if time_diff <= self.late_window:
                        att.is_late_arrival = True
                        att.description += f" [晚到附件: 晚于判定时间 {time_diff.total_seconds() / 3600:.1f} 小时]"
                        late_attachments.append(att)

        return late_attachments

    def link_to_judgment(
        self,
        attachment: Attachment,
        current_judgment: JudgmentStatus,
        attachment_content_analysis: Optional[str] = None,
    ) -> Tuple[JudgmentStatus, str]:
        if not attachment.is_late_arrival:
            return current_judgment, ""

        reason = f"关联晚到附件 [{attachment.attachment_id}]: {attachment.description}"
        if attachment_content_analysis:
            reason += f" 附件分析: {attachment_content_analysis}"

        return current_judgment, reason


class BadDataDetector:
    def __init__(self):
        self.issue_types = {
            "INVALID_SCORE": "模型分数超出有效范围[0, 1]",
            "LOW_CONFIDENCE": "模型置信度过低",
            "MISSING_FIELDS": "模型输出缺少必要字段",
            "OUTLIER_SCORE": "模型分数为异常值",
            "INCONSISTENT_PREDICTION": "预测结果与分数不一致",
            "DUPLICATE_SAMPLE": "重复样本ID",
        }

    def detect_bad_data(
        self,
        model_outputs: List[ModelOutput],
        min_confidence: float = 0.5,
    ) -> List[BadDataRecord]:
        bad_records: List[BadDataRecord] = []
        seen_sample_ids = set()

        all_scores = [mo.model_score for mo in model_outputs]
        if len(all_scores) >= 4:
            sorted_scores = sorted(all_scores)
            q1 = sorted_scores[len(sorted_scores) // 4]
            q3 = sorted_scores[3 * len(sorted_scores) // 4]
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
        else:
            lower_bound = -float('inf')
            upper_bound = float('inf')

        for mo in model_outputs:
            issues = []

            if mo.sample_id in seen_sample_ids:
                issues.append(("DUPLICATE_SAMPLE", f"样本ID重复出现，原始行号: {mo.raw_line_number}"))
            seen_sample_ids.add(mo.sample_id)

            if mo.model_score < 0 or mo.model_score > 1:
                issues.append(("INVALID_SCORE", f"分数 {mo.model_score} 超出有效范围 [0, 1]"))

            if mo.confidence < min_confidence:
                issues.append(("LOW_CONFIDENCE", f"置信度 {mo.confidence:.4f} 低于阈值 {min_confidence}"))

            if mo.model_score < lower_bound or mo.model_score > upper_bound:
                issues.append(("OUTLIER_SCORE", f"分数 {mo.model_score:.4f} 为异常值 (范围: [{lower_bound:.4f}, {upper_bound:.4f}])"))

            expected_prediction = "PASS" if mo.model_score >= 0.5 else "FAIL"
            if mo.model_prediction.upper() != expected_prediction:
                issues.append(("INCONSISTENT_PREDICTION", f"预测结果 '{mo.model_prediction}' 与分数 {mo.model_score:.4f} 不一致，预期应为 '{expected_prediction}'"))

            raw_obj = mo.raw_object or {}
            required_fields = ['score', 'prediction', 'confidence']
            missing = [f for f in required_fields if f not in raw_obj]
            if missing:
                issues.append(("MISSING_FIELDS", f"原始对象缺少字段: {', '.join(missing)}"))

            for issue_type, desc in issues:
                severity = "error" if issue_type in ("INVALID_SCORE", "DUPLICATE_SAMPLE") else "warning"
                bad_records.append(BadDataRecord(
                    sample_id=mo.sample_id,
                    issue_type=issue_type,
                    description=f"{self.issue_types[issue_type]}: {desc}",
                    model_output_line=mo.raw_line_number,
                    model_object_ref=f"raw_object[{mo.sample_id}]",
                    severity=severity,
                ))

        return bad_records
