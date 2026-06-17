from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime


@dataclass
class ClusterRecord:
    cluster_id: str
    title: str
    content: str
    sentiment: str
    confidence: float
    source: str
    publish_time: str
    has_citation: bool = True
    citation_note: Optional[str] = None


@dataclass
class ParseStats:
    total: int = 0
    processed: int = 0
    bad_lines: int = 0
    skipped_lines: int = 0
    bad_details: List[str] = field(default_factory=list)
    skipped_details: List[str] = field(default_factory=list)


@dataclass
class ManualCorrection:
    correction_id: str
    cluster_id: str
    field_name: str
    old_value: Any
    new_value: Any
    operator: str
    remark: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = ""


@dataclass
class CompareResult:
    version_old: str
    version_new: str
    total_clusters_old: int
    total_clusters_new: int
    new_clusters: List[str]
    removed_clusters: List[str]
    changed_clusters: List[Dict[str, Any]]
    sentiment_changes: Dict[str, int]
    confidence_stats: Dict[str, float]
    threshold_metrics: Dict[str, Any]
    manual_correction_impact: List[Dict[str, Any]]
    citation_issues: List[str]
    parse_stats_old: ParseStats
    parse_stats_new: ParseStats


@dataclass
class HistoryRecord:
    run_id: str
    run_time: str
    version_old: str
    version_new: str
    operator: str
    summary: str
    result_file: str
