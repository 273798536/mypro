from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime


class ProcessingStatus(str, Enum):
    NORMAL = "normal"
    DUPLICATE_RUN_ID = "duplicate_run_id"
    BAD_DATA = "bad_data"
    AWAITING_EVIDENCE = "awaiting_evidence"
    REVISED = "revised"
    CONFLICT = "conflict"


class DecisionType(str, Enum):
    SUPPLEMENT = "supplement"
    RELEASE = "release"
    HOLD = "hold"
    REJECT = "reject"


class RunIdDuplicateError(Exception):
    def __init__(self, run_id: str, existing_record_id: str, new_record_id: str):
        self.run_id = run_id
        self.existing_record_id = existing_record_id
        self.new_record_id = new_record_id
        super().__init__(
            f"run_id '{run_id}' 已存在于记录 {existing_record_id}，新记录 {new_record_id} 将被标记为异常"
        )


class BadDataError(Exception):
    def __init__(self, message: str, source_location: Optional[str] = None):
        self.source_location = source_location
        super().__init__(message)


@dataclass
class GrayConfig:
    source_id: str
    source_type: str
    raw_config: Dict[str, Any]
    normalized_config: Dict[str, Any]
    field_mapping: Dict[str, str]
    source_line: Optional[int] = None
    source_object_path: Optional[str] = None
    received_at: datetime = field(default_factory=datetime.now)
    version_tag: Optional[str] = None

    def get_raw_field(self, normalized_name: str) -> Optional[Tuple[str, Any]]:
        for raw_name, norm_name in self.field_mapping.items():
            if norm_name == normalized_name:
                return raw_name, self.raw_config.get(raw_name)
        return None


@dataclass
class SampleEvidence:
    evidence_id: str
    sample_id: str
    sample_content: Dict[str, Any]
    source_url: Optional[str] = None
    source_system: Optional[str] = None
    collected_at: datetime = field(default_factory=datetime.now)
    features: Dict[str, Any] = field(default_factory=dict)
    labels: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def get_feature_evidence(self, feature_name: str) -> Optional[Any]:
        return self.features.get(feature_name)


@dataclass
class SnapshotRecord:
    record_id: str
    run_id: str
    vector_index_version: str
    gray_config: GrayConfig
    score: float
    threshold: float
    processing_status: ProcessingStatus
    evidence_chain: List[SampleEvidence] = field(default_factory=list)
    raw_mean_score: Optional[float] = None
    small_sample_masked: bool = False
    small_sample_mask_reason: Optional[str] = None
    processing_errors: List[str] = field(default_factory=list)
    previous_result: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_approved(self) -> bool:
        if self.processing_status != ProcessingStatus.NORMAL:
            return False
        return self.score >= self.threshold

    def add_evidence(self, evidence: SampleEvidence) -> None:
        self.evidence_chain.append(evidence)
        self.updated_at = datetime.now()

    def mark_duplicate(self, existing_record_id: str) -> None:
        self.processing_status = ProcessingStatus.DUPLICATE_RUN_ID
        self.processing_errors.append(
            f"run_id重复：与记录 {existing_record_id} 冲突，结果不作为正常通过"
        )
        self.updated_at = datetime.now()

    def mark_bad_data(self, error_msg: str, source_location: Optional[str] = None) -> None:
        self.processing_status = ProcessingStatus.BAD_DATA
        location_info = f"（位置：{source_location}）" if source_location else ""
        self.processing_errors.append(f"坏数据{location_info}：{error_msg}")
        self.updated_at = datetime.now()


@dataclass
class Decision:
    record_id: str
    decision_type: DecisionType
    reason: str
    required_actions: List[str] = field(default_factory=list)
    priority: str = "medium"
    evidence_refs: List[str] = field(default_factory=list)
    decided_at: datetime = field(default_factory=datetime.now)

    def to_human_readable(self) -> str:
        type_text = {
            DecisionType.SUPPLEMENT: "需要补充材料",
            DecisionType.RELEASE: "可以放行",
            DecisionType.HOLD: "暂缓处理",
            DecisionType.REJECT: "不予通过",
        }.get(self.decision_type, str(self.decision_type))

        actions = "\n  - ".join(self.required_actions) if self.required_actions else "无"
        evidence = "\n  - ".join(self.evidence_refs) if self.evidence_refs else "无"

        return f"""
【{type_text}】
记录ID: {self.record_id}
优先级: {self.priority}
原因: {self.reason}
需要行动:
  - {actions}
证据参考:
  - {evidence}
"""
