"""
数据模型定义
============

核心数据结构:
    ReactionRecord   - 单条反应配平记录 (可追溯到来源和每次修改)
    BatchReport      - 批次报告 (聚合多条反应记录, 含空白对照和质控)
    AuditTrailEntry  - 审计追踪条目 (每一次操作都留痕)
    RetestSuggestion - 复测建议 (日常入口)
    DataStore        - 完整数据存储 (内存对象 + JSON 持久化)

关键约束:
    1. 空白对照检测: 每个批次必须包含至少一条空白对照 (is_blank=True)
    2. 去重机制:     同一批次内, (反应方程式正则化 + 反应条件) 作为唯一键
    3. 状态一致性:   reaction.status 与 batch.summary 必须一致, 不允许"页面通过/文件待确认"
"""

import hashlib
import json
import re
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field, model_validator


def now_iso() -> str:
    """返回当前 UTC 时间的 ISO 格式字符串"""
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str = "") -> str:
    """生成带前缀的唯一 ID, 如 rct_8f3a2c..."""
    suffix = uuid.uuid4().hex[:12]
    return f"{prefix}_{suffix}" if prefix else suffix


def canonical_equation(raw: str) -> str:
    """
    将方程式正则化, 作为去重键的一部分。
    忽略空格、箭头类型、系数为 1 的省略形式, 统一排序。
    """
    if not raw:
        return ""
    s = re.sub(r"\s+", "", raw)
    for arrow in ["→", "->", "═", "="]:
        if arrow in s:
            left, right = s.split(arrow, 1)
            break
    else:
        return s
    left_items = sorted([_normalize_compound(c) for c in left.split("+") if c])
    right_items = sorted([_normalize_compound(c) for c in right.split("+") if c])
    return "+".join(left_items) + "->" + "+".join(right_items)


def _normalize_compound(c: str) -> str:
    m = re.match(r"^(\d*)(.+)$", c)
    if not m:
        return c
    coef, formula = m.group(1), m.group(2)
    coef_int = int(coef) if coef else 1
    return f"{coef_int}{formula}" if coef_int != 1 else formula


def reaction_fingerprint(raw_equation: str, conditions: str = "", experiment_id: str = "") -> str:
    """生成反应指纹, 用于去重和补录匹配"""
    key = canonical_equation(raw_equation) + "|" + (conditions or "") + "|" + (experiment_id or "")
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]


class ReactionStatus(str, Enum):
    """反应记录审核状态"""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    NEEDS_RETEST = "needs_retest"
    BLANK_CONTROL = "blank_control"

    @property
    def display_name(self) -> str:
        return {
            "pending": "待确认",
            "verified": "通过",
            "rejected": "驳回",
            "needs_retest": "需复测",
            "blank_control": "空白对照",
        }[self.value]

    @property
    def is_approved(self) -> bool:
        """用于报告摘要统计: 通过或空白对照视为有效"""
        return self in (ReactionStatus.VERIFIED, ReactionStatus.BLANK_CONTROL)


class AuditAction(str, Enum):
    """审计追踪操作类型"""
    CREATE = "create"
    UPDATE = "update"
    IMPORT = "import"
    VERIFY = "verify"
    REJECT = "reject"
    REQUEST_RETEST = "request_retest"
    SUPPLEMENT = "supplement"
    MARK_BLANK = "mark_blank"
    EXPORT = "export"
    DELETE = "delete"


class RetestPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def display_name(self) -> str:
        return {"low": "低", "medium": "中", "high": "高", "critical": "紧急"}[self.value]


class ElementCount(BaseModel):
    element: str
    reactant_total: int
    product_total: int
    conserved: bool


class BalanceRecord(BaseModel):
    """配平过程记录 (用于追溯)"""
    method: str
    raw_equation: str
    balanced_equation: str
    coefficients: List[int] = Field(default_factory=list)
    element_table: List[ElementCount] = Field(default_factory=list)
    success: bool
    fail_reason: Optional[str] = None
    fail_message: str = ""
    balanced_at: str = Field(default_factory=now_iso)
    balancer_version: str = "1.0.0"


class ReactionRecord(BaseModel):
    """
    单条反应记录

    唯一约束 (在 BatchReport 内): fingerprint 相同视为同一条反应
    """
    id: str = Field(default_factory=lambda: make_id("rct"))
    batch_id: str
    fingerprint: str = ""
    raw_equation: str
    balanced_equation: str = ""
    reaction_conditions: str = ""
    experiment_id: str = ""
    notes: str = ""
    operator: str = ""
    is_blank: bool = False
    status: ReactionStatus = ReactionStatus.PENDING
    balance_result: Optional[BalanceRecord] = None
    retest_suggestion_ids: List[str] = Field(default_factory=list)
    source: str = "manual"
    source_ref: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

    @model_validator(mode="after")
    def _ensure_fingerprint(self):
        if not self.fingerprint:
            self.fingerprint = reaction_fingerprint(
                self.raw_equation, self.reaction_conditions, self.experiment_id
            )
        return self

    def summary_line(self) -> Dict[str, Any]:
        """导出/界面通用的一行摘要, 保证摘要和导出内容一致"""
        return {
            "id": self.id,
            "experiment_id": self.experiment_id,
            "equation": self.balanced_equation or self.raw_equation,
            "status": self.status.value,
            "status_display": self.status.display_name,
            "is_blank": self.is_blank,
            "operator": self.operator,
            "updated_at": self.updated_at,
        }


