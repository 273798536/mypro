from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import hashlib
import json


class RecordStatus(str, Enum):
    CLEAN = "clean"
    PENDING = "pending_review"
    DIRTY = "dirty"
    LEAKED = "train_val_leak"
    EXPORTED = "exported"


class ReviewAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    NEED_MORE_INFO = "need_more_info"
    FIX_LABEL = "fix_label"
    FLAG_AS_LEAK = "flag_as_leak"


@dataclass
class SourceMaterial:
    source_id: str
    file_path: str
    sheet_name: Optional[str] = None
    row_number: Optional[int] = None
    raw_content: str = ""
    retrieved_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["retrieved_at"] = self.retrieved_at.isoformat()
        return d


@dataclass
class SampleRecord:
    record_id: str
    prompt: str
    response: str
    label: str
    source_material: SourceMaterial
    tokens_prompt: int = 0
    tokens_response: int = 0
    status: RecordStatus = RecordStatus.PENDING
    version: int = 1
    created_at: datetime = field(default_factory=datetime.now)
    modified_at: datetime = field(default_factory=datetime.now)
    modified_by: str = "system"
    review_notes: List[Dict[str, Any]] = field(default_factory=list)
    deduplication_hash: str = ""
    content_hash: str = ""
    tags: List[str] = field(default_factory=list)
    group_key: str = ""

    def __post_init__(self):
        self._compute_hashes()

    def _compute_hashes(self) -> None:
        dedup_content = f"{self.prompt.strip()}|{self.response.strip()}"
        self.deduplication_hash = hashlib.sha256(dedup_content.encode("utf-8")).hexdigest()[:16]
        full_content = json.dumps({
            "prompt": self.prompt,
            "response": self.response,
            "label": self.label,
            "source": self.source_material.source_id
        }, sort_keys=True, ensure_ascii=False)
        self.content_hash = hashlib.sha256(full_content.encode("utf-8")).hexdigest()

    def recompute_hashes(self) -> None:
        self._compute_hashes()
        self.modified_at = datetime.now()

    def add_review_note(self, reviewer: str, action: ReviewAction, note: str) -> None:
        self.review_notes.append({
            "reviewer": reviewer,
            "action": action.value,
            "note": note,
            "timestamp": datetime.now().isoformat()
        })
        self.modified_at = datetime.now()
        self.modified_by = reviewer

    def estimate_tokens(self) -> int:
        if self.tokens_prompt > 0 and self.tokens_response > 0:
            return self.tokens_prompt + self.tokens_response
        prompt_tokens = len(self.prompt) // 4 + 1
        response_tokens = len(self.response) // 4 + 1
        return prompt_tokens + response_tokens

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["created_at"] = self.created_at.isoformat()
        d["modified_at"] = self.modified_at.isoformat()
        d["status"] = self.status.value
        d["source_material"] = self.source_material.to_dict()
        d["total_tokens"] = self.estimate_tokens()
        return d


@dataclass
class VersionEntry:
    record_id: str
    version: int
    content_snapshot: Dict[str, Any]
    change_reason: str
    changed_by: str
    changed_at: datetime = field(default_factory=datetime.now)
    content_hash: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["changed_at"] = self.changed_at.isoformat()
        return d


@dataclass
class AuditLogEntry:
    operation: str
    record_id: Optional[str] = None
    user: str = "system"
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    security_blocked: bool = False
    block_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["timestamp"] = self.timestamp.isoformat()
        return d


@dataclass
class ExportPackage:
    export_id: str
    records: List[SampleRecord]
    exported_at: datetime = field(default_factory=datetime.now)
    exported_by: str = ""
    manifest_hash: str = ""
    validation_result: Dict[str, Any] = field(default_factory=dict)

    def compute_manifest(self) -> str:
        record_hashes = sorted(r.content_hash for r in self.records)
        manifest_content = "|".join(record_hashes)
        self.manifest_hash = hashlib.sha256(manifest_content.encode("utf-8")).hexdigest()
        return self.manifest_hash

    def to_dict(self) -> Dict[str, Any]:
        return {
            "export_id": self.export_id,
            "exported_at": self.exported_at.isoformat(),
            "exported_by": self.exported_by,
            "manifest_hash": self.manifest_hash,
            "record_count": len(self.records),
            "record_ids": [r.record_id for r in self.records],
            "validation_result": self.validation_result,
        }
