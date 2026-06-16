"""训练集近重复清洗 CLI - 核心数据模型"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class RecordStatus(str, Enum):
    """记录状态"""

    CLEAN = "clean"              # 可直接使用
    NEEDS_REVIEW = "needs_review"  # 待算法产品经理复核
    BAD = "bad"                  # 明显坏数据
    DUPLICATE = "duplicate"      # 近重复
    LEAKAGE = "leakage"          # 训练验证泄漏


class SplitType(str, Enum):
    """数据集拆分类型"""

    TRAIN = "train"
    VAL = "val"
    TEST = "test"


class AuditAction(str, Enum):
    """审计操作类型"""

    CREATE = "create"
    UPDATE = "update"
    DEDUP = "dedup"
    FLAG_BAD = "flag_bad"
    FLAG_REVIEW = "flag_review"
    RESTORE = "restore"
    DETECT_LEAKAGE = "detect_leakage"


@dataclass
class SourceRef:
    """来源引用 - 保留原始行号、图片名或来源备注"""

    source_file: str
    line_number: Optional[int] = None
    image_name: Optional[str] = None
    remark: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Sample:
    """训练样本"""

    sample_id: str
    content: str
    split: SplitType = SplitType.TRAIN
    label: Optional[str] = None
    source_ref: Optional[SourceRef] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def content_hash(self) -> str:
        return hashlib.sha256(self.content.encode("utf-8")).hexdigest()[:16]

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["content_hash"] = self.content_hash()
        return d


@dataclass
class DedupRecord:
    """去重记录"""

    keep_sample_id: str
    removed_sample_ids: list[str]
    similarity: float
    method: str
    reason: str
    recorded_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class LeakageRecord:
    """训练验证泄漏记录"""

    train_sample_id: str
    val_sample_id: str
    similarity: float
    method: str
    recorded_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AuditEntry:
    """审计日志条目"""

    action: AuditAction
    sample_id: Optional[str] = None
    detail: dict[str, Any] = field(default_factory=dict)
    operator: str = "system"
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class VersionInfo:
    """版本信息"""

    version_id: str
    parent_version_id: Optional[str] = None
    description: str = ""
    sample_count: int = 0
    dedup_record_count: int = 0
    leakage_record_count: int = 0
    audit_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    created_by: str = "system"
    checksum: str = ""

    def compute_checksum(self, data: str) -> str:
        self.checksum = hashlib.sha256(data.encode("utf-8")).hexdigest()
        return self.checksum

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DatasetSnapshot:
    """数据集快照 - 完整版本内容"""

    version: VersionInfo
    samples: list[Sample]
    dedup_records: list[DedupRecord]
    leakage_records: list[LeakageRecord]
    audit_log: list[AuditEntry]

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version.to_dict(),
            "samples": [s.to_dict() for s in self.samples],
            "dedup_records": [r.to_dict() for r in self.dedup_records],
            "leakage_records": [r.to_dict() for r in self.leakage_records],
            "audit_log": [a.to_dict() for a in self.audit_log],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


@dataclass
class DedupResult:
    """去重处理结果"""

    clean_samples: list[Sample]
    dedup_records: list[DedupRecord]
    needs_review_samples: list[Sample]
    bad_samples: list[Sample]
    duplicate_samples: list[Sample] = field(default_factory=list)

    @property
    def all_samples(self) -> list[Sample]:
        return (
            self.clean_samples
            + self.needs_review_samples
            + self.bad_samples
            + self.duplicate_samples
        )

    @property
    def summary(self) -> dict[str, int]:
        return {
            "clean": len(self.clean_samples),
            "needs_review": len(self.needs_review_samples),
            "bad": len(self.bad_samples),
            "duplicate": len(self.duplicate_samples),
            "removed_duplicates": sum(len(r.removed_sample_ids) for r in self.dedup_records),
        }


@dataclass
class LeakageResult:
    """泄漏检测结果"""

    leakage_records: list[LeakageRecord]
    safe_train_samples: list[Sample]
    safe_val_samples: list[Sample]

    @property
    def has_leakage(self) -> bool:
        return len(self.leakage_records) > 0

    @property
    def summary(self) -> dict[str, int]:
        return {
            "leakage_pairs": len(self.leakage_records),
            "safe_train": len(self.safe_train_samples),
            "safe_val": len(self.safe_val_samples),
        }
