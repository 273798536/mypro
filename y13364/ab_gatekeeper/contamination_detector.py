import re
import hashlib
from typing import List, Dict, Tuple, Set, Any
from collections import Counter

from .models import Sample, SampleSource, SampleStatus, generate_id


class ContaminationDetector:
    TRAIN_KEYWORDS = {
        "训练", "train", "training", "fit", "learn", "优化", "optim",
        "epoch", "batch", "梯度", "gradient", "反向传播", "backprop",
        "学习率", "learning_rate", "loss下降", "收敛", "converge",
        "过拟合", "overfit",
    }
    LABEL_LEAK_PATTERNS = [
        r"label.*train", r"train.*label", r"ground.?truth.*train",
        r"验证集.*包含.*训练", r"train.*data.*in.*val", r"leak",
        r"数据泄露", r"标签泄露",
    ]
    SIMILARITY_THRESHOLD = 0.85
    MIN_TEXT_LENGTH = 20

    def __init__(self):
        self.detected_issues: List[Dict[str, Any]] = []
        self.contaminated_sample_ids: Set[str] = set()
        self.contamination_reasons: Dict[str, List[str]] = {}
        self.training_contents: List[Tuple[str, str]] = []

    def _text_fingerprint(self, text: str) -> str:
        cleaned = re.sub(r"\s+", "", text.lower())
        cleaned = re.sub(r"[^\w\u4e00-\u9fff]", "", cleaned)
        return hashlib.md5(cleaned.encode("utf-8")).hexdigest()

    def _ngrams(self, text: str, n: int = 3) -> Set[str]:
        cleaned = re.sub(r"\s+", "", text.lower())
        if len(cleaned) < n:
            return {cleaned}
        return {cleaned[i:i + n] for i in range(len(cleaned) - n + 1)}

    def _similarity(self, t1: str, t2: str) -> float:
        g1 = self._ngrams(t1)
        g2 = self._ngrams(t2)
        if not g1 or not g2:
            return 0.0
        inter = len(g1 & g2)
        union = len(g1 | g2)
        return inter / union if union > 0 else 0.0

    def _contains_training_indicator(self, text: str, metadata: Dict[str, Any]) -> bool:
        text_lower = text.lower()
        for kw in self.TRAIN_KEYWORDS:
            if kw.lower() in text_lower:
                return True
        for v in metadata.values():
            if isinstance(v, str) and any(kw.lower() in v.lower() for kw in self.TRAIN_KEYWORDS):
                return True
        return False

    def _check_label_leak(self, sample: Sample) -> bool:
        text = sample.content.lower()
        for pattern in self.LABEL_LEAK_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        meta_str = str(sample.raw_metadata).lower()
        for pattern in self.LABEL_LEAK_PATTERNS:
            if re.search(pattern, meta_str, re.IGNORECASE):
                return True
        return False

    def _detect_cross_duplication(self, samples: List[Sample]) -> List[Dict[str, Any]]:
        issues = []
        val_samples = [s for s in samples if s.source == SampleSource.VALIDATION_SET]
        train_samples = [s for s in samples if s.source in (
            SampleSource.TRAIN_LOG_CURRENT, SampleSource.TRAIN_LOG_OLD
        )]

        val_fps = {}
        for vs in val_samples:
            if len(vs.content) >= self.MIN_TEXT_LENGTH:
                fp = self._text_fingerprint(vs.content)
                if fp not in val_fps:
                    val_fps[fp] = []
                val_fps[fp].append(vs)

        train_fps = {}
        for ts in train_samples:
            if len(ts.content) >= self.MIN_TEXT_LENGTH:
                fp = self._text_fingerprint(ts.content)
                if fp not in train_fps:
                    train_fps[fp] = []
                train_fps[fp].append(ts)

        for fp, val_list in val_fps.items():
            if fp in train_fps:
                train_list = train_fps[fp]
                for vs in val_list:
                    for ts in train_list:
                        if vs.sample_id != ts.sample_id:
                            issues.append({
                                "type": "exact_duplicate",
                                "severity": "high",
                                "validation_sample_id": vs.sample_id,
                                "training_sample_id": ts.sample_id,
                                "validation_task": vs.task_id,
                                "training_task": ts.task_id,
                                "detail": "验证集样本与训练样本完全重复，指纹一致",
                            })
                            self.contaminated_sample_ids.add(vs.sample_id)
                            reason = f"与训练样本[{ts.sample_id}]完全重复(任务{ts.task_id})"
                            if vs.sample_id not in self.contamination_reasons:
                                self.contamination_reasons[vs.sample_id] = []
                            self.contamination_reasons[vs.sample_id].append(reason)

        for vs in val_samples:
            if len(vs.content) < self.MIN_TEXT_LENGTH:
                continue
            if vs.sample_id in self.contaminated_sample_ids:
                continue
            for ts in train_samples:
                if len(ts.content) < self.MIN_TEXT_LENGTH:
                    continue
                sim = self._similarity(vs.content, ts.content)
                if sim >= self.SIMILARITY_THRESHOLD:
                    issues.append({
                        "type": "high_similarity",
                        "severity": "medium",
                        "validation_sample_id": vs.sample_id,
                        "training_sample_id": ts.sample_id,
                        "similarity": round(sim, 4),
                        "validation_task": vs.task_id,
                        "training_task": ts.task_id,
                        "detail": f"验证集样本与训练样本高度相似(相似度{round(sim, 4)})",
                    })
                    self.contaminated_sample_ids.add(vs.sample_id)
                    reason = f"与训练样本[{ts.sample_id}]高度相似(相似度{round(sim, 4)})"
                    if vs.sample_id not in self.contamination_reasons:
                        self.contamination_reasons[vs.sample_id] = []
                    self.contamination_reasons[vs.sample_id].append(reason)

        return issues

    def detect(self, samples: List[Sample]) -> Dict[str, Any]:
        self.detected_issues = []
        self.contaminated_sample_ids.clear()
        self.contamination_reasons.clear()

        val_samples = [s for s in samples if s.source == SampleSource.VALIDATION_SET]

        for vs in val_samples:
            if self._contains_training_indicator(vs.content, vs.raw_metadata):
                self.detected_issues.append({
                    "type": "training_keyword",
                    "severity": "high",
                    "validation_sample_id": vs.sample_id,
                    "task_id": vs.task_id,
                    "detail": "验证集样本内容包含训练过程关键词，疑似训练数据混入",
                })
                self.contaminated_sample_ids.add(vs.sample_id)
                reason = "内容包含训练过程关键词"
                if vs.sample_id not in self.contamination_reasons:
                    self.contamination_reasons[vs.sample_id] = []
                self.contamination_reasons[vs.sample_id].append(reason)

        for vs in val_samples:
            if self._check_label_leak(vs):
                self.detected_issues.append({
                    "type": "label_leakage",
                    "severity": "critical",
                    "validation_sample_id": vs.sample_id,
                    "task_id": vs.task_id,
                    "detail": "验证集样本检测到标签泄露特征",
                })
                self.contaminated_sample_ids.add(vs.sample_id)
                reason = "检测到标签泄露特征"
                if vs.sample_id not in self.contamination_reasons:
                    self.contamination_reasons[vs.sample_id] = []
                self.contamination_reasons[vs.sample_id].append(reason)

        dup_issues = self._detect_cross_duplication(samples)
        self.detected_issues.extend(dup_issues)

        for s in samples:
            if s.sample_id in self.contaminated_sample_ids:
                s.is_contaminated = True
                s.contamination_reason = "; ".join(
                    self.contamination_reasons.get(s.sample_id, [])
                )
                s.status = SampleStatus.CONTAMINATED

        severity_count = Counter(i.get("severity", "unknown") for i in self.detected_issues)
        type_count = Counter(i.get("type", "unknown") for i in self.detected_issues)

        report = {
            "total_validation_samples": len(val_samples),
            "contaminated_count": len(self.contaminated_sample_ids),
            "contamination_rate": (
                round(len(self.contaminated_sample_ids) / len(val_samples), 4)
                if val_samples else 0.0
            ),
            "issues_count": len(self.detected_issues),
            "severity_distribution": dict(severity_count),
            "type_distribution": dict(type_count),
            "contaminated_sample_ids": list(self.contaminated_sample_ids),
            "contamination_details": self.detected_issues,
            "is_blocking": len(self.contaminated_sample_ids) > 0 and (
                severity_count.get("critical", 0) > 0 or
                severity_count.get("high", 0) >= 2
            ),
            "needs_manual_confirmation": len(self.contaminated_sample_ids) > 0,
            "manual_confirmation_reason": self._build_confirmation_reason(severity_count),
            "next_steps": self._build_next_steps(severity_count),
        }
        return report

    def _build_confirmation_reason(self, severity_count: Counter) -> str:
        parts = []
        if severity_count.get("critical", 0) > 0:
            parts.append(f"发现{severity_count['critical']}例严重标签泄露")
        if severity_count.get("high", 0) > 0:
            parts.append(f"发现{severity_count['high']}例训练关键词/完全重复")
        if severity_count.get("medium", 0) > 0:
            parts.append(f"发现{severity_count['medium']}例高度相似样本")
        return "验证集存在污染风险：" + "；".join(parts)

    def _build_next_steps(self, severity_count: Counter) -> List[str]:
        steps = []
        if severity_count.get("critical", 0) > 0:
            steps.append("【紧急】排查标签泄露来源，确认验证集构建流程是否引入训练标签信息")
            steps.append("隔离所有受影响样本，重新构建无泄露的验证集")
        if severity_count.get("high", 0) > 0:
            steps.append("排查验证集与训练集的数据划分逻辑，修复重复数据问题")
            steps.append("核对数据指纹生成规则，确认是否存在切分bug")
        if severity_count.get("medium", 0) > 0:
            steps.append("人工复核高度相似样本，判断是否属于同源近重复导致的数据泄露")
            steps.append("评估相似样本对指标的影响程度，决定是否剔除")
        if steps:
            steps.append("修复后重新执行守门流程，确认污染报告清零")
        else:
            steps.append("验证集通过污染检测，可进入下一环节")
        return steps

    def get_contaminated_samples(self, samples: List[Sample]) -> List[Sample]:
        return [s for s in samples if s.sample_id in self.contaminated_sample_ids]
