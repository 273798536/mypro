"""数据模型定义"""
from __future__ import annotations

import csv
import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

from .exceptions import RowIssue


class ReviewStatus(str, Enum):
    """复核状态"""
    BAD_ROW = "bad_row"              # 坏行：格式不合法，无法解析
    SKIPPED = "skipped"              # 跳过：信息不足或标记为跳过
    PENDING = "pending"              # 待处理：需要补证据
    PROCESSED = "processed"          # 已处理：复核通过
    SUSPENDED = "suspended"          # 挂起：检测到旧版母带，等人工确认
    MANUAL_OK = "manual_ok"          # 人工批注通过
    MANUAL_REJECT = "manual_reject"  # 人工批注拒绝


class VersionJudgment(str, Enum):
    """版本判定"""
    MASTER = "master"                # 正确母带版本
    OLD_MASTER = "old_master"        # 旧版母带混入
    UNKNOWN = "unknown"              # 无法判断
    NOT_INTRO = "not_intro"          # 非片头曲目（跳过版本比对）


AUTHORIZATION_PATTERNS = [
    "授权", "授权期", "授权期限", "license", "expire", "到期",
    "版权", "著作权", "使用期", "有效期",
]

OLD_VERSION_MARKERS = [
    "旧版", "老版", "v1", "version 1", "ver1", "draft",
    "beta", "alpha", "pre", "未修", "待修", "rough",
    "初稿", "demo", "初版", "原始版",
]

INTRO_KEYWORDS = [
    "片头", "intro", "开场", "主题曲", "片头曲", "op",
    "opening", "前奏", "标题音乐",
]

DELIVERY_KEYWORDS = [
    "交付", "delivery", "成品", "final", "定稿", "最终版",
    "已交付", "delivered", "ok", "通过",
]


@dataclass
class AuthorizationNote:
    """授权备注信息"""
    raw_text: str
    has_authorization: bool
    expiry_date: Optional[str] = None
    source: str = ""

    def to_dict(self) -> dict:
        return {
            "raw_text": self.raw_text,
            "has_authorization": self.has_authorization,
            "expiry_date": self.expiry_date,
            "source": self.source,
        }


@dataclass
class ManualAnnotation:
    """人工批注"""
    annotator: str
    status: str
    comment: str
    annotated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> dict:
        return {
            "annotator": self.annotator,
            "status": self.status,
            "comment": self.comment,
            "annotated_at": self.annotated_at,
        }


