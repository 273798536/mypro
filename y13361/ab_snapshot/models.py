from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import hashlib
import os


@dataclass
class MaterialMeta:
    material_name: str
    material_type: str
    uploaded_at: str
    content_hash: str
    source: str


@dataclass
class SampleRecord:
    sample_id: str
    features: Dict[str, Any]
    label: Any
    prediction: Any
    feature_arrival_latency_ms: int = 0
    is_feature_late: bool = False
    manual_correction: Optional[Dict[str, Any]] = None
    evidence_refs: List[str] = field(default_factory=list)


@dataclass
class MetricItem:
    name: str
    value: float
    threshold: Optional[float] = None
    direction: str = "higher"
    pass_status: Optional[bool] = None


@dataclass
class ManualAdjustment:
    item_id: str
    field_name: str
    old_value: Any
    new_value: Any
    reason: str
    operator: str
    adjusted_at: str


@dataclass
class CaliberChange:
    material_name: str
    field_path: str
    old_value: Any
    new_value: Any
    change_type: str
    evidence: str


@dataclass
class VersionSnapshot:
    version_tag: str
    created_at: str
    materials: List[MaterialMeta] = field(default_factory=list)
    samples: List[SampleRecord] = field(default_factory=list)
    metrics: List[MetricItem] = field(default_factory=list)
    manual_adjustments: List[ManualAdjustment] = field(default_factory=list)
    raw_training_log: str = ""
    notes: str = ""

    def material_content_hash(self, material_name: str) -> Optional[str]:
        for m in self.materials:
            if m.material_name == material_name:
                return m.content_hash
        return None

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class DiffItem:
    category: str
    field: str
    old_value: Any
    new_value: Any
    sample_refs: List[str] = field(default_factory=list)
    note: str = ""


@dataclass
class SnapCompareResult:
    old_version: str
    new_version: str
    compared_at: str
    sample_diffs: List[DiffItem] = field(default_factory=list)
    threshold_diffs: List[DiffItem] = field(default_factory=list)
    metric_diffs: List[DiffItem] = field(default_factory=list)
    manual_correction_diffs: List[DiffItem] = field(default_factory=list)
    late_feature_records_new: List[str] = field(default_factory=list)
    late_feature_records_old: List[str] = field(default_factory=list)
    caliber_changes: List[CaliberChange] = field(default_factory=list)
    overall_status: str = "pending"


@dataclass
class ReviewSection:
    status: str
    title: str
    items: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ReviewReport:
    snapshot_id: str
    generated_at: str
    sections: List[ReviewSection] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return asdict(self)


def compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def save_json(data: Dict, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
