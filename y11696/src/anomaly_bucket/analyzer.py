from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Iterable

import numpy as np

from .models import (
    AnomalyLevel,
    AnomalyScore,
    HolidayRecord,
    MetricRecord,
    QuantileConfig,
    SeasonalConfig,
    TagConfig,
)


class MetricAnalyzer:
    def __init__(
        self,
        quantile_config: QuantileConfig | None = None,
        seasonal_config: SeasonalConfig | None = None,
        tag_config: TagConfig | None = None,
        holidays: list[HolidayRecord] | None = None,
    ):
        self.quantile_config = quantile_config or QuantileConfig()
        self.seasonal_config = seasonal_config or SeasonalConfig()
        self.tag_config = tag_config or TagConfig()
        self.holidays = {h.date: h for h in (holidays or [])}

        self._grouped_records: dict[str, list[MetricRecord]] = {}
        self._quantile_cache: dict[str, dict[str, float]] = {}
        self._seasonal_cache: dict[str, list[float]] = {}

    def analyze(
        self,
        records: Iterable[MetricRecord],
    ) -> dict[str, list[tuple[MetricRecord, AnomalyScore]]]:
        records = list(records)
        self._grouped_records = defaultdict(list)
        for r in records:
            self._grouped_records[r.metric_name].append(r)

        for metric in self._grouped_records:
            self._grouped_records[metric].sort(key=lambda r: r.date)

        results: dict[str, list[tuple[MetricRecord, AnomalyScore]]] = {}
        for metric, recs in self._grouped_records.items():
            results[metric] = self._analyze_metric(metric, recs)

        return results

    def _analyze_metric(
        self,
        metric: str,
        records: list[MetricRecord],
    ) -> list[tuple[MetricRecord, AnomalyScore]]:
        values = np.array([r.value for r in records], dtype=float)
        dates = [r.date for r in records]

        q_scores = self._calc_quantile_scores(metric, values)
        s_scores = self._calc_seasonal_scores(metric, values, dates)
        t_scores = self._calc_tag_scores(records)

        scored_records = []
        for i, rec in enumerate(records):
            qs = float(q_scores[i]) if i < len(q_scores) else 0.0
            ss = float(s_scores[i]) if i < len(s_scores) else 0.0
            ts = float(t_scores[i]) if i < len(t_scores) else 0.0

            if rec.date in self.holidays:
                qs *= 0.5
                ss *= 0.5

            composite = (qs * 0.4 + ss * 0.4 + ts * 0.2)
            level = self._score_to_level(composite)

            scored_records.append((
                rec,
                AnomalyScore(
                    quantile_score=qs,
                    seasonal_score=ss,
                    tag_score=ts,
                    composite_score=composite,
                    level=level,
                ),
            ))

        return scored_records

    def _calc_quantile_scores(
        self,
        metric: str,
        values: np.ndarray,
    ) -> np.ndarray:
        if len(values) < 5:
            return np.zeros(len(values))

        q = self.quantile_config
        upper = np.percentile(values, q.upper * 100)
        lower = np.percentile(values, q.lower * 100)
        extreme_upper = np.percentile(values, q.extreme_upper * 100)
        extreme_lower = np.percentile(values, q.extreme_lower * 100)
        median = np.percentile(values, 50)
        iqr = upper - lower
        if iqr == 0:
            iqr = 1.0

        scores = np.zeros(len(values))
        for i, v in enumerate(values):
            if v > extreme_upper:
                scores[i] = min(1.0, (v - extreme_upper) / iqr + 0.8)
            elif v > upper:
                scores[i] = 0.5 + 0.3 * (v - upper) / (extreme_upper - upper + 1e-9)
            elif v < extreme_lower:
                scores[i] = min(1.0, (extreme_lower - v) / iqr + 0.8)
            elif v < lower:
                scores[i] = 0.5 + 0.3 * (lower - v) / (lower - extreme_lower + 1e-9)
            else:
                dist_from_median = abs(v - median) / iqr
                scores[i] = max(0.0, 0.3 * dist_from_median)

        self._quantile_cache[metric] = {
            'upper': float(upper),
            'lower': float(lower),
            'extreme_upper': float(extreme_upper),
            'extreme_lower': float(extreme_lower),
            'median': float(median),
            'iqr': float(iqr),
        }
        return scores

    def _calc_seasonal_scores(
        self,
        metric: str,
        values: np.ndarray,
        dates: list[date],
    ) -> np.ndarray:
        config = self.seasonal_config
        window = config.window
        if len(values) < window * 2:
            return np.zeros(len(values))

        scores = np.zeros(len(values))
        for i in range(len(values)):
            start = max(0, i - window)
            end = min(len(values), i + window + 1)
            segment = np.concatenate([values[start:i], values[i + 1:end]])
            if len(segment) < 3:
                continue

            seg_mean = np.mean(segment)
            seg_std = np.std(segment, ddof=1)
            if seg_std < 1e-9:
                seg_std = 1.0

            z = abs(values[i] - seg_mean) / seg_std
            scores[i] = min(1.0, z / config.threshold)

        self._seasonal_cache[metric] = list(scores)
        return scores

    def _calc_tag_scores(
        self,
        records: list[MetricRecord],
    ) -> list[float]:
        tag_groups = self.tag_config.tag_groups
        conflict_tags = set(self.tag_config.conflict_tags)
        scores = []

        for rec in records:
            score = 0.0
            rec_tags = set(rec.tags)

            for group_name, group_tags in tag_groups.items():
                overlap = rec_tags.intersection(group_tags)
                if overlap:
                    score += 0.3 * len(overlap) / len(group_tags)

            if conflict_tags.intersection(rec_tags):
                score += 0.4

            scores.append(min(1.0, score))

        return scores

    def _score_to_level(self, score: float) -> AnomalyLevel:
        if score >= 0.8:
            return AnomalyLevel.SEVERE
        elif score >= 0.5:
            return AnomalyLevel.MODERATE
        elif score >= 0.2:
            return AnomalyLevel.MILD
        return AnomalyLevel.NORMAL

    def get_quantile_bounds(self, metric: str) -> dict[str, float] | None:
        return self._quantile_cache.get(metric)

    def get_seasonal_scores(self, metric: str) -> list[float] | None:
        return self._seasonal_cache.get(metric)

    def build_explanation(
        self,
        record: MetricRecord,
        score: AnomalyScore,
    ) -> list[str]:
        reasons = []

        q_bounds = self._quantile_cache.get(record.metric_name, {})
        if score.quantile_score >= 0.2:
            if record.value > q_bounds.get('upper', float('inf')):
                reasons.append(
                    f'分位异常: 值 {record.value:.2f} 超过上四分位 '
                    f'{q_bounds.get("upper", 0):.2f}'
                )
            elif record.value < q_bounds.get('lower', float('-inf')):
                reasons.append(
                    f'分位异常: 值 {record.value:.2f} 低于下四分位 '
                    f'{q_bounds.get("lower", 0):.2f}'
                )

        if score.seasonal_score >= 0.2:
            reasons.append(
                f'季节异常: 偏离局部均值 {score.seasonal_score:.1%}'
            )

        if score.tag_score >= 0.2:
            tag_hits = [t for t in record.tags if t in self._get_all_risk_tags()]
            if tag_hits:
                reasons.append(f'标签风险: 命中风险标签 {", ".join(tag_hits)}')

        if record.date in self.holidays:
            h = self.holidays[record.date]
            reasons.append(f'节假日 [{h.name}] 影响: 分数已折减50%')

        if not reasons:
            reasons.append('正常范围: 各维度均在正常区间内')

        return reasons

    def _get_all_risk_tags(self) -> set[str]:
        tags = set(self.tag_config.conflict_tags)
        for group_tags in self.tag_config.tag_groups.values():
            tags.update(group_tags)
        return tags