@dataclass
class TrackRow:
    """曲目行（保留原始来源）"""
    row_number: int
    raw_csv_line: str                               # 原始 CSV 行原文
    raw_fields: list[str]                           # 原始字段拆分
    source_file: str                                # 来源文件名

    # 解析出的结构化字段（不覆盖原始数据）
    track_title: str = ""
    version_tag: str = ""
    duration: str = ""
    remark: str = ""
    performer: str = ""
    delivery_ref: str = ""                          # 交付清单编号

    # 复核元数据
    status: ReviewStatus = ReviewStatus.PENDING
    issues: list[RowIssue] = field(default_factory=list)
    version_judgment: VersionJudgment = VersionJudgment.UNKNOWN
    authorization: Optional[AuthorizationNote] = None
    delivery_matched: bool = False
    manual_annotation: Optional[ManualAnnotation] = None
    version_evidence: list[str] = field(default_factory=list)
    row_hash: str = ""                              # 原始行哈希，用于重扫对齐
    last_reviewed_at: Optional[str] = None

    def compute_hash(self) -> str:
        """基于原始行计算稳定哈希，用于重扫对齐"""
        payload = f"{self.source_file}|{self.row_number}|{self.raw_csv_line}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

    def __post_init__(self):
        if not self.row_hash:
            self.row_hash = self.compute_hash()

    def mark_processed(self):
        self.status = ReviewStatus.PROCESSED
        self.last_reviewed_at = datetime.now().isoformat(timespec="seconds")

    def mark_suspended(self, reason: str, evidence: list[str]):
        self.status = ReviewStatus.SUSPENDED
        self.issues.append(RowIssue(
            row_number=self.row_number,
            issue_type="old_master_suspected",
            message=reason,
            raw_data=self.raw_csv_line,
            suggestion="请确认是否为旧版母带混入，补充排练/授权备注后重扫",
        ))
        self.version_evidence.extend(evidence)
        self.last_reviewed_at = datetime.now().isoformat(timespec="seconds")

    def mark_bad(self, message: str, suggestion: Optional[str] = None):
        self.status = ReviewStatus.BAD_ROW
        self.issues.append(RowIssue(
            row_number=self.row_number,
            issue_type="bad_row",
            message=message,
            raw_data=self.raw_csv_line,
            suggestion=suggestion,
        ))

    def mark_skipped(self, reason: str):
        self.status = ReviewStatus.SKIPPED
        self.issues.append(RowIssue(
            row_number=self.row_number,
            issue_type="skipped",
            message=reason,
            raw_data=self.raw_csv_line,
        ))

    def apply_manual_annotation(self, annotation: ManualAnnotation):
        self.manual_annotation = annotation
        if annotation.status == "ok":
            self.status = ReviewStatus.MANUAL_OK
        elif annotation.status == "reject":
            self.status = ReviewStatus.MANUAL_REJECT
        self.last_reviewed_at = annotation.annotated_at

    def to_dict(self) -> dict:
        return {
            "row_number": self.row_number,
            "source_file": self.source_file,
            "row_hash": self.row_hash,
            "raw_csv_line": self.raw_csv_line,
            "raw_fields": self.raw_fields,
            "track_title": self.track_title,
            "version_tag": self.version_tag,
            "duration": self.duration,
            "remark": self.remark,
            "performer": self.performer,
            "delivery_ref": self.delivery_ref,
            "status": self.status.value,
            "issues": [i.to_dict() for i in self.issues],
            "version_judgment": self.version_judgment.value,
            "authorization": self.authorization.to_dict() if self.authorization else None,
            "delivery_matched": self.delivery_matched,
            "manual_annotation": self.manual_annotation.to_dict() if self.manual_annotation else None,
            "version_evidence": self.version_evidence,
            "last_reviewed_at": self.last_reviewed_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TrackRow":
        row = cls(
            row_number=data["row_number"],
            raw_csv_line=data["raw_csv_line"],
            raw_fields=data["raw_fields"],
            source_file=data["source_file"],
            track_title=data.get("track_title", ""),
            version_tag=data.get("version_tag", ""),
            duration=data.get("duration", ""),
            remark=data.get("remark", ""),
            performer=data.get("performer", ""),
            delivery_ref=data.get("delivery_ref", ""),
            status=ReviewStatus(data.get("status", "pending")),
            issues=[RowIssue(**i) for i in data.get("issues", [])],
            version_judgment=VersionJudgment(data.get("version_judgment", "unknown")),
            delivery_matched=data.get("delivery_matched", False),
            version_evidence=data.get("version_evidence", []),
            row_hash=data.get("row_hash", ""),
            last_reviewed_at=data.get("last_reviewed_at"),
        )
        auth = data.get("authorization")
        if auth:
            row.authorization = AuthorizationNote(**auth)
        ann = data.get("manual_annotation")
        if ann:
            row.manual_annotation = ManualAnnotation(**ann)
        return row


@dataclass
class ReviewSession:
    """一次复核会话"""
    session_id: str
    started_at: str
    tracklist_path: str
    delivery_list_path: Optional[str] = None
    annotation_path: Optional[str] = None
    tracks: list[TrackRow] = field(default_factory=list)
    ended_at: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "started_at": self.started_at,
            "tracklist_path": self.tracklist_path,
            "delivery_list_path": self.delivery_list_path,
            "annotation_path": self.annotation_path,
            "tracks": [t.to_dict() for t in self.tracks],
            "ended_at": self.ended_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ReviewSession":
        return cls(
            session_id=data["session_id"],
            started_at=data["started_at"],
            tracklist_path=data["tracklist_path"],
            delivery_list_path=data.get("delivery_list_path"),
            annotation_path=data.get("annotation_path"),
            tracks=[TrackRow.from_dict(t) for t in data.get("tracks", [])],
            ended_at=data.get("ended_at"),
        )

    def counters(self) -> dict:
        """统计各状态行数"""
        c = {s.value: 0 for s in ReviewStatus}
        for t in self.tracks:
            c[t.status.value] += 1
        c["total"] = len(self.tracks)
        return c
