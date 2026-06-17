from typing import List, Dict
from collections import Counter
from models import (
    MultimodalSample,
    CheckResult,
    CheckIssue,
    SampleStatus,
    CheckType,
)


class MultimodalChecker:
    def __init__(
        self,
        bias_threshold: float = 0.3,
        min_category_count: int = 5,
    ):
        self.bias_threshold = bias_threshold
        self.min_category_count = min_category_count

    def _compute_status(self, issues: List[CheckIssue]) -> SampleStatus:
        if not issues:
            return SampleStatus.PASS
        severities = [i.severity for i in issues]
        if "高" in severities:
            return SampleStatus.FAIL
        return SampleStatus.PENDING

    def check_single_sample(
        self, sample: MultimodalSample
    ) -> CheckResult:
        issues: List[CheckIssue] = []

        if not sample.is_valid():
            issues.append(
                CheckIssue(
                    check_type=CheckType.BAD_DATA,
                    severity="高",
                    message="样本关键字段缺失或格式错误",
                    details={
                        "has_sample_id": bool(sample.sample_id),
                        "has_text": bool(sample.text_content),
                        "has_category": bool(sample.category),
                        "has_source": bool(sample.source),
                    },
                )
            )

        if not sample.has_image():
            issues.append(
                CheckIssue(
                    check_type=CheckType.MISSING_IMAGE,
                    severity="中",
                    message="多模态样本缺少图片资源",
                    details={
                        "image_count": len(sample.image_paths),
                        "image_paths": list(sample.image_paths),
                    },
                )
            )

        status = self._compute_status(issues)

        return CheckResult(
            sample_id=sample.sample_id,
            status=status,
            issues=issues,
            manual_note=sample.manual_note,
        )

    def check_dataset_bias(
        self, samples: List[MultimodalSample]
    ) -> Dict[str, List[CheckIssue]]:
        bias_issues: Dict[str, List[CheckIssue]] = {}

        category_counts = Counter(s.category for s in samples if s.category)
        if not category_counts:
            return bias_issues

        total = sum(category_counts.values())
        if total < self.min_category_count:
            return bias_issues

        expected_ratio = 1.0 / len(category_counts)

        for category, count in category_counts.items():
            actual_ratio = count / total
            deviation = abs(actual_ratio - expected_ratio)

            if deviation > self.bias_threshold:
                severity = (
                    "高" if deviation > self.bias_threshold * 2 else "中"
                )
                for sample in samples:
                    if sample.category != category:
                        continue
                    if sample.sample_id not in bias_issues:
                        bias_issues[sample.sample_id] = []
                    bias_issues[sample.sample_id].append(
                        CheckIssue(
                            check_type=CheckType.DATASET_BIAS,
                            severity=severity,
                            message="评测集类别分布偏科",
                            details={
                                "category": category,
                                "count": count,
                                "actual_ratio": round(actual_ratio, 4),
                                "expected_ratio": round(expected_ratio, 4),
                                "deviation": round(deviation, 4),
                                "threshold": self.bias_threshold,
                                "explanation": (
                                    f"该类别占比 {actual_ratio:.1%}，"
                                    f"与均匀分布预期 {expected_ratio:.1%} 相差 {deviation:.1%}，"
                                    f"超过阈值 {self.bias_threshold:.0%}，"
                                    "可能导致模型在该类别上过拟合或欠拟合，"
                                    "因此该样本已被标记为待确认，暂不放行。"
                                ),
                            },
                        )
                    )

        return bias_issues

    def check_all(
        self, samples: List[MultimodalSample]
    ) -> Dict[str, CheckResult]:
        results: Dict[str, CheckResult] = {}

        for sample in samples:
            results[sample.sample_id] = self.check_single_sample(sample)

        bias_issues = self.check_dataset_bias(samples)
        for sample_id, issues in bias_issues.items():
            if sample_id in results:
                results[sample_id].issues.extend(issues)

        for result in results.values():
            result.status = self._compute_status(result.issues)

        return results
