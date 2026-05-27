from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Iterable

from .models import (
    AnomalyLevel,
    AnomalyScore,
    BucketAssignment,
    BucketCategory,
    CorrectionTrace,
    HolidayRecord,
    MetricRecord,
    QuantileConfig,
)


class BucketAssigner:
    def __init__(
        self,
        quantile_config: QuantileConfig | None = None,
        holidays: list[HolidayRecord] | None = None,
    ):
        self.quantile_config = quantile_config or QuantileConfig()
        self.holidays = {h.date: h for h in (holidays or [])}
        self._corrections: list[CorrectionTrace] = []
        self._assignments: list[BucketAssignment] = []

    def assign(
        self,
        scored_records: Iterable[tuple[MetricRecord, AnomalyScore]],
        analyzer,
    ) -> list[BucketAssignment]:
        self._assignments.clear()

        for rec, score in scored_records:
            if score.level == AnomalyLevel.NORMAL:
                continue

            assignments = self._assign_to_buckets(rec, score, analyzer)
            self._assignments.extend(assignments)

        return self._assignments

    def _assign_to_buckets(
        self,
        record: MetricRecord,
        score: AnomalyScore,
        analyzer,
    ) -> list[BucketAssignment]:
        assignments = []
        reasons_base = analyzer.build_explanation(record, score)
        source_traces = self._build_source_traces(record)

        if score.quantile_score >= 0.2:
            bucket_name = self._quantile_bucket_name(record, analyzer)
            assignments.append(BucketAssignment(
                record_date=record.date,
                metric_name=record.metric_name,
                category=BucketCategory.QUANTILE,
                bucket_name=bucket_name,
                score=score.quantile_score,
                level=score.level,
                reasons=[r for r in reasons_base if '分位' in r],
                source_traces=source_traces,
            ))

        if score.seasonal_score >= 0.2:
            bucket_name = self._seasonal_bucket_name(score.seasonal_score)
            assignments.append(BucketAssignment(
                record_date=record.date,
                metric_name=record.metric_name,
                category=BucketCategory.SEASONAL,
                bucket_name=bucket_name,
                score=score.seasonal_score,
                level=score.level,
                reasons=[r for r in reasons_base if '季节' in r],
                source_traces=source_traces,
            ))

        if score.tag_score >= 0.2 and record.tags:
            risk_tags = [
                t for t in record.tags
                if t in analyzer._get_all_risk_tags()
            ]
            if risk_tags:
                bucket_name = f'标签-{"/".join(risk_tags[:3])}'
                assignments.append(BucketAssignment(
                    record_date=record.date,
                    metric_name=record.metric_name,
                    category=BucketCategory.BUSINESS_TAG,
                    bucket_name=bucket_name,
                    score=score.tag_score,
                    level=score.level,
                    reasons=[r for r in reasons_base if '标签' in r],
                    source_traces=source_traces,
                ))

        if not assignments:
            assignments.append(BucketAssignment(
                record_date=record.date,
                metric_name=record.metric_name,
                category=BucketCategory.QUANTILE,
                bucket_name=f'综合异常-{score.level.value}',
                score=score.composite_score,
                level=score.level,
                reasons=reasons_base,
                source_traces=source_traces,
            ))

        return assignments

    def _quantile_bucket_name(
        self,
        record: MetricRecord,
        analyzer,
    ) -> str:
        q_bounds = analyzer.get_quantile_bounds(record.metric_name) or {}
        upper = q_bounds.get('upper', float('inf'))
        extreme_upper = q_bounds.get('extreme_upper', float('inf'))
        lower = q_bounds.get('lower', float('-inf'))
        extreme_lower = q_bounds.get('extreme_lower', float('-inf'))

        if record.value > extreme_upper:
            return '极端高值-Q99+'
        elif record.value > upper:
            return '偏高值-Q95~Q99'
        elif record.value < extreme_lower:
            return '极端低值-Q01-'
        elif record.value < lower:
            return '偏低值-Q01~Q05'
        return '分位偏移'

    def _seasonal_bucket_name(self, seasonal_score: float) -> str:
        if seasonal_score >= 0.8:
            return '强季节偏离'
        elif seasonal_score >= 0.5:
            return '中季节偏离'
        return '弱季节偏离'

    def _build_source_traces(self, record: MetricRecord) -> list[str]:
        traces = [f'数据源: {record.source or "未标注"}']
        if record.remark:
            traces.append(f'备注: {record.remark}')
        if record.date in self.holidays:
            h = self.holidays[record.date]
            traces.append(f'节假日标记: {h.name}({h.impact})')
        return traces

    def apply_correction(
        self,
        index: int,
        field: str,
        old_value: str,
        new_value: str,
        reason: str = '',
        operator: str = 'analyst',
    ) -> CorrectionTrace:
        if 0 <= index < len(self._assignments):
            old_assignment = self._assignments[index]
            if field == 'bucket_name':
                self._assignments[index] = BucketAssignment(
                    record_date=old_assignment.record_date,
                    metric_name=old_assignment.metric_name,
                    category=old_assignment.category,
                    bucket_name=new_value,
                    score=old_assignment.score,
                    level=old_assignment.level,
                    reasons=old_assignment.reasons,
                    source_traces=old_assignment.source_traces,
                )
            elif field == 'level':
                self._assignments[index] = BucketAssignment(
                    record_date=old_assignment.record_date,
                    metric_name=old_assignment.metric_name,
                    category=old_assignment.category,
                    bucket_name=old_assignment.bucket_name,
                    score=old_assignment.score,
                    level=AnomalyLevel(new_value),
                    reasons=old_assignment.reasons,
                    source_traces=old_assignment.source_traces,
                )

        trace = CorrectionTrace(
            timestamp=datetime.now(),
            field=field,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            operator=operator,
        )
        self._corrections.append(trace)
        return trace

    def get_corrections(self) -> list[CorrectionTrace]:
        return list(self._corrections)

    def get_assignments(self) -> list[BucketAssignment]:
        return list(self._assignments)

    def group_by_category(
        self,
    ) -> dict[BucketCategory, list[BucketAssignment]]:
        grouped: dict[BucketCategory, list[BucketAssignment]] = defaultdict(list)
        for a in self._assignments:
            grouped[a.category].append(a)
        return dict(grouped)

    def group_by_bucket(
        self,
    ) -> dict[str, list[BucketAssignment]]:
        grouped: dict[str, list[BucketAssignment]] = defaultdict(list)
        for a in self._assignments:
            key = f'{a.category.value}:{a.bucket_name}'
            grouped[key].append(a)
        return dict(grouped)
