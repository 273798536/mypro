from typing import List, Dict, Optional
from collections import defaultdict

from .models import (
    SampleRecord, ReviewMetric, MetricDetail, DashboardSummary,
    FilterCriteria, ReviewStatus, SourceType
)
from .parser import filter_samples


class MetricsCalculator:
    """指标计算引擎"""

    def calculate(self, samples: List[SampleRecord]) -> ReviewMetric:
        """计算审查指标"""
        if not samples:
            return ReviewMetric()

        total = len(samples)
        pass_count = sum(1 for s in samples if s.status == ReviewStatus.PASS)
        fail_count = sum(1 for s in samples if s.status == ReviewStatus.FAIL)
        pending_count = sum(1 for s in samples if s.status == ReviewStatus.PENDING)
        duplicate_count = sum(1 for s in samples if s.is_duplicate)

        missing_ref_samples = [s for s in samples if s.missing_references]
        missing_ref_count = len(missing_ref_samples)

        total_refs = sum(len(s.references) for s in samples)
        avg_refs = total_refs / total if total > 0 else 0

        return ReviewMetric(
            total_samples=total,
            pass_count=pass_count,
            fail_count=fail_count,
            pending_count=pending_count,
            duplicate_count=duplicate_count,
            pass_rate=round(pass_count / total * 100, 2) if total > 0 else 0,
            missing_ref_count=missing_ref_count,
            missing_ref_rate=round(missing_ref_count / total * 100, 2) if total > 0 else 0,
            avg_refs_per_sample=round(avg_refs, 2)
        )

    def calculate_detail(self, samples: List[SampleRecord], top_n: int = 10) -> MetricDetail:
        """计算详细指标，包含影响最大的样本"""
        metric = self.calculate(samples)

        influential = self._get_influential_samples(samples, top_n)
        duplicates = [s for s in samples if s.is_duplicate]
        missing_ref = [s for s in samples if s.missing_references]

        return MetricDetail(
            metric=metric,
            top_influential_samples=influential,
            duplicate_samples=duplicates,
            missing_ref_samples=missing_ref
        )

    def _get_influential_samples(self, samples: List[SampleRecord], top_n: int) -> List[SampleRecord]:
        """获取对结论影响最大的样本（拉低通过率的）"""
        scored = []
        for s in samples:
            score = 0

            if s.status == ReviewStatus.FAIL:
                score += 10
            if s.missing_references:
                score += len(s.missing_references) * 3
            if s.is_duplicate:
                score += 5
            if s.status == ReviewStatus.PENDING:
                score += 2

            scored.append((score, s))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored[:top_n] if _ > 0]

    def calculate_by_version(self, samples: List[SampleRecord]) -> Dict[str, ReviewMetric]:
        """按版本分组计算指标"""
        by_version = defaultdict(list)
        for s in samples:
            by_version[s.review_version].append(s)
        return {v: self.calculate(s_list) for v, s_list in by_version.items()}

    def calculate_by_category(self, samples: List[SampleRecord]) -> Dict[str, ReviewMetric]:
        """按分类分组计算指标"""
        by_category = defaultdict(list)
        for s in samples:
            cat = s.category or "未分类"
            by_category[cat].append(s)
        return {c: self.calculate(s_list) for c, s_list in by_category.items()}

    def calculate_by_source_type(self, samples: List[SampleRecord]) -> Dict[str, ReviewMetric]:
        """按来源类型分组计算指标"""
        by_source = defaultdict(list)
        for s in samples:
            by_source[s.source_type.value].append(s)
        return {st: self.calculate(s_list) for st, s_list in by_source.items()}

    def get_dashboard_summary(
        self,
        samples: List[SampleRecord],
        criteria: Optional[FilterCriteria] = None
    ) -> DashboardSummary:
        """获取看板汇总数据"""
        if criteria:
            filtered = filter_samples(samples, criteria)
        else:
            filtered = samples

        versions = sorted(set(s.review_version for s in samples))
        categories = sorted(set(s.category or "未分类" for s in samples))
        source_types = list(set(s.source_type for s in samples))

        return DashboardSummary(
            versions=versions,
            categories=categories,
            source_types=source_types,
            overall_metric=self.calculate(filtered),
            by_version=self.calculate_by_version(filtered),
            by_category=self.calculate_by_category(filtered),
            by_source_type=self.calculate_by_source_type(filtered)
        )


metrics_calculator = MetricsCalculator()
