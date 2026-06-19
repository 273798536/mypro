from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class SampleRecord:
    sample_id: str
    original_label: str
    original_text: str
    source_table: str
    row_index: int
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LateAttachment:
    attachment_id: str
    sample_id: str
    content: str
    arrived_at: str
    source_path: str


@dataclass
class ModelResult:
    sample_id: str
    conclusion: str
    confidence: float
    reason: str
    model_version: str
    generated_at: str
    tags: List[str] = field(default_factory=list)


@dataclass
class TagConflict:
    sample_id: str
    sample_table_label: str
    model_tag: str
    sample_original_text: str
    source_table: str
    row_index: int


@dataclass
class CompareItem:
    sample_id: str
    old_result: Optional[ModelResult]
    new_result: Optional[ModelResult]
    sample: Optional[SampleRecord]
    late_attachments: List[LateAttachment] = field(default_factory=list)
    tag_conflicts: List[TagConflict] = field(default_factory=list)
    conclusion_changed: bool = False
    change_type: str = ""
    manual_notes: List[str] = field(default_factory=list)


@dataclass
class HistoryEntry:
    timestamp: str
    sample_id: str
    field: str
    old_value: str
    new_value: str
    operator: str
    reason: str


@dataclass
class CompareSummary:
    total_samples: int = 0
    old_only: int = 0
    new_only: int = 0
    both: int = 0
    conclusion_changed: int = 0
    conclusion_same: int = 0
    tag_conflict_count: int = 0
    late_attachment_count: int = 0
    change_types: Dict[str, int] = field(default_factory=dict)


@dataclass
class CompareResult:
    summary: CompareSummary
    items: List[CompareItem]
    history: List[HistoryEntry]
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