class AuditTrailEntry(BaseModel):
    """审计追踪: 每一次修改都留痕"""
    id: str = Field(default_factory=lambda: make_id("aud"))
    batch_id: Optional[str] = None
    reaction_id: Optional[str] = None
    action: AuditAction
    operator: str = ""
    timestamp: str = Field(default_factory=now_iso)
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    comment: str = ""

    def describe(self) -> str:
        action_names = {
            "create": "创建", "update": "更新", "import": "导入",
            "verify": "审核通过", "reject": "驳回", "request_retest": "申请复测",
            "supplement": "补录", "mark_blank": "标记空白对照", "export": "导出",
            "delete": "删除",
        }
        name = action_names.get(self.action.value, self.action.value)
        return f"[{self.timestamp[:19]}] {name} by {self.operator or 'system'}: {self.comment}"


class RetestSuggestion(BaseModel):
    """
    复测建议 (日常入口)

    生成场景:
        - 配平失败 (fail_reason != null)
        - 状态被标记为 needs_retest
        - 空白对照缺失时为整个批次生成
        - 同指纹多结论冲突时
    """
    id: str = Field(default_factory=lambda: make_id("ret"))
    batch_id: str
    reaction_id: Optional[str] = None
    priority: RetestPriority = RetestPriority.MEDIUM
    reason: str
    recommendation: str = ""
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)
    resolved: bool = False
    resolved_at: Optional[str] = None
    resolved_by: str = ""

    @property
    def is_critical(self) -> bool:
        return self.priority in (RetestPriority.HIGH, RetestPriority.CRITICAL)


class BatchSummary(BaseModel):
    """
    批次摘要

    重要: 此对象与导出文件中的"摘要"完全一致, 保证不出现"页面通过/文件待确认"。
    """
    batch_id: str
    title: str
    total_reactions: int = 0
    blank_count: int = 0
    verified_count: int = 0
    pending_count: int = 0
    rejected_count: int = 0
    needs_retest_count: int = 0
    has_blank_control: bool = False
    duplicate_conflicts: int = 0
    all_consistent: bool = True
    last_updated: str = Field(default_factory=now_iso)

    @property
    def approval_rate(self) -> float:
        if self.total_reactions == 0:
            return 0.0
        return (self.verified_count + self.blank_count) / self.total_reactions

    def to_display_dict(self) -> Dict[str, Any]:
        d = self.model_dump()
        d["approval_rate_display"] = f"{self.approval_rate * 100:.1f}%"
        d["status_overview"] = (
            f"共{self.total_reactions}条 | "
            f"通过{self.verified_count} | "
            f"空白{self.blank_count} | "
            f"待确认{self.pending_count} | "
            f"需复测{self.needs_retest_count} | "
            f"驳回{self.rejected_count}"
        )
        return d


class BatchReport(BaseModel):
    """
    批次报告

    核心不变量:
        - reactions 内 fingerprint 唯一 (除非明确标注冲突)
        - summary 由 reactions 实时计算, 不允许手动修改不一致
        - 必须可以从 summary 追溯到每条 reaction, 再到 audit_trail
    """
    id: str = Field(default_factory=lambda: make_id("bat"))
    title: str
    operator: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    description: str = ""
    reactions: List[ReactionRecord] = Field(default_factory=list)
    retest_suggestions: List[RetestSuggestion] = Field(default_factory=list)
    audit_trail: List[AuditTrailEntry] = Field(default_factory=list)

    def compute_summary(self) -> BatchSummary:
        """根据 reactions 实时计算摘要, 保证界面和导出一致"""
        verified = sum(1 for r in self.reactions if r.status == ReactionStatus.VERIFIED)
        pending = sum(1 for r in self.reactions if r.status == ReactionStatus.PENDING)
        rejected = sum(1 for r in self.reactions if r.status == ReactionStatus.REJECTED)
        needs_retest = sum(1 for r in self.reactions if r.status == ReactionStatus.NEEDS_RETEST)
        blank = sum(1 for r in self.reactions if r.is_blank)

        fps: Dict[str, List[str]] = {}
        for r in self.reactions:
            fps.setdefault(r.fingerprint, []).append(r.id)
        conflicts = sum(1 for ids in fps.values() if len(ids) > 1)

        all_consistent = conflicts == 0 and pending == 0 and needs_retest == 0

        return BatchSummary(
            batch_id=self.id,
            title=self.title,
            total_reactions=len(self.reactions),
            blank_count=blank,
            verified_count=verified,
            pending_count=pending,
            rejected_count=rejected,
            needs_retest_count=needs_retest,
            has_blank_control=blank > 0,
            duplicate_conflicts=conflicts,
            all_consistent=all_consistent,
            last_updated=self.updated_at,
        )

    def find_duplicates(self) -> Dict[str, List[str]]:
        """返回 {fingerprint: [reaction_ids]} 仅含冲突的分组"""
        fps: Dict[str, List[str]] = {}
        for r in self.reactions:
            fps.setdefault(r.fingerprint, []).append(r.id)
        return {fp: ids for fp, ids in fps.items() if len(ids) > 1}

    def get_reaction(self, reaction_id: str) -> Optional[ReactionRecord]:
        for r in self.reactions:
            if r.id == reaction_id:
                return r
        return None

    def trace_reaction(self, reaction_id: str) -> List[AuditTrailEntry]:
        """从反应 ID 回溯所有相关审计记录"""
        return [
            e for e in self.audit_trail
            if e.reaction_id == reaction_id or (e.batch_id == self.id and not e.reaction_id)
        ]


class DataStore(BaseModel):
    """完整数据存储"""
    batches: List[BatchReport] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

    def get_batch(self, batch_id: str) -> Optional[BatchReport]:
        for b in self.batches:
            if b.id == batch_id:
                return b
        return None

    def add_batch(self, batch: BatchReport) -> None:
        self.batches.append(batch)
        self.updated_at = now_iso()

    def to_json(self, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent)

    @classmethod
    def from_json(cls, text: str) -> "DataStore":
        data = json.loads(text)
        return cls(**data)
