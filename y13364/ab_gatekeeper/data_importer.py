import json
import os
import re
from typing import List, Dict, Any, Tuple
from datetime import datetime

from .models import (
    Sample, SampleSource, SampleStatus, MetricSnapshot,
    generate_id,
)


class SourceClassifier:
    OLD_LOG_PATTERNS = [
        r"旧版", r"v1\.", r"legacy", r"deprecated", r"previous_version",
        r"历史版本", r"2024-", r"2023-",
    ]
    WITHDRAW_PATTERNS = [
        r"撤回", r"withdraw", r"rollback", r"撤销", r"回滚",
        r"取消发布", r"revoke",
    ]
    VERBAL_PATTERNS = [
        r"口头", r"备注", r"口头上", r"说过", r"提过",
        r"小许说", r"算法同学", r"verbal", r"note",
    ]
    VALIDATION_PATTERNS = [
        r"验证集", r"validation", r"val_set", r"eval_set",
        r"评估集", r"测试集_验证",
    ]
    MISCLASSIFIED_PATTERNS = [
        r"误判", r"回检", r"旧模型误判", r"misclassified",
        r"错分样本", r"false_positive", r"false_negative",
    ]

    @classmethod
    def classify(cls, content: str, metadata: Dict[str, Any] = None) -> SampleSource:
        text = content.lower()
        if metadata:
            for key, val in metadata.items():
                if isinstance(val, str):
                    text += " " + val.lower()

        for pattern in cls.MISCLASSIFIED_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SampleSource.MISCLASSIFIED_RETURN

        for pattern in cls.WITHDRAW_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SampleSource.WITHDRAW_RECORD

        for pattern in cls.VERBAL_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SampleSource.VERBAL_NOTE

        for pattern in cls.VALIDATION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SampleSource.VALIDATION_SET

        for pattern in cls.OLD_LOG_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SampleSource.TRAIN_LOG_OLD

        return SampleSource.TRAIN_LOG_CURRENT

    @classmethod
    def extract_metrics(cls, text: str) -> MetricSnapshot:
        metrics = MetricSnapshot()
        patterns = {
            "auc": r"auc[=:\s]+([\d.]+)",
            "accuracy": r"(?:acc|accuracy)[=:\s]+([\d.]+)",
            "precision": r"(?:precision|prec)[=:\s]+([\d.]+)",
            "recall": r"recall[=:\s]+([\d.]+)",
            "f1": r"f1[=:\s]+([\d.]+)",
            "loss": r"(?:loss|交叉熵)[=:\s]+([\d.]+)",
        }
        for key, pattern in patterns.items():
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                try:
                    val = float(m.group(1))
                    if val <= 1.0:
                        setattr(metrics, key, val)
                    else:
                        setattr(metrics, key, val / 100.0)
                except ValueError:
                    pass

        custom_matches = re.findall(r"(\w+)[=:\s]+([\d.]+)", text)
        reserved = {"auc", "acc", "accuracy", "precision", "prec", "recall", "f1", "loss"}
        for k, v in custom_matches:
            if k.lower() not in reserved:
                try:
                    fval = float(v)
                    if fval <= 1.0:
                        metrics.custom_metrics[k] = fval
                    else:
                        metrics.custom_metrics[k] = fval / 100.0
                except ValueError:
                    pass
        return metrics

    @classmethod
    def extract_labels(cls, text: str) -> Tuple[Any, Any, Any]:
        orig_label = pred_label = score = None

        m = re.search(r"(?:标签|label|ground.?truth)[=:\s]+['\"]?(\w+)['\"]?", text, re.IGNORECASE)
        if m:
            orig_label = m.group(1)

        m = re.search(r"(?:预测|pred(?:ict)?|infer)[=:\s]+['\"]?(\w+)['\"]?", text, re.IGNORECASE)
        if m:
            pred_label = m.group(1)

        m = re.search(r"(?:置信度|score|confidence|prob)[=:\s]+([\d.]+)", text, re.IGNORECASE)
        if m:
            try:
                score = float(m.group(1))
                if score > 1.0:
                    score = score / 100.0
            except ValueError:
                pass

        return orig_label, pred_label, score

    @classmethod
    def extract_old_model_info(cls, text: str) -> Tuple[Any, Any]:
        old_pred = old_score = None
        m = re.search(r"(?:旧模型|old.?model).*?(?:预测|pred)[=:\s]+['\"]?(\w+)['\"]?", text, re.IGNORECASE | re.DOTALL)
        if m:
            old_pred = m.group(1)
        m = re.search(r"(?:旧模型|old.?model).*?(?:置信度|score)[=:\s]+([\d.]+)", text, re.IGNORECASE | re.DOTALL)
        if m:
            try:
                old_score = float(m.group(1))
                if old_score > 1.0:
                    old_score = old_score / 100.0
            except ValueError:
                pass
        return old_pred, old_score


