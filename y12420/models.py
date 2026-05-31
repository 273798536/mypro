from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import uuid4


class RightType(Enum):
    RECORDING = "录音权"
    MECHANICAL = "机械权"
    PERFORMANCE = "表演权"
    SYNCHRONIZATION = "同步权"


class ConflictType(Enum):
    DUPLICATE_CONTRACT_NO = "合同编号重复"
    LATE_VERSION = "晚到版本"
    OWNERSHIP_OVERLAP = "权属重叠"
    PLAYBACK_SUPPLEMENT = "播放量补录"
    RATIO_EXPIRED = "比例过期"
    DATA_INCONSISTENCY = "数据不一致"


class RecordStatus(Enum):
    DRAFT = "草稿"
    CONFIRMED = "已确认"
    SUPERSEDED = "已被取代"
    PENDING_REVIEW = "待审核"


@dataclass
class TrackOwnership:
    track_id: str
    track_name: str
    isrc: str
    right_type: RightType
    owner_id: str
    owner_name: str
    ownership_ratio: float
    effective_start: date
    effective_end: Optional[date]
    territory: str
    source_contract_id: str
    version: int = 1
    status: RecordStatus = RecordStatus.CONFIRMED
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class PlatformPlayback:
    playback_id: str
    track_id: str
    track_name: str
    isrc: str
    platform: str
    play_count: int
    revenue_amount: float
    settlement_month: str
    is_supplementary: bool = False
    supplementary_note: Optional[str] = None
    original_playback_id: Optional[str] = None
    status: RecordStatus = RecordStatus.CONFIRMED
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class NeighboringRightsContract:
    contract_id: str
    contract_no: str
    contract_name: str
    party_a: str
    party_b: str
    right_type: RightType
    tracks_covered: List[str]
    revenue_sharing_ratio: float
    effective_start: date
    effective_end: Optional[date]
    territory: str
    version: int = 1
    is_late_arrival: bool = False
    status: RecordStatus = RecordStatus.CONFIRMED
    signed_date: Optional[date] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class DataIssue:
    issue_id: str = field(default_factory=lambda: str(uuid4()))
    conflict_type: ConflictType = None
    severity: str = "warning"
    description: str = ""
    related_records: List[str] = field(default_factory=list)
    suggestion: str = ""
    affected_amount: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    resolved: bool = False
    resolution_note: Optional[str] = None


@dataclass
class SettlementDetail:
    detail_id: str
    settlement_batch_id: str
    track_id: str
    track_name: str
    isrc: str
    platform: str
    play_count: int
    total_revenue: float
    right_type: RightType
    owner_id: str
    owner_name: str
    ownership_ratio: float
    contract_ratio: float
    final_ratio: float
    settlement_amount: float
    issues: List[DataIssue] = field(default_factory=list)
    processing_notes: List[str] = field(default_factory=list)
    is_supplementary: bool = False
    supplementary_impact: Optional[Dict[str, Any]] = None


@dataclass
class SettlementBatch:
    batch_id: str
    settlement_month: str
    status: str = "processing"
    total_revenue: float = 0.0
    total_settlement: float = 0.0
    issues_summary: Dict[str, int] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    notes: str = ""


@dataclass
class SettlementReport:
    batch_id: str
    settlement_month: str
    generated_at: datetime
    summary: Dict[str, Any]
    details: List[SettlementDetail]
    issues: List[DataIssue]
    handling_suggestions: List[str]
    supplementary_impacts: List[Dict[str, Any]]
