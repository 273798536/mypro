from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional, Any


class RowStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    DRAFT = "draft"


@dataclass
class DraftRow:
    """计算草稿中的一行数据。支持空值、备注混写。"""
    raw_index: int
    raw_text: str
    person: Optional[str] = None
    date: Optional[str] = None
    shift: Optional[str] = None
    hours: Optional[float] = None
    note: Optional[str] = None
    is_empty: bool = False
    is_duplicate: bool = False
    parse_errors: list[str] = field(default_factory=list)
    source_file: str = ""

    def content_hash(self) -> str:
        payload = json.dumps(
            {k: v for k, v in asdict(self).items() if k not in ("raw_index", "parse_errors", "is_duplicate", "is_empty")},
            sort_keys=True,
            ensure_ascii=False,
        )
        return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:12]


@dataclass
class Assignment:
    """最终确认的排班分配。"""
    assignment_id: str
    person: str
    date: str
    shift: str
    hours: float
    status: RowStatus = RowStatus.PENDING
    content_hash: str = ""
    source_rows: list[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def identity_key(self) -> str:
        return f"{self.person}|{self.date}|{self.shift}"


@dataclass
class AuditRecord:
    """人工修正留痕记录。"""
    record_id: str
    timestamp: str
    assignment_id: str
    before: dict[str, Any]
    after: dict[str, Any]
    operator: str = "ta"
    comment: str = ""


@dataclass
class CounterExample:
    """反例生成结果。"""
    ce_id: str
    rule: str
    description: str
    affected_assignments: list[str]
    severity: str = "warning"
    created_at: str = ""


@dataclass
class ProjectState:
    """项目状态，用于幂等运行。"""
    input_dir: str = ""
    output_dir: str = ""
    source_file_hashes: dict[str, str] = field(default_factory=dict)
    last_run: str = ""
    assignments: dict[str, Assignment] = field(default_factory=dict)
    audit: list[AuditRecord] = field(default_factory=list)
    counter_examples: list[CounterExample] = field(default_factory=list)

    def touch(self):
        self.last_run = datetime.now().isoformat(timespec="seconds")

    @staticmethod
    def file_hash(path: Path) -> str:
        h = hashlib.sha256()
        h.update(path.read_bytes())
        return h.hexdigest()[:16]

    def is_source_changed(self, input_dir: Path) -> bool:
        if not input_dir.exists():
            return False
        for p in sorted(input_dir.rglob("*")):
            if p.is_file():
                key = str(p.relative_to(input_dir))
                cur = self.file_hash(p)
                if self.source_file_hashes.get(key) != cur:
                    return True
        return bool(self.source_file_hashes) and not any(
            (input_dir / k).exists() for k in self.source_file_hashes
        )

    def refresh_source_hashes(self, input_dir: Path):
        self.source_file_hashes.clear()
        if not input_dir.exists():
            return
        for p in sorted(input_dir.rglob("*")):
            if p.is_file():
                key = str(p.relative_to(input_dir))
                self.source_file_hashes[key] = self.file_hash(p)
