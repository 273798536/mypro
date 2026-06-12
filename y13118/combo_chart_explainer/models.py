from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Any


@dataclass
class RawDataSource:
    source_name: str
    raw_content: str
    ingested_at: datetime = field(default_factory=datetime.now)
    notes: str = ""

    def __repr__(self) -> str:
        return f"RawDataSource(source='{self.source_name}', ingested={self.ingested_at.isoformat(timespec='seconds')})"


@dataclass
class Question:
    qid: str
    text: str
    category: str = ""
    difficulty: str = ""
    raw_source: Optional[RawDataSource] = None
    is_dirty: bool = False
    dirty_reason: str = ""

    def __repr__(self) -> str:
        flag = " [DIRTY]" if self.is_dirty else ""
        return f"Question({self.qid}: {self.text[:30]}...{flag})"


@dataclass
class WeightRecord:
    qid: str
    weight: float
    changed_at: datetime = field(default_factory=datetime.now)
    changed_by: str = "unknown"
    previous_weight: Optional[float] = None
    change_reason: str = ""

    def has_changed(self) -> bool:
        return self.previous_weight is not None and self.previous_weight != self.weight


@dataclass
class ExtrapolationError(Exception):
    qid: str
    field_name: str
    current_value: Any
    lower_bound: Any
    upper_bound: Any
    message: str = ""

    def __str__(self) -> str:
        if self.message:
            return self.message
        return (
            f"外推越界: 题目[{self.qid}]的{self.field_name}={self.current_value} "
            f"超出有效范围 [{self.lower_bound}, {self.upper_bound}]"
        )


@dataclass
class ComboItem:
    combo_id: str
    question_ids: List[str]
    combined_weight: float
    count: int
    status: str = "normal"

    def __repr__(self) -> str:
        return f"ComboItem({self.combo_id}: weight={self.combined_weight:.2f}, count={self.count}, status={self.status})"


@dataclass
class CalculationResult:
    run_id: str
    questions: List[Question]
    weights: Dict[str, WeightRecord]
    combo_items: List[ComboItem]
    total_combos: int
    total_weight: float
    errors: List[ExtrapolationError] = field(default_factory=list)
    chart_summary: Dict[str, Any] = field(default_factory=dict)
    calculated_at: datetime = field(default_factory=datetime.now)
    raw_sources: List[RawDataSource] = field(default_factory=list)

    def is_consistent(self) -> bool:
        if not self.combo_items or not self.chart_summary:
            return False
        chart_total = self.chart_summary.get("total_combos", -1)
        detail_total = sum(item.count for item in self.combo_items)
        return chart_total == detail_total

    def status_counts(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for item in self.combo_items:
            counts[item.status] = counts.get(item.status, 0) + item.count
        return counts
