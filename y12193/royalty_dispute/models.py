from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional
from enum import Enum
from uuid import uuid4


class RoyaltyType(Enum):
    MECHANICAL = "机械复制权"
    PERFORMANCE = "表演权"
    SYNCHRONIZATION = "同步权"
    RECORDING = "录音权"


class DistributionChannel(Enum):
    STREAMING = "流媒体"
    DOWNLOAD = "下载"
    PHYSICAL = "实体"
    RADIO = "广播"
    LIVE = "现场"


@dataclass
class RightsHolder:
    id: str
    name: str
    type: str
    royalty_type: RoyaltyType


@dataclass
class Contract:
    id: str
    rights_holder_id: str
    royalty_type: RoyaltyType
    percentage: float
    effective_date: date
    expiry_date: Optional[date]
    source_file: str
    priority: int = 0


@dataclass
class ChannelDeduction:
    id: str
    channel: DistributionChannel
    description: str
    percentage: float
    amount: float
    effective_date: date
    source_file: str


@dataclass
class RoyaltyRecord:
    id: str = field(default_factory=lambda: str(uuid4()))
    track_id: str = ""
    track_name: str = ""
    artist: str = ""
    channel: DistributionChannel = DistributionChannel.STREAMING
    revenue: float = 0.0
    report_date: date = field(default_factory=date.today)
    source_file: str = ""
    deductions: List[ChannelDeduction] = field(default_factory=list)
    contracts: List[Contract] = field(default_factory=list)


@dataclass
class SplitResult:
    record_id: str
    rights_holder_id: str
    rights_holder_name: str
    royalty_type: str
    original_amount: float
    deduction_amount: float
    net_amount: float
    contract_percentage: float
    final_amount: float
    contract_snapshot: dict = field(default_factory=dict)
    source_refs: List[str] = field(default_factory=list)


@dataclass
class ValidationIssue:
    record_id: str
    track_name: str
    issue_type: str
    severity: str
    message: str
    source_refs: List[str]


@dataclass
class ContractSnapshot:
    contract_id: str
    rights_holder_name: str
    royalty_type: str
    percentage: float
    effective_date: str
    expiry_date: str
    source_file: str
