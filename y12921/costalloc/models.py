from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Optional

# 默认美元折人民币汇率，可用 CLI --usd-rate 覆盖
USD_TO_CNY_DEFAULT = Decimal("7.2")

# 估算词：出现这些词说明金额不是精确值，需要人工再确认
APPROX_WORDS = ("约", "大约", "大概", "approx", "~", "左右")
WAN = "万"  # 中文数量单位，×10000

# 金额里可能混进去的币种写法 -> 标准币种代码
UNIT_TOKENS = (
    ("美元", "USD"), ("美金", "USD"), ("人民币", "CNY"),
    ("RMB", "CNY"), ("CNY", "CNY"), ("USD", "USD"),
    ("￥", "CNY"), ("¥", "CNY"), ("元", "CNY"), ("$", "USD"),
)


@dataclass
class ParseResult:
    """金额 / 时长解析结果。

    ok=False 表示这条数据有问题、需要人工再看一眼；problem 用人话说清原因。
    """
    amount: Optional[Decimal]
    currency: Optional[str]
    ok: bool
    problem: str = ""


def parse_money(raw, default_currency: Optional[str] = None) -> ParseResult:
    """容忍式金额解析：处理 '1,234.5 美元' / '¥12.5' / '约2.3万' / 漏填单位等情况。"""
    if raw is None:
        raw = ""
    s = str(raw).strip()
    if s == "":
        return ParseResult(None, default_currency, True, "")
    original = s
    currency = default_currency
    for tok, cur in UNIT_TOKENS:
        if tok in s:
            currency = cur
            s = s.replace(tok, " ")
    s = s.replace("，", ",").replace(" ", "")
    approx = any(w in s for w in APPROX_WORDS)
    for w in APPROX_WORDS:
        s = s.replace(w, "")
    wan = WAN in s
    s = s.replace(WAN, "")
    s = s.replace(",", "").strip()
    if s == "":
        return ParseResult(
            None, currency, False,
            f"只写了单位没写金额（原文：{original}），请补一个具体数字。",
        )
    try:
        amount = Decimal(s)
    except (InvalidOperation, ValueError):
        return ParseResult(
            None, currency, False,
            f"'{original}' 里有非数字字符，没法当成金额，请改成纯数字并写清币种。",
        )
    if wan:
        amount = amount * Decimal(10000)
    parts = []
    if approx:
        parts.append("带'约/左右'字样，是估算值不是精确值")
    if currency is None:
        parts.append("没写币种，分不清是人民币还是美元")
    problem = ""
    if parts:
        problem = "；".join(parts) + f"（原文：{original}）。"
    ok = (currency is not None) and not approx
    return ParseResult(amount, currency, ok, problem)


def parse_hours(raw) -> ParseResult:
    """容忍式时长解析：处理 '12h' / '12小时' / '12' 等。"""
    if raw is None:
        raw = ""
    s = str(raw).strip()
    if s == "":
        return ParseResult(None, None, True, "")
    original = s
    t = s.replace("小时", "").replace("hours", "").replace("hrs", "")
    t = t.replace("h", "").replace("H", "").replace("，", "").replace(",", "").strip()
    if t == "":
        return ParseResult(
            None, None, False,
            f"时长'{original}'里只有单位没有数字，请补具体小时数。",
        )
    try:
        return ParseResult(Decimal(t), None, True, "")
    except (InvalidOperation, ValueError):
        return ParseResult(
            None, None, False,
            f"时长'{original}'不是数字，请写成纯数字小时数（例如 12 或 12h）。",
        )


def _to_str(v) -> str:
    if v is None:
        return ""
    if isinstance(v, Decimal):
        return format(v, "f")
    return str(v)


def _to_dec(v) -> Optional[Decimal]:
    if v is None or v == "":
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError):
        return None


@dataclass
class TrainingTask:
    task_id: str
    name: str
    owner: str
    team: str
    project: str
    gpu_card: str
    gpu_hours: Optional[Decimal]
    gpu_hours_raw: str
    unit_price: Optional[Decimal]
    unit_price_raw: str
    currency: Optional[str]
    cost: Optional[Decimal]        # cost_raw 解析出的直接金额（可能为空，改用 时长×单价）
    cost_raw: str
    remark: str
    source: str                    # 旧表2024Q4 / 新表 / 补录
    run_date: str
    status: str                    # success / rolled_back / failed
    issues: list = field(default_factory=list)  # 解析时发现的人话问题

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "name": self.name,
            "owner": self.owner,
            "team": self.team,
            "project": self.project,
            "gpu_card": self.gpu_card,
            "gpu_hours": _to_str(self.gpu_hours),
            "gpu_hours_raw": self.gpu_hours_raw,
            "unit_price": _to_str(self.unit_price),
            "unit_price_raw": self.unit_price_raw,
            "currency": self.currency or "",
            "cost": _to_str(self.cost),
            "cost_raw": self.cost_raw,
            "remark": self.remark,
            "source": self.source,
            "run_date": self.run_date,
            "status": self.status,
            "issues": list(self.issues),
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TrainingTask":
        return cls(
            task_id=d["task_id"], name=d.get("name", ""), owner=d.get("owner", ""),
            team=d.get("team", ""), project=d.get("project", ""), gpu_card=d.get("gpu_card", ""),
            gpu_hours=_to_dec(d.get("gpu_hours")), gpu_hours_raw=d.get("gpu_hours_raw", ""),
            unit_price=_to_dec(d.get("unit_price")), unit_price_raw=d.get("unit_price_raw", ""),
            currency=d.get("currency") or None, cost=_to_dec(d.get("cost")),
            cost_raw=d.get("cost_raw", ""), remark=d.get("remark", ""),
            source=d.get("source", ""), run_date=d.get("run_date", ""),
            status=d.get("status", "success"), issues=list(d.get("issues", [])),
        )


