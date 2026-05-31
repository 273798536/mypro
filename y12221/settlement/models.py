from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class IssueType(Enum):
    REMATCH_RECALCULATION = "rematch_recalculation"
    MISSING_EXPOSURE_PROOF = "missing_exposure_proof"
    TIE_RANKING = "tie_ranking"
    INSUFFICIENT_LIVESTREAM_DURATION = "insufficient_livestream_duration"
    CONTRACT_MISMATCH = "contract_mismatch"
    DATA_INCONSISTENCY = "data_inconsistency"


class IssueStatus(Enum):
    PENDING_CONFIRMATION = "pending_confirmation"
    EXCEPTION = "exception"
    RESOLVED = "resolved"
    WAIVED = "waived"


class SettlementStatus(Enum):
    DRAFT = "draft"
    VERIFYING = "verifying"
    ISSUES_FOUND = "issues_found"
    READY_FOR_SETTLEMENT = "ready_for_settlement"
    SETTLED = "settled"
    DISPUTED = "disputed"


@dataclass
class SponsorshipContract:
    contract_id: str
    sponsor_name: str
    team_id: str
    tournament_id: str
    start_date: str
    end_date: str
    exposure_requirements: Dict[str, Any]
    livestream_requirements: Dict[str, Any]
    ranking_bonus: Dict[int, float]
    base_fee: float
    tier_rates: Dict[str, float]
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    remarks: Optional[str] = None


@dataclass
class LivestreamRecord:
    record_id: str
    contract_id: str
    stream_date: str
    platform: str
    duration_minutes: int
    sponsor_mentions: int
    recorded_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_supplementary: bool = False
    source_note: Optional[str] = None


@dataclass
class ExposureProof:
    proof_id: str
    contract_id: str
    exposure_type: str
    exposure_date: str
    proof_url: Optional[str] = None
    proof_description: Optional[str] = None
    recorded_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_supplementary: bool = False
    verified: bool = False


@dataclass
class TournamentResult:
    result_id: str
    tournament_id: str
    team_id: str
    rank: int
    final_score: float
    result_date: str
    is_rematch_result: bool = False
    original_rank: Optional[int] = None
    rematch_reason: Optional[str] = None
    recorded_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class IssueRecord:
    issue_id: str
    contract_id: str
    issue_type: IssueType
    issue_status: IssueStatus
    title: str
    description: str
    root_cause: str
    handling_suggestion: str
    source_data: Dict[str, Any]
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved_at: Optional[str] = None
    resolution_note: Optional[str] = None
    dispute_remarks: Optional[str] = None


@dataclass
class SettlementRecord:
    settlement_id: str
    contract_id: str
    status: SettlementStatus
    base_fee: float = 0.0
    exposure_fee: float = 0.0
    livestream_fee: float = 0.0
    ranking_bonus: float = 0.0
    total_amount: float = 0.0
    deduction_amount: float = 0.0
    final_amount: float = 0.0
    calculation_details: Dict[str, Any] = field(default_factory=dict)
    issue_ids: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: int = 1
    version_history: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SettlementContext:
    contracts: Dict[str, SponsorshipContract] = field(default_factory=dict)
    livestreams: Dict[str, List[LivestreamRecord]] = field(default_factory=dict)
    exposures: Dict[str, List[ExposureProof]] = field(default_factory=dict)
    results: Dict[str, TournamentResult] = field(default_factory=dict)
    settlements: Dict[str, SettlementRecord] = field(default_factory=dict)
    issues: Dict[str, IssueRecord] = field(default_factory=dict)
