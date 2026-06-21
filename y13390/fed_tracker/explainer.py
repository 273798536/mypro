from typing import Dict, Any, Optional
from .models import TaskRecord, RecordIssue


class RevisionExplainer:
    def __init__(self):
        self.feature_weights = {
            "attachment_timeliness": 0.35,
            "data_integrity": 0.30,
            "model_version_diff": 0.25,
            "client_behavior": 0.10,
        }
        self.v2_improvements = {
            "threshold_correction": "v2 修正了 v1 中对延迟附件的宽松阈值（从 300s 收紧到 120s）",
            "alias_detection": "v2 新增版本别名识别规则，避免将旧文件索引误判为新任务",
            "feature_enrichment": "v2 补充了 3 项客户端行为特征，减少了 15% 的误判率",
            "confidence_calibration": "v2 对置信度 < 0.7 的样本强制走人工复核流程",
        }

    def explain_revision(self, record: TaskRecord) -> Dict[str, Any]:
        explanation = {
            "task_id": record.task_id,
            "old_model_prediction": record.old_model_prediction,
            "new_model_prediction": record.status.value,
            "model_version": record.model_version,
            "primary_reason": record.revision_reason or self._infer_reason(record),
            "evidence": self._collect_evidence(record),
            "improvement_note": self._get_improvement_note(record),
            "confidence_score": self._calculate_confidence(record),
        }
        return explanation

    def _infer_reason(self, record: TaskRecord) -> str:
        if RecordIssue.LATE_ATTACHMENT in record.issues:
            return f"附件延迟 {record.attachment_delay_seconds}s 超过 v2 阈值（120s）"
        if RecordIssue.VERSION_ALIAS in record.issues:
            return "检测到版本别名指向旧索引文件，不属于本次联邦任务"
        if RecordIssue.OLD_MODEL_MISJUDGE in record.issues:
            return "v1 模型在低置信度样本上的误判，v2 补充特征后修正"
        if RecordIssue.INVALID_FORMAT in record.issues:
            return "payload 字段结构校验失败，缺少 required 字段"
        return "多特征综合判定"

    def _collect_evidence(self, record: TaskRecord) -> Dict[str, Any]:
        evidence = {}
        if record.attachment_delay_seconds > 0:
            evidence["attachment_delay"] = {
                "value": f"{record.attachment_delay_seconds}s",
                "v1_threshold": "300s",
                "v2_threshold": "120s",
                "exceeded_by": f"{record.attachment_delay_seconds - 120}s",
            }
        if record.is_version_alias:
            payload = record.payload
            evidence["version_alias"] = {
                "original_ref": payload.get("refers_to", "unknown"),
                "file_age_days": payload.get("file_age_days", -1),
                "index_type": payload.get("index_type", "unknown"),
            }
        if record.old_model_prediction is not None:
            evidence["model_diff"] = {
                "v1_prediction": "通过" if record.old_model_prediction else "拦截",
                "v1_confidence": record.payload.get("v1_confidence", "n/a"),
                "v2_confidence": record.payload.get("v2_confidence", "n/a"),
                "added_features": record.payload.get("v2_new_features", []),
            }
        evidence["issues_detected"] = [i.value for i in record.issues]
        return evidence

    def _get_improvement_note(self, record: TaskRecord) -> str:
        if RecordIssue.LATE_ATTACHMENT in record.issues:
            return self.v2_improvements["threshold_correction"]
        if RecordIssue.VERSION_ALIAS in record.issues:
            return self.v2_improvements["alias_detection"]
        if RecordIssue.OLD_MODEL_MISJUDGE in record.issues:
            return self.v2_improvements["feature_enrichment"]
        if record.payload.get("v2_confidence", 1.0) < 0.7:
            return self.v2_improvements["confidence_calibration"]
        return "v2 模型综合优化结果"

    def _calculate_confidence(self, record: TaskRecord) -> float:
        score = 0.0
        if record.attachment_arrived:
            score += self.feature_weights["attachment_timeliness"]
        else:
            score += self.feature_weights["attachment_timeliness"] * 0.2

        has_format_issues = RecordIssue.INVALID_FORMAT in record.issues or RecordIssue.MISSING_REQUIRED in record.issues
        if not has_format_issues:
            score += self.feature_weights["data_integrity"]
        else:
            score += self.feature_weights["data_integrity"] * 0.3

        if record.model_version == "v2":
            score += self.feature_weights["model_version_diff"]

        client_score = 1.0 - (len(record.issues) * 0.15)
        score += self.feature_weights["client_behavior"] * max(client_score, 0.2)

        return round(score, 3)

    def format_explanation(self, explanation: Dict[str, Any]) -> str:
        lines = [
            f"  任务 {explanation['task_id']} 改判解释：",
            f"    模型版本: v1 → {explanation['model_version']}",
            f"    原判定: {'通过' if explanation['old_model_prediction'] else '拦截'}",
            f"    现判定: {explanation['new_model_prediction']}",
            f"    置信度: {explanation['confidence_score']}",
            f"    核心原因: {explanation['primary_reason']}",
            f"    版本改进: {explanation['improvement_note']}",
            "    证据链:",
        ]
        for key, value in explanation["evidence"].items():
            if isinstance(value, dict):
                lines.append(f"      {key}:")
                for k, v in value.items():
                    lines.append(f"        {k}: {v}")
            else:
                lines.append(f"      {key}: {value}")
        return "\n".join(lines)
