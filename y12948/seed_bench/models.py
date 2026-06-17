from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime
from enum import Enum
from typing import Any, Optional

import xxhash
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SplitType(str, Enum):
    TRAIN = "train"
    VAL = "val"
    TEST = "test"
    UNASSIGNED = "unassigned"


class ReviewStatus(str, Enum):
    PENDING = "待确认"
    APPROVED = "通过"
    REJECTED = "驳回"
    NEEDS_REVISION = "待修改"


class DataRecord(BaseModel):
    record_id: str
    content_hash: str
    raw_content: dict[str, Any]
    split_type: SplitType = SplitType.UNASSIGNED
    user_id: Optional[str] = None
    timestamp: Optional[float] = None
    session_id: Optional[str] = None
    source_file: str = ""
    line_number: int = 0
    dedup_group_id: Optional[str] = None

    @field_validator("record_id", "content_hash")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("不能为空字符串")
        return v


class DedupResult(BaseModel):
    group_id: str
    kept_record_id: str
    duplicate_record_ids: list[str]
    duplicate_count: int
    similarity: float = 1.0
    reason: str = "exact_hash_match"


class LeakDetectionResult(BaseModel):
    status: ReviewStatus
    leak_type: str = ""
    leak_count: int = 0
    total_count: int = 0
    leak_ratio: float = 0.0
    affected_keys: list[str] = Field(default_factory=list)
    check_timestamp: float = Field(default_factory=time.time)
    safety_rules_applied: list[str] = Field(default_factory=list)
    safety_rules_missing: list[str] = Field(default_factory=list)
    message: str = ""

    def to_summary_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "leak_type": self.leak_type,
            "leak_count": self.leak_count,
            "total_count": self.total_count,
            "leak_ratio": round(self.leak_ratio, 6),
            "message": self.message,
        }


class SafetyRule(BaseModel):
    rule_id: str
    name: str
    description: str
    enabled: bool = True
    severity: str = "high"
    config: dict[str, Any] = Field(default_factory=dict)


class ModelLogEntry(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    level: str = "INFO"
    module: str
    message: str
    context: dict[str, Any] = Field(default_factory=dict)


class ToolCallParams(BaseModel):
    command: str
    input_dir: str
    output_dir: str
    seed: int
    params: dict[str, Any] = Field(default_factory=dict)
    run_timestamp: float = Field(default_factory=time.time)


class ReviewRecord(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    review_id: str
    batch_id: str
    created_at: float = Field(default_factory=time.time)
    status: ReviewStatus = ReviewStatus.PENDING
    reviewer: str = "system"
    comment: str = ""

    safety_rules: list[SafetyRule] = Field(default_factory=list)
    safety_rule_violations: list[dict[str, Any]] = Field(default_factory=list)

    model_logs: list[ModelLogEntry] = Field(default_factory=list)
    tool_params: Optional[ToolCallParams] = None

    leak_result: Optional[LeakDetectionResult] = None
    dedup_summary: dict[str, Any] = Field(default_factory=dict)
    shuffle_summary: dict[str, Any] = Field(default_factory=dict)

    material_fingerprint: str = ""
    data_source_files: list[str] = Field(default_factory=list)

    def compute_fingerprint(self) -> str:
        payload = json.dumps(
            {
                "safety_rules": [r.model_dump() for r in self.safety_rules],
                "model_logs": [m.model_dump() for m in self.model_logs],
                "tool_params": self.tool_params.model_dump() if self.tool_params else {},
                "data_source_files": sorted(self.data_source_files),
            },
            sort_keys=True,
            ensure_ascii=False,
        )
        return xxhash.xxh64(payload.encode("utf-8")).hexdigest()

    def to_summary_dict(self) -> dict[str, Any]:
        return {
            "review_id": self.review_id,
            "batch_id": self.batch_id,
            "status": self.status.value,
            "created_at": datetime.fromtimestamp(self.created_at).isoformat(),
            "reviewer": self.reviewer,
            "comment": self.comment,
            "safety_rules_count": len(self.safety_rules),
            "safety_rule_violations_count": len(self.safety_rule_violations),
            "model_logs_count": len(self.model_logs),
            "material_fingerprint": self.material_fingerprint,
            "data_source_files": self.data_source_files,
            "leak_result": self.leak_result.to_summary_dict() if self.leak_result else None,
            "dedup_summary": self.dedup_summary,
            "shuffle_summary": self.shuffle_summary,
        }


class ShuffleResult(BaseModel):
    batch_id: str
    seed: int
    total_records: int
    train_count: int = 0
    val_count: int = 0
    test_count: int = 0
    train_ratio: float = 0.0
    val_ratio: float = 0.0
    test_ratio: float = 0.0
    shuffle_timestamp: float = Field(default_factory=time.time)
    record_ids_train: list[str] = Field(default_factory=list)
    record_ids_val: list[str] = Field(default_factory=list)
    record_ids_test: list[str] = Field(default_factory=list)

    def to_summary_dict(self) -> dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "seed": self.seed,
            "total_records": self.total_records,
            "train_count": self.train_count,
            "val_count": self.val_count,
            "test_count": self.test_count,
            "train_ratio": round(self.train_ratio, 4),
            "val_ratio": round(self.val_ratio, 4),
            "test_ratio": round(self.test_ratio, 4),
        }


def compute_content_hash(obj: Any, algorithm: str = "xxhash64") -> str:
    payload = json.dumps(obj, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")
    if algorithm == "xxhash64":
        return xxhash.xxh64(payload).hexdigest()
    if algorithm == "md5":
        return hashlib.md5(payload).hexdigest()
    if algorithm == "sha256":
        return hashlib.sha256(payload).hexdigest()
    raise ValueError(f"不支持的哈希算法: {algorithm}")


def generate_id(prefix: str = "id") -> str:
    ts = int(time.time() * 1000000)
    return f"{prefix}_{ts}_{xxhash.xxh32(str(ts).encode()).hexdigest()[:8]}"
