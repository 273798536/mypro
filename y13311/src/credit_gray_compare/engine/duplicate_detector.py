"""重复评测检测：发现重复评测时先给出待确认原因与影响范围。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Set

from ..models import EvaluationHistory, EvaluationRecord, SampleSet


@dataclass
class DuplicateIssue:
    """重复评测问题。"""

    reason: str
    sample_ids: Set[str] = field(default_factory=set)
    existing_record_ids: List[str] = field(default_factory=list)
    impact_scope: str = ""

    @property
    def affected_count(self) -> int:
        return len(self.sample_ids)

    def description(self) -> str:
        return (
            f"[{self.reason}] 影响 {self.affected_count} 个样本，"
            f"涉及已有记录 {len(self.existing_record_ids)} 条。{self.impact_scope}"
        )


class DuplicateDetector:
    """检测当前评测是否与历史记录存在重复。"""

    def __init__(self, history: EvaluationHistory) -> None:
        self.history = history

    def check(
        self,
        sample_set: SampleSet,
        model_version_id: str,
        threshold_version_id: str,
    ) -> List[DuplicateIssue]:
        issues: List[DuplicateIssue] = []
        same_version_records = [
            r
            for r in self.history.records
            if r.model_version_id == model_version_id
            and r.threshold_version_id == threshold_version_id
        ]
        if not same_version_records:
            return issues

        current_ids = sample_set.sample_ids()
        for record in same_version_records:
            overlap: Set[str] = set()
            for change in record.decision_changes:
                if change.sample_id in current_ids:
                    overlap.add(change.sample_id)
            if overlap:
                issues.append(
                    DuplicateIssue(
                        reason=(
                            f"版本 ({model_version_id[:8]} / {threshold_version_id[:8]}) "
                            f"与历史记录 {record.record_id[:8]} 存在样本重叠"
                        ),
                        sample_ids=overlap,
                        existing_record_ids=[record.record_id],
                        impact_scope=(
                            "请确认是否为同一批样本的重复评测；"
                            "若为重复评测，结论以最新确认为准，旧结论需同步作废。"
                        ),
                    )
                )
        return issues
