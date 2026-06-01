from __future__ import annotations

import uuid
from datetime import datetime

from .models import (
    ConflictRecord,
    GroupComparison,
    PowerResult,
    TraceLink,
)


class TraceChain:
    def __init__(self):
        self._links: list[TraceLink] = []

    def link_power_to_comparison(
        self, power_result: PowerResult, comparison: GroupComparison
    ) -> TraceLink:
        link = TraceLink(
            link_id=f"tl_{uuid.uuid4().hex[:8]}",
            source_type="power_result",
            source_id=power_result.result_id,
            target_type="group_comparison",
            target_id=comparison.comparison_id,
            description=(
                f"功效结果 {power_result.result_id} → "
                f"分组对比 {comparison.comparison_id} "
                f"(指标={power_result.metric_name})"
            ),
        )
        self._links.append(link)
        return link

    def link_power_to_conflicts(
        self, power_result: PowerResult, conflicts: list[ConflictRecord]
    ) -> list[TraceLink]:
        links = []
        for conflict in conflicts:
            link = TraceLink(
                link_id=f"tl_{uuid.uuid4().hex[:8]}",
                source_type="power_result",
                source_id=power_result.result_id,
                target_type="conflict",
                target_id=conflict.conflict_id,
                description=(
                    f"功效结果 {power_result.result_id} → "
                    f"冲突 {conflict.conflict_id} "
                    f"({conflict.conflict_type.value})"
                ),
            )
            self._links.append(link)
            links.append(link)
        return links

    def link_comparison_to_conflicts(
        self, comparison: GroupComparison, conflicts: list[ConflictRecord]
    ) -> list[TraceLink]:
        links = []
        for conflict in conflicts:
            link = TraceLink(
                link_id=f"tl_{uuid.uuid4().hex[:8]}",
                source_type="group_comparison",
                source_id=comparison.comparison_id,
                target_type="conflict",
                target_id=conflict.conflict_id,
                description=(
                    f"分组对比 {comparison.comparison_id} → "
                    f"冲突 {conflict.conflict_id} "
                    f"({conflict.conflict_type.value})"
                ),
            )
            self._links.append(link)
            links.append(link)
        return links

    def link_conflict_to_delay(
        self, conflict: ConflictRecord, delay_event_id: str
    ) -> TraceLink:
        link = TraceLink(
            link_id=f"tl_{uuid.uuid4().hex[:8]}",
            source_type="conflict",
            source_id=conflict.conflict_id,
            target_type="delay_event",
            target_id=delay_event_id,
            description=(
                f"冲突 {conflict.conflict_id} → "
                f"延迟事件 {delay_event_id}"
            ),
        )
        self._links.append(link)
        return link

    def trace_from_result(self, result_id: str) -> list[TraceLink]:
        forward = [l for l in self._links if l.source_id == result_id]
        all_ids = {l.target_id for l in forward}
        backward = [l for l in self._links if l.source_id in all_ids]
        return forward + backward

    def trace_to_result(self, result_id: str) -> list[TraceLink]:
        backward = [l for l in self._links if l.target_id == result_id]
        all_ids = {l.source_id for l in backward}
        forward = [l for l in self._links if l.target_id in all_ids]
        return backward + forward

    def get_all_links(self) -> list[TraceLink]:
        return list(self._links)

    @staticmethod
    def format_trace(links: list[TraceLink], start_id: str) -> list[str]:
        if not links:
            return [f"  {start_id} (无追溯链)"]
        lines = [f"  追溯起点: {start_id}"]
        for link in links:
            arrow = "→"
            lines.append(
                f"    {arrow} [{link.source_type}] {link.source_id} "
                f"→ [{link.target_type}] {link.target_id}"
            )
            lines.append(f"       {link.description}")
        return lines
