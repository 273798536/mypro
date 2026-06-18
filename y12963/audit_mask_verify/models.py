"""数据模型：处理记录、追溯链、工单关联、脱敏核验结论。

所有模型均采用 dataclass + JSON 序列化，方便 CLI 输出和跨模块传递。
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, asdict, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class ConclusionStatus(str, Enum):
    """核验结论状态：用于去重，同工单同项只保留一条 ACTIVE。"""
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    ROLLBACK = "ROLLBACK"


class ProcessStatus(str, Enum):
    """处理记录状态。"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    DONE = "DONE"
    SKIPPED_IDEMPOTENT = "SKIPPED_IDEMPOTENT"
    FAILED = "FAILED"


class MaskLevel(str, Enum):
    """脱敏等级。"""
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    NONE = "NONE"
    UNKNOWN = "UNKNOWN"


def _utc_now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _content_hash(content: str) -> str:
    """基于内容生成稳定哈希，用于幂等键。"""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def make_idempotency_key(work_order_id: str, batch_id: str, content_hash: str) -> str:
    """幂等键三元组：工单ID + 批次ID + 内容哈希。"""
    raw = f"{work_order_id}::{batch_id}::{content_hash}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def make_conclusion_key(work_order_id: str, field_path: str) -> str:
    """结论去重键：同工单同字段路径只允许一个 ACTIVE 结论。"""
    raw = f"{work_order_id}::{field_path}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


@dataclass
class SourceRef:
    """来源文件引用：追溯链的叶子节点。"""
    source_file: str
    source_line_start: int = 0
    source_line_end: int = 0
    raw_excerpt: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class WorkOrderRef:
    """业务工单引用：围绕这条线串起所有操作。"""
    work_order_id: str
    ticket_title: str = ""
    ticket_url: str = ""
    assignee: str = ""
    created_at: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SlowQueryRef:
    """慢查询日志引用：复盘时可直接跳转定位。"""
    slow_log_id: str
    slow_log_file: str
    slow_log_line: int = 0
    sql_excerpt: str = ""
    query_time_ms: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RollbackPoint:
    """回滚记录：审计日志脱敏核验日常入口。"""
    point_id: str
    batch_id: str
    rolled_back_at: str = field(default_factory=_utc_now_iso)
    reason: str = ""
    affected_conclusion_keys: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MaskVerifyConclusion:
    """脱敏核验结论：最终输出。

    同 (work_order_id, field_path) 只允许一条 ACTIVE，其余标 SUPERSEDED。
    """
    conclusion_id: str
    conclusion_key: str
    work_order_id: str
    field_path: str
    expected_mask_level: MaskLevel
    actual_mask_level: MaskLevel
    is_pass: bool
    status: ConclusionStatus = ConclusionStatus.ACTIVE
    remark: str = ""
    created_at: str = field(default_factory=_utc_now_iso)
    superseded_by: Optional[str] = None

    processing_record_id: Optional[str] = None
    slow_query_refs: list[SlowQueryRef] = field(default_factory=list)
    source_refs: list[SourceRef] = field(default_factory=list)

    def to_dict(self) -> dict:
        data = asdict(self)
        data["expected_mask_level"] = self.expected_mask_level.value
        data["actual_mask_level"] = self.actual_mask_level.value
        data["status"] = self.status.value
        data["slow_query_refs"] = [r.to_dict() for r in self.slow_query_refs]
        data["source_refs"] = [r.to_dict() for r in self.source_refs]
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "MaskVerifyConclusion":
        d = dict(data)
        d["expected_mask_level"] = MaskLevel(d.get("expected_mask_level", "UNKNOWN"))
        d["actual_mask_level"] = MaskLevel(d.get("actual_mask_level", "UNKNOWN"))
        d["status"] = ConclusionStatus(d.get("status", "ACTIVE"))
        d["slow_query_refs"] = [SlowQueryRef(**r) for r in d.get("slow_query_refs", [])]
        d["source_refs"] = [SourceRef(**r) for r in d.get("source_refs", [])]
        return cls(**d)


@dataclass
class ProcessingRecord:
    """处理记录：幂等校验 & 追溯链中枢。

    追溯链方向：
        conclusion → processing_record → (sources, work_order, slow_queries)
    """
    record_id: str
    idempotency_key: str
    batch_id: str
    work_order_id: str
    content_hash: str
    status: ProcessStatus = ProcessStatus.PENDING
    started_at: str = field(default_factory=_utc_now_iso)
    finished_at: Optional[str] = None
    operator: str = "cli"
    input_file: str = ""
    output_refs: list[str] = field(default_factory=list)
    message: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ProcessingRecord":
        d = dict(data)
        d["status"] = ProcessStatus(d.get("status", "PENDING"))
        return cls(**d)


@dataclass
class TraceChain:
    """完整追溯链：从结论一路回到来源、工单、慢查询。"""
    conclusion: MaskVerifyConclusion
    processing_record: ProcessingRecord
    work_order: WorkOrderRef
    sources: list[SourceRef]
    slow_queries: list[SlowQueryRef]

    def to_dict(self) -> dict:
        return {
            "conclusion": self.conclusion.to_dict(),
            "processing_record": self.processing_record.to_dict(),
            "work_order": self.work_order.to_dict(),
            "sources": [s.to_dict() for s in self.sources],
            "slow_queries": [sq.to_dict() for sq in self.slow_queries],
        }
