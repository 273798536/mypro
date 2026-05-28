import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


class CustomerTier(enum.Enum):
    VIP = "vip"
    NORMAL = "normal"
    LOW = "low"


class CallStatus(enum.Enum):
    WAITING = "waiting"
    SERVING = "serving"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    TIMEOUT = "timeout"


class StrategyName(enum.Enum):
    FIFO = "fifo"
    VIP_FIRST = "vip_first"
    SKILL_MATCH = "skill_match"
    VIP_SKILL_HYBRID = "vip_skill_hybrid"
    WEIGHTED_FAIR = "weighted_fair"


class AnomalyType(enum.Enum):
    VIP_SQUEEZE = "vip_squeeze"
    SKILL_MISMATCH = "skill_mismatch"
    LONG_TAIL_WAIT = "long_tail_wait"
    STARVATION = "starvation"
    ABANDON_SPIKE = "abandon_spike"


@dataclass
class AuditEntry:
    timestamp: str
    action: str
    field: str
    old_value: Any
    new_value: Any
    reason: str
    source: str


@dataclass
class Customer:
    customer_id: str
    tier: CustomerTier
    required_skill: Optional[str] = None
    patience_seconds: float = 600.0


@dataclass
class Agent:
    agent_id: str
    skills: list[str] = field(default_factory=list)
    tier_preference: Optional[CustomerTier] = None
    efficiency: float = 1.0


@dataclass
class CallRecord:
    call_id: str
    customer: Customer
    arrival_time: float
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    assigned_agent: Optional[Agent] = None
    status: CallStatus = CallStatus.WAITING
    wait_time: Optional[float] = None
    service_time: Optional[float] = None
    skill_matched: Optional[bool] = None
    source: str = "simulation"
    audit_trail: list[AuditEntry] = field(default_factory=list)

    @property
    def is_anomalous(self) -> bool:
        if self.wait_time is not None and self.wait_time > 600:
            return True
        if self.skill_matched is False:
            return True
        if self.status == CallStatus.ABANDONED:
            return True
        return False

    def add_audit(self, action: str, field: str, old_value: Any, new_value: Any, reason: str, source: str):
        self.audit_trail.append(AuditEntry(
            timestamp=datetime.now().isoformat(),
            action=action,
            field=field,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            source=source,
        ))


@dataclass
class DispatchStrategy:
    name: StrategyName
    description: str
    config: dict[str, Any] = field(default_factory=dict)


@dataclass
class AnomalyRecord:
    anomaly_type: AnomalyType
    severity: str
    description: str
    affected_calls: list[str] = field(default_factory=list)
    explanation: str = ""
    evidence: dict[str, Any] = field(default_factory=dict)
    source: str = "detection"


@dataclass
class FairnessMetrics:
    jain_index: float
    gini_coefficient: float
    vip_avg_wait: Optional[float] = None
    normal_avg_wait: Optional[float] = None
    low_avg_wait: Optional[float] = None
    vip_squeeze_ratio: Optional[float] = None
    p90_wait: Optional[float] = None
    p99_wait: Optional[float] = None
    long_tail_count: int = 0
    skill_mismatch_count: int = 0
    abandon_count: int = 0
    total_calls: int = 0
    source: str = "calculation"


@dataclass
class StrategyComparison:
    strategy: DispatchStrategy
    metrics: FairnessMetrics
    anomalies: list[AnomalyRecord] = field(default_factory=list)
    calls: list[CallRecord] = field(default_factory=list)


@dataclass
class ScoreReport:
    report_id: str
    created_at: str
    strategies_compared: list[StrategyComparison]
    best_strategy: Optional[str] = None
    best_reason: Optional[str] = None
    anomalies_found: list[AnomalyRecord] = field(default_factory=list)
    audit_trail: list[AuditEntry] = field(default_factory=list)
    source: str = "report"
