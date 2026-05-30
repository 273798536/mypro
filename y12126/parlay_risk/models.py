from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import json


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class LegStatus(str, Enum):
    PENDING = "PENDING"
    WON = "WON"
    LOST = "LOST"
    VOID = "VOID"
    EXPIRED = "EXPIRED"


class OddStatus(str, Enum):
    VALID = "VALID"
    EXPIRED = "EXPIRED"
    SUSPENDED = "SUSPENDED"
    NOT_FOUND = "NOT_FOUND"


@dataclass
class MatchOdds:
    match_id: str
    league: str
    home_team: str
    away_team: str
    market_type: str
    selection: str
    odd_value: float
    update_time: datetime
    expiry_time: Optional[datetime] = None
    status: OddStatus = OddStatus.VALID
    raw_data: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MatchOdds":
        return cls(
            match_id=data["match_id"],
            league=data.get("league", "Unknown"),
            home_team=data["home_team"],
            away_team=data["away_team"],
            market_type=data["market_type"],
            selection=data["selection"],
            odd_value=float(data["odd_value"]),
            update_time=datetime.fromisoformat(data["update_time"]) if isinstance(data.get("update_time"), str) else data.get("update_time", datetime.now()),
            expiry_time=datetime.fromisoformat(data["expiry_time"]) if data.get("expiry_time") else None,
            status=OddStatus(data.get("status", "VALID")),
            raw_data=data
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["update_time"] = self.update_time.isoformat() if self.update_time else None
        d["expiry_time"] = self.expiry_time.isoformat() if self.expiry_time else None
        d["status"] = self.status.value
        del d["raw_data"]
        return d


@dataclass
class StakeRecord:
    stake_id: str
    bettor_id: str
    amount: float
    currency: str
    placed_time: datetime
    parlay_id: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StakeRecord":
        return cls(
            stake_id=data.get("stake_id", str(uuid.uuid4())[:8]),
            bettor_id=data.get("bettor_id", "unknown"),
            amount=float(data["amount"]),
            currency=data.get("currency", "CNY"),
            placed_time=datetime.fromisoformat(data["placed_time"]) if isinstance(data.get("placed_time"), str) else data.get("placed_time", datetime.now()),
            parlay_id=data.get("parlay_id"),
            raw_data=data
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["placed_time"] = self.placed_time.isoformat()
        del d["raw_data"]
        return d


@dataclass
class MatchResult:
    match_id: str
    home_score: int
    away_score: int
    completed_time: Optional[datetime] = None
    is_final: bool = True
    raw_data: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MatchResult":
        return cls(
            match_id=data["match_id"],
            home_score=int(data["home_score"]),
            away_score=int(data["away_score"]),
            completed_time=datetime.fromisoformat(data["completed_time"]) if data.get("completed_time") else None,
            is_final=data.get("is_final", True),
            raw_data=data
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["completed_time"] = self.completed_time.isoformat() if self.completed_time else None
        del d["raw_data"]
        return d


@dataclass
class ParlayLeg:
    leg_id: str
    match_odds: MatchOdds
    result: Optional[MatchResult] = None
    status: LegStatus = LegStatus.PENDING
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "leg_id": self.leg_id,
            "trace_id": self.trace_id,
            "match_id": self.match_odds.match_id,
            "match": f"{self.match_odds.home_team} vs {self.match_odds.away_team}",
            "market": self.match_odds.market_type,
            "selection": self.match_odds.selection,
            "odd_value": self.match_odds.odd_value,
            "odd_status": self.match_odds.status.value,
            "leg_status": self.status.value,
            "result": f"{self.result.home_score}-{self.result.away_score}" if self.result else None,
            "expiry_time": self.match_odds.expiry_time.isoformat() if self.match_odds.expiry_time else None
        }


@dataclass
class ValidationIssue:
    level: str
    code: str
    message: str
    leg_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "code": self.code,
            "message": self.message,
            "leg_id": self.leg_id,
            "details": self.details
        }


@dataclass
class CorrelationResult:
    leg_a_id: str
    leg_b_id: str
    correlation: float
    reason: str
    match_a: str
    match_b: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "leg_a_id": self.leg_a_id,
            "leg_b_id": self.leg_b_id,
            "correlation": round(self.correlation, 4),
            "reason": self.reason,
            "match_a": self.match_a,
            "match_b": self.match_b
        }


@dataclass
class ParlayBet:
    parlay_id: str
    legs: List[ParlayLeg]
    stake: StakeRecord
    total_odds: float = 1.0
    potential_payout: float = 0.0
    actual_payout: float = 0.0
    profit: float = 0.0
    status: LegStatus = LegStatus.PENDING
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = 0.0
    validation_issues: List[ValidationIssue] = field(default_factory=list)
    correlations: List[CorrelationResult] = field(default_factory=list)
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    calculation_trace: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parlay_id": self.parlay_id,
            "trace_id": self.trace_id,
            "stake_amount": self.stake.amount,
            "leg_count": len(self.legs),
            "legs": [leg.to_dict() for leg in self.legs],
            "total_odds": round(self.total_odds, 4),
            "potential_payout": round(self.potential_payout, 2),
            "actual_payout": round(self.actual_payout, 2),
            "profit": round(self.profit, 2),
            "status": self.status.value,
            "risk_level": self.risk_level.value,
            "risk_score": round(self.risk_score, 4),
            "validation_issues": [issue.to_dict() for issue in self.validation_issues],
            "high_correlations": [c.to_dict() for c in self.correlations if c.correlation >= 0.7],
            "all_correlations": [c.to_dict() for c in self.correlations],
            "calculation_trace": self.calculation_trace
        }


@dataclass
class RiskReport:
    report_id: str
    generated_at: datetime
    total_parlays: int
    total_stake: float
    total_potential_payout: float
    total_actual_payout: float
    total_profit: float
    risk_distribution: Dict[RiskLevel, int]
    parlays: List[ParlayBet]
    summary_issues: List[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "generated_at": self.generated_at.isoformat(),
            "summary": {
                "total_parlays": self.total_parlays,
                "total_stake": round(self.total_stake, 2),
                "total_potential_payout": round(self.total_potential_payout, 2),
                "total_actual_payout": round(self.total_actual_payout, 2),
                "total_profit": round(self.total_profit, 2),
                "risk_distribution": {k.value: v for k, v in self.risk_distribution.items()},
                "critical_issues_count": len([i for i in self.summary_issues if i.level == "CRITICAL"]),
                "warning_issues_count": len([i for i in self.summary_issues if i.level == "WARNING"])
            },
            "summary_issues": [issue.to_dict() for issue in self.summary_issues],
            "parlays": [p.to_dict() for p in self.parlays]
        }
