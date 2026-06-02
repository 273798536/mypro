from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
from enum import Enum
from datetime import datetime


class IssueType(str, Enum):
    TAG_CONFLICT = "tag_conflict"
    MATERIAL_DUPLICATE = "material_duplicate"
    USAGE_MISMATCH = "usage_mismatch"
    MERGE_ANOMALY = "merge_anomaly"


class Severity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class AudioMaterial:
    material_id: str
    title: str
    duration: float
    source_tags: List[str]
    manual_tags: List[str] = field(default_factory=list)
    merged_tags: List[str] = field(default_factory=list)
    file_hash: str = ""
    source_file: str = ""
    import_time: datetime = field(default_factory=datetime.now)
    merge_history: List[Dict] = field(default_factory=list)

    def all_tags(self) -> Set[str]:
        return set(self.source_tags + self.manual_tags)


@dataclass
class ProjectUsage:
    usage_id: str
    project_name: str
    scene_desc: str
    required_mood: List[str]
    assigned_material_ids: List[str]
    usage_context: str = ""
    assigned_time: datetime = field(default_factory=datetime.now)
    auditor_notes: str = ""


@dataclass
class AuditReport:
    report_id: str
    material_id: str
    auditor_tags: List[str]
    auditor_comments: str
    audit_time: datetime
    auditor: str = ""
    merge_suggestions: List[str] = field(default_factory=list)


@dataclass
class Issue:
    issue_id: str
    issue_type: IssueType
    severity: Severity
    title: str
    description: str
    related_materials: List[str]
    related_usages: List[str] = field(default_factory=list)
    related_reports: List[str] = field(default_factory=list)
    evidence: Dict = field(default_factory=dict)
    suggestions: List[str] = field(default_factory=list)
    discovered_at: datetime = field(default_factory=datetime.now)
    resolved: bool = False


@dataclass
class TagSimilarity:
    tag_a: str
    tag_b: str
    similarity_score: float
    merge_rule_id: Optional[str] = None
    manual_override: bool = False


@dataclass
class MergeFeedback:
    feedback_id: str
    material_id: str
    original_tags: List[str]
    suggested_tags: List[str]
    accepted: bool
    feedback_text: str
    feedback_time: datetime
    anomaly_sample: bool = False


@dataclass
class AuditDataset:
    materials: Dict[str, AudioMaterial] = field(default_factory=dict)
    usages: Dict[str, ProjectUsage] = field(default_factory=dict)
    reports: Dict[str, AuditReport] = field(default_factory=dict)
    tag_similarities: List[TagSimilarity] = field(default_factory=list)
    merge_feedbacks: List[MergeFeedback] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)