class DataImporter:
    def __init__(self):
        self.samples: List[Sample] = []
        self.source_stats: Dict[str, int] = {}

    def import_from_dict(self, raw_data: Dict[str, Any]) -> Sample:
        content = raw_data.get("content", raw_data.get("text", ""))
        metadata = raw_data.get("metadata", {})
        timestamp = raw_data.get("timestamp", raw_data.get("time", datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        task_id = raw_data.get("task_id", raw_data.get("task", "unknown_task"))

        forced_source = raw_data.get("source")
        if forced_source:
            if isinstance(forced_source, SampleSource):
                source = forced_source
            else:
                source_map = {s.value: s for s in SampleSource}
                source = source_map.get(forced_source, SourceClassifier.classify(content, metadata))
        else:
            source = SourceClassifier.classify(content, metadata)

        metrics = SourceClassifier.extract_metrics(content)
        orig_label, pred_label, score = SourceClassifier.extract_labels(content)

        for k, v in metadata.items():
            if isinstance(v, dict) and "auc" in v:
                for mk in ["auc", "accuracy", "precision", "recall", "f1", "loss"]:
                    if mk in v and getattr(metrics, mk) is None:
                        setattr(metrics, mk, v[mk])

        is_misclassified = (source == SampleSource.MISCLASSIFIED_RETURN)
        old_pred, old_score = (None, None)
        if is_misclassified:
            old_pred, old_score = SourceClassifier.extract_old_model_info(content)
            if "old_prediction" in metadata:
                old_pred = metadata["old_prediction"]
            if "old_score" in metadata:
                old_score = metadata["old_score"]

        sample = Sample(
            sample_id=raw_data.get("sample_id", generate_id("smp")),
            source=source,
            content=content,
            timestamp=timestamp,
            task_id=task_id,
            status=SampleStatus.PENDING,
            original_label=orig_label if orig_label else metadata.get("label"),
            predicted_label=pred_label if pred_label else metadata.get("prediction"),
            prediction_score=score if score else metadata.get("score"),
            metrics=metrics,
            raw_metadata=metadata,
            is_misclassified_return=is_misclassified,
            old_model_prediction=old_pred,
            old_model_score=old_score,
        )

        key = source.value
        self.source_stats[key] = self.source_stats.get(key, 0) + 1
        self.samples.append(sample)
        return sample

    def import_batch(self, raw_list: List[Dict[str, Any]]) -> List[Sample]:
        return [self.import_from_dict(item) for item in raw_list]

    def import_json_file(self, file_path: str) -> List[Sample]:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return self.import_batch(data)
        elif isinstance(data, dict):
            if "samples" in data:
                return self.import_batch(data["samples"])
            else:
                return [self.import_from_dict(data)]
        return []

    def import_training_logs(self, log_dir: str) -> List[Sample]:
        samples = []
        if not os.path.exists(log_dir):
            return samples
        for fname in sorted(os.listdir(log_dir)):
            if fname.endswith(".json") or fname.endswith(".jsonl"):
                fpath = os.path.join(log_dir, fname)
                samples.extend(self.import_json_file(fpath))
        return samples

    def get_source_distribution(self) -> Dict[str, int]:
        return dict(self.source_stats)

    def get_samples_by_source(self, source: SampleSource) -> List[Sample]:
        return [s for s in self.samples if s.source == source]

    def get_all_samples(self) -> List[Sample]:
        return list(self.samples)
