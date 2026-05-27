from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Iterable

from .models import (
    HolidayRecord,
    MetricRecord,
    TagConfig,
    ValidationIssue,
    WarningType,
)

MIN_SERIES_LENGTH = 14
SHORT_SERIES_THRESHOLD = 7


class InputValidator:
    def __init__(
        self,
        tag_config: TagConfig | None = None,
        min_series_length: int = MIN_SERIES_LENGTH,
    ):
        self.tag_config = tag_config or TagConfig()
        self.min_series_length = min_series_length
        self.issues: list[ValidationIssue] = []

    def validate(
        self,
        records: Iterable[MetricRecord],
        holidays: Iterable[HolidayRecord] | None = None,
    ) -> list[ValidationIssue]:
        self.issues.clear()
        records = list(records)
        holidays = list(holidays) if holidays else []

        if not records:
            self.issues.append(ValidationIssue(
                warning_type=WarningType.MISSING_DATA,
                message='输入记录为空，无法进行分析',
                severity='error',
            ))
            return self.issues

        self._check_duplicate_dates(records)
        self._check_short_series(records)
        self._check_tag_conflicts(records)
        self._check_holiday_overlap(records, holidays)
        self._check_value_validity(records)

        return self.issues

    def _check_duplicate_dates(self, records: list[MetricRecord]):
        date_groups: dict[tuple[str, str], list[MetricRecord]] = defaultdict(list)
        for r in records:
            key = (r.metric_name, r.date.isoformat())
            date_groups[key].append(r)

        duplicates = {k: v for k, v in date_groups.items() if len(v) > 1}
        if duplicates:
            affected = [f'{k[0]}@{k[1]}({len(v)}条)' for k, v in duplicates.items()]
            self.issues.append(ValidationIssue(
                warning_type=WarningType.MISSING_DATA,
                message=f'发现 {len(duplicates)} 组重复日期记录，仅保留首条',
                affected_records=affected,
                severity='warn',
            ))

    def _check_short_series(self, records: list[MetricRecord]):
        by_metric: dict[str, list[MetricRecord]] = defaultdict(list)
        for r in records:
            by_metric[r.metric_name].append(r)

        for metric, recs in by_metric.items():
            count = len(recs)
            if count < self.min_series_length:
                severity = 'error' if count < SHORT_SERIES_THRESHOLD else 'warn'
                msg = (
                    f'指标 [{metric}] 仅 {count} 条记录，'
                    f'低于最低要求 {self.min_series_length} 条，'
                    + ('统计结果可靠性极低' if count < SHORT_SERIES_THRESHOLD
                       else '统计结果可能存在偏差')
                )
                self.issues.append(ValidationIssue(
                    warning_type=WarningType.SHORT_SERIES,
                    message=msg,
                    affected_records=[f'{metric}({count}条)'],
                    severity=severity,
                ))

    def _check_tag_conflicts(self, records: list[MetricRecord]):
        conflict_tags = set(self.tag_config.conflict_tags)
        if not conflict_tags:
            return

        for r in records:
            record_conflicts = conflict_tags.intersection(r.tags)
            if len(record_conflicts) > 1:
                tag_list = sorted(record_conflicts)
                self.issues.append(ValidationIssue(
                    warning_type=WarningType.TAG_CONFLICT,
                    message=(
                        f'{r.date.isoformat()} [{r.metric_name}] '
                        f'同时拥有冲突标签: {", ".join(tag_list)}，'
                        f'将仅以首个标签为准'
                    ),
                    affected_records=[f'{r.metric_name}@{r.date.isoformat()}'],
                    severity='warn',
                ))

    def _check_holiday_overlap(
        self,
        records: list[MetricRecord],
        holidays: list[HolidayRecord],
    ):
        if not holidays:
            return

        holiday_dates = {h.date for h in holidays}
        holiday_names = {h.date: h.name for h in holidays}

        for r in records:
            if r.date in holiday_dates:
                self.issues.append(ValidationIssue(
                    warning_type=WarningType.HOLIDAY_FP,
                    message=(
                        f'{r.date.isoformat()} [{r.metric_name}] '
                        f'为节假日 [{holiday_names[r.date]}]，'
                        f'异常标记将标注"节假日误报"风险'
                    ),
                    affected_records=[f'{r.metric_name}@{r.date.isoformat()}'],
                    severity='info',
                ))

    def _check_value_validity(self, records: list[MetricRecord]):
        for r in records:
            if not isinstance(r.value, (int, float)):
                self.issues.append(ValidationIssue(
                    warning_type=WarningType.MISSING_DATA,
                    message=f'{r.date.isoformat()} [{r.metric_name}] 值类型异常: {type(r.value)}',
                    affected_records=[f'{r.metric_name}@{r.date.isoformat()}'],
                    severity='error',
                ))

    def has_blocking_issues(self) -> bool:
        return any(i.severity == 'error' for i in self.issues)

    def summary(self) -> str:
        if not self.issues:
            return '校验通过，未发现问题'

        lines = [f'共发现 {len(self.issues)} 个问题:']
        for issue in self.issues:
            prefix = {'error': '❌', 'warn': '⚠️', 'info': 'ℹ️'}.get(issue.severity, '•')
            lines.append(f'  {prefix} [{issue.warning_type.value}] {issue.message}')
        return '\n'.join(lines)