@dataclass
class AllocationRule:
    rule_id: str
    scope: str                     # global / team / project
    target: str                     # * / 团队名 / 项目名
    unit_price_override: Optional[Decimal]
    currency: Optional[str]
    effective_from: str
    arrived_late: bool             # 安全规则晚到
    note: str
    gpu_card: str = ""             # 限定卡型，留空表示不限卡型

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id, "scope": self.scope, "target": self.target,
            "unit_price_override": _to_str(self.unit_price_override),
            "currency": self.currency or "", "effective_from": self.effective_from,
            "arrived_late": self.arrived_late, "note": self.note,
            "gpu_card": self.gpu_card,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "AllocationRule":
        return cls(
            rule_id=d["rule_id"], scope=d.get("scope", "global"), target=d.get("target", "*"),
            unit_price_override=_to_dec(d.get("unit_price_override")),
            currency=d.get("currency") or None, effective_from=d.get("effective_from", ""),
            arrived_late=str(d.get("arrived_late", "")).strip().lower() in ("1", "true", "yes", "y"),
            note=d.get("note", ""), gpu_card=d.get("gpu_card", ""),
        )


@dataclass
class FeedbackRecord:
    fb_id: str
    task_id: str
    action: str                     # confirm / supplement / correct
    reviewer: str
    value_raw: str
    unit_raw: str
    remark: str
    ts: str
    parsed_amount: Optional[Decimal] = None
    parsed_currency: Optional[str] = None
    parsed_hours: Optional[Decimal] = None
    ok: bool = True
    problem: str = ""

    def to_dict(self) -> dict:
        return {
            "fb_id": self.fb_id, "task_id": self.task_id, "action": self.action,
            "reviewer": self.reviewer, "value_raw": self.value_raw, "unit_raw": self.unit_raw,
            "remark": self.remark, "ts": self.ts,
            "parsed_amount": _to_str(self.parsed_amount),
            "parsed_currency": self.parsed_currency or "",
            "parsed_hours": _to_str(self.parsed_hours),
            "ok": self.ok, "problem": self.problem,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "FeedbackRecord":
        return cls(
            fb_id=d["fb_id"], task_id=d["task_id"], action=d.get("action", ""),
            reviewer=d.get("reviewer", ""), value_raw=d.get("value_raw", ""),
            unit_raw=d.get("unit_raw", ""), remark=d.get("remark", ""), ts=d.get("ts", ""),
            parsed_amount=_to_dec(d.get("parsed_amount")),
            parsed_currency=d.get("parsed_currency") or None,
            parsed_hours=_to_dec(d.get("parsed_hours")),
            ok=d.get("ok", True), problem=d.get("problem", ""),
        )


@dataclass
class TaskAllocation:
    """单个任务的分摊结果（含调整前后判定）。"""
    task_id: str
    name: str
    owner: str
    team: str
    project: str
    gpu_card: str
    gpu_hours: Optional[Decimal]
    unit_price: Optional[Decimal]
    currency: str
    resolved_cost: Decimal
    rule_applied: Optional[str]
    judgment_before: str           # 正常 / 异常(偏高) / 待定
    judgment_after: str
    judgment_changed: bool
    confirmed: bool
    rolled_back_preserved: bool
    contribution_share: Optional[Decimal]   # 占该团队合计的比例
    remark: str
    sources_note: str              # 数据来源/规则/补录说明，人话

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id, "name": self.name, "owner": self.owner,
            "team": self.team, "project": self.project, "gpu_card": self.gpu_card,
            "gpu_hours": _to_str(self.gpu_hours), "unit_price": _to_str(self.unit_price),
            "currency": self.currency, "resolved_cost": _to_str(self.resolved_cost),
            "rule_applied": self.rule_applied or "",
            "judgment_before": self.judgment_before, "judgment_after": self.judgment_after,
            "judgment_changed": self.judgment_changed, "confirmed": self.confirmed,
            "rolled_back_preserved": self.rolled_back_preserved,
            "contribution_share": _to_str(self.contribution_share),
            "remark": self.remark, "sources_note": self.sources_note,
        }


@dataclass
class AllocationRun:
    """一次分摊运行的完整快照（含版本与回滚标记，回滚后记录仍保留可查）。"""
    version: int
    ts: str
    note: str
    rolled_back: bool
    result: dict  # 完整 AllocationResult 快照（allocations/team_totals/needs_attention/...）

    def to_dict(self) -> dict:
        return {
            "version": self.version, "ts": self.ts, "note": self.note,
            "rolled_back": self.rolled_back, "result": self.result,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "AllocationRun":
        return cls(
            version=int(d["version"]), ts=d.get("ts", ""), note=d.get("note", ""),
            rolled_back=bool(d.get("rolled_back", False)),
            result=dict(d.get("result", {})),
        )
