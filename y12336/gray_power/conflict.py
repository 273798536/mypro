from __future__ import annotations

import uuid
from datetime import datetime

from .models import (
    ConflictRecord,
    ConflictSeverity,
    ConflictType,
    DelayEvent,
    ExperimentGroup,
    GroupComparison,
    MetricData,
    PowerResult,
    SampleInfo,
)


class ConflictDetector:
    def __init__(self):
        self._sequence_counter = 0

    def _next_sequence(self) -> int:
        self._sequence_counter += 1
        return self._sequence_counter

    def detect_sample_insufficiency(
        self, sample_info: SampleInfo, delay_events: list[DelayEvent]
    ) -> ConflictRecord | None:
        if sample_info.is_sufficient:
            return None
        related_delays = [
            d.event_id
            for d in delay_events
            if sample_info.group_id in d.affected_groups
        ]
        seq = self._next_sequence()
        return ConflictRecord(
            conflict_id=f"cf_{uuid.uuid4().hex[:8]}",
            conflict_type=ConflictType.INSUFFICIENT_SAMPLE,
            severity=ConflictSeverity.WARNING,
            sources=[sample_info.group_id],
            description=(
                f"分组 {sample_info.group_id} 样本不足: "
                f"需要 {sample_info.required_n} {sample_info.unit}, "
                f"实际 {sample_info.actual_n} {sample_info.unit}, "
                f"缺口 {sample_info.shortfall}"
            ),
            related_delay_events=related_delays,
            sequence_order=seq,
            intermediate_values={
                "required_n": sample_info.required_n,
                "actual_n": sample_info.actual_n,
                "shortfall": sample_info.shortfall,
                "unit": sample_info.unit,
            },
        )

    def detect_uneven_groups(
        self,
        groups: list[ExperimentGroup],
        metrics: list[MetricData],
        comparisons: list[GroupComparison],
        delay_events: list[DelayEvent],
    ) -> list[ConflictRecord]:
        records = []
        for comp in comparisons:
            if comp.is_balanced:
                continue
            related_delays = [
                d.event_id
                for d in delay_events
                if comp.metric_id in d.affected_metrics
                or comp.control_group_id in d.affected_groups
                or comp.treatment_group_id in d.affected_groups
            ]
            seq = self._next_sequence()
            records.append(
                ConflictRecord(
                    conflict_id=f"cf_{uuid.uuid4().hex[:8]}",
                    conflict_type=ConflictType.UNEVEN_GROUP,
                    severity=ConflictSeverity.WARNING,
                    sources=[comp.control_group_id, comp.treatment_group_id],
                    description=(
                        f"分组不均: {comp.control_group_id}(n={comp.control_n}) vs "
                        f"{comp.treatment_group_id}(n={comp.treatment_n}), "
                        f"平衡比={comp.balance_ratio:.2f} < 0.8"
                    ),
                    related_delay_events=related_delays,
                    sequence_order=seq,
                    intermediate_values={
                        "control_n": comp.control_n,
                        "treatment_n": comp.treatment_n,
                        "balance_ratio": comp.balance_ratio,
                        "threshold": 0.8,
                    },
                )
            )
        return records

    def detect_delayed_metrics(
        self, metrics: list[MetricData], delay_events: list[DelayEvent]
    ) -> list[ConflictRecord]:
        records = []
        for metric in metrics:
            if metric.delay_status.value == "on_time":
                continue
            related_delays = [
                d.event_id
                for d in delay_events
                if metric.metric_id in d.affected_metrics
            ]
            seq = self._next_sequence()
            severity = ConflictSeverity.CRITICAL if metric.delay_hours >= 12 else ConflictSeverity.WARNING
            records.append(
                ConflictRecord(
                    conflict_id=f"cf_{uuid.uuid4().hex[:8]}",
                    conflict_type=ConflictType.DELAYED_METRIC,
                    severity=severity,
                    sources=[metric.metric_id, metric.source_channel, metric.source_city],
                    description=(
                        f"指标 {metric.metric_name}({metric.metric_id}) 延迟 "
                        f"{metric.delay_hours:.1f} 小时到达 "
                        f"(渠道={metric.source_channel}, 城市={metric.source_city})"
                    ),
                    related_delay_events=related_delays,
                    sequence_order=seq,
                    intermediate_values={
                        "delay_hours": metric.delay_hours,
                        "delay_status": metric.delay_status.value,
                        "source_channel": metric.source_channel,
                        "source_city": metric.source_city,
                    },
                )
            )
        return records

    def detect_group_metric_mismatch(
        self,
        groups: list[ExperimentGroup],
        metrics: list[MetricData],
        delay_events: list[DelayEvent],
    ) -> list[ConflictRecord]:
        records = []
        group_ids = {g.group_id for g in groups}
        for metric in metrics:
            if metric.control_n == 0 and metric.treatment_n == 0:
                related_delays = [
                    d.event_id for d in delay_events if metric.metric_id in d.affected_metrics
                ]
                seq = self._next_sequence()
                records.append(
                    ConflictRecord(
                        conflict_id=f"cf_{uuid.uuid4().hex[:8]}",
                        conflict_type=ConflictType.GROUP_METRIC_MISMATCH,
                        severity=ConflictSeverity.CRITICAL,
                        sources=[metric.metric_id],
                        description=(
                            f"指标 {metric.metric_name} 在所有分组中样本均为0, "
                            f"可能数据未匹配到分组"
                        ),
                        related_delay_events=related_delays,
                        sequence_order=seq,
                        intermediate_values={"control_n": 0, "treatment_n": 0},
                    )
                )
        return records

    def detect_all(
        self,
        groups: list[ExperimentGroup],
        metrics: list[MetricData],
        sample_infos: list[SampleInfo],
        comparisons: list[GroupComparison],
        delay_events: list[DelayEvent],
    ) -> list[ConflictRecord]:
        all_conflicts = []

        for si in sample_infos:
            cr = self.detect_sample_insufficiency(si, delay_events)
            if cr:
                all_conflicts.append(cr)

        all_conflicts.extend(self.detect_uneven_groups(groups, metrics, comparisons, delay_events))
        all_conflicts.extend(self.detect_delayed_metrics(metrics, delay_events))
        all_conflicts.extend(self.detect_group_metric_mismatch(groups, metrics, delay_events))

        all_conflicts.sort(key=lambda c: c.sequence_order)
        return all_conflicts

    @staticmethod
    def build_delay_events(metrics: list[MetricData]) -> list[DelayEvent]:
        events = []
        seq = 0
        for metric in metrics:
            if metric.delay_status.value == "on_time":
                continue
            seq += 1
            events.append(
                DelayEvent(
                    event_id=f"de_{uuid.uuid4().hex[:8]}",
                    source_type="metric",
                    source_id=metric.metric_id,
                    expected_time=metric.expected_time,
                    actual_time=metric.arrival_time,
                    delay_hours=metric.delay_hours,
                    affected_metrics=[metric.metric_id],
                    affected_groups=[],
                    description=(
                        f"指标 {metric.metric_name} 延迟 {metric.delay_hours:.1f}h "
                        f"(渠道={metric.source_channel}, 城市={metric.source_city})"
                    ),
                    sequence_order=seq,
                )
            )
        events.sort(key=lambda e: e.sequence_order)
        return events

    @staticmethod
    def format_conflict_timeline(conflicts: list[ConflictRecord]) -> list[str]:
        if not conflicts:
            return ["✓ 无冲突"]
        lines = []
        lines.append(f"检测到 {len(conflicts)} 项冲突（按检测顺序排列）:")
        lines.append("-" * 60)
        for c in conflicts:
            delay_info = ""
            if c.related_delay_events:
                delay_info = f" [关联延迟: {', '.join(c.related_delay_events)}]"
            lines.append(
                f"  #{c.sequence_order:02d} [{c.severity.value.upper():8s}] "
                f"{c.conflict_type.value}: {c.description}{delay_info}"
            )
            if c.intermediate_values:
                for k, v in c.intermediate_values.items():
                    lines.append(f"         ↳ {k} = {v}")
        return lines
