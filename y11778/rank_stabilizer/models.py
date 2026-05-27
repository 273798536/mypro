from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from datetime import datetime


class TieStrategy(Enum):
    GOLD_FIRST = "gold_first"
    SILVER_FIRST = "silver_first"
    BRONZE_FIRST = "bronze_first"
    TOTAL_MEDALS = "total_medals"
    BEST_SINGLE = "best_single"
    HEAD_TO_HEAD = "head_to_head"
    ALPHABETICAL = "alphabetical"
    DRAW_LOT = "draw_lot"


class WithdrawalScorePolicy(Enum):
    ZERO = "zero"
    LAST_PLACE = "last_place"
    AVERAGE = "average"
    DISQUALIFY = "disqualify"


class AppealStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class WarningSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class Event:
    event_id: str
    name: str
    weight: float = 1.0
    max_score: Optional[float] = None
    is_team: bool = False
    source: str = "input"


@dataclass
class AthleteScore:
    athlete_id: str
    athlete_name: str
    event_id: str
    score: Optional[float]
    is_withdrawal: bool = False
    withdrawal_reason: Optional[str] = None
    source: str = "input"
    raw_score: Optional[float] = None
    adjusted: bool = False
    adjustment_reason: Optional[str] = None


@dataclass
class TieRule:
    rule_id: str
    event_id: Optional[str]
    strategy: TieStrategy
    priority: int = 0
    description: str = ""
    source: str = "input"
    is_active: bool = True


@dataclass
class Withdrawal:
    athlete_id: str
    event_id: str
    reason: str = ""
    score_policy: WithdrawalScorePolicy = WithdrawalScorePolicy.ZERO
    source: str = "input"
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class AppealNote:
    appeal_id: str
    athlete_id: str
    event_id: Optional[str]
    description: str
    status: AppealStatus = AppealStatus.PENDING
    submitted_at: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved_at: Optional[str] = None
    resolution: Optional[str] = None
    source: str = "input"


@dataclass
class AuditEntry:
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    action: str = ""
    target: str = ""
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    source: str = "system"
    reason: str = ""


@dataclass
class WarningItem:
    severity: WarningSeverity
    category: str
    message: str
    athlete_id: Optional[str] = None
    event_id: Optional[str] = None
    detail: Optional[str] = None


@dataclass
class RankEntry:
    rank: int
    athlete_id: str
    athlete_name: str
    total_score: float
    weighted_score: float
    event_scores: dict = field(default_factory=dict)
    is_tied: bool = False
    tie_strategy_used: Optional[str] = None
    tie_break_detail: Optional[str] = None
    is_withdrawal_affected: bool = False
    withdrawal_events: list = field(default_factory=list)
    appeal_ids: list = field(default_factory=list)
    explanation: str = ""


@dataclass
class RankingReport:
    title: str
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    entries: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    audit_trail: list = field(default_factory=list)
    tie_rules_applied: list = field(default_factory=list)
    event_weights: dict = field(default_factory=dict)
    total_athletes: int = 0
    total_events: int = 0
