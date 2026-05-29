from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CustomerLevel(str, Enum):
    VIP = "VIP"
    REGULAR = "普通用户"
    SILVER = "银卡用户"
    GOLD = "金卡用户"


class SkillType(str, Enum):
    GENERAL = "通用咨询"
    TECHNICAL = "技术支持"
    BILLING = "账单查询"
    COMPLAINT = "投诉处理"
    PREMIUM = "VIP专属服务"


class DispatchStrategy(str, Enum):
    FIFO = "先到先得"
    PRIORITY = "优先级优先"
    SKILL_MATCH = "技能匹配优先"
    HYBRID = "混合策略"
    FAIRNESS = "公平优先"


class CallRecord(BaseModel):
    call_id: str
    phone: str
    customer_level: CustomerLevel
    required_skill: SkillType
    arrival_time: datetime
    start_service_time: Optional[datetime] = None
    end_service_time: Optional[datetime] = None
    assigned_agent_id: Optional[str] = None
    wait_time_seconds: Optional[int] = None
    is_served: bool = False
    dispatch_strategy_used: Optional[DispatchStrategy] = None
    audit_log: List[Dict[str, Any]] = Field(default_factory=list)


class Agent(BaseModel):
    agent_id: str
    name: str
    skills: List[SkillType]
    is_available: bool = True
    current_call_id: Optional[str] = None


class DispatchStrategyConfig(BaseModel):
    strategy_id: str
    strategy_type: DispatchStrategy
    name: str
    description: str
    vip_weight: float = 1.0
    skill_match_weight: float = 1.0
    wait_time_weight: float = 1.0
    fairness_weight: float = 0.0
    effective_time: Optional[datetime] = None
    is_active: bool = False


class AnomalyType(str, Enum):
    VIP_PREEMPTION = "VIP挤占"
    SKILL_MISMATCH = "技能错配"
    LONG_TAIL_WAIT = "长尾等待"


class PendingConfirmationItem(BaseModel):
    item_id: str
    anomaly_type: AnomalyType
    call_id: str
    description: str
    detected_time: datetime
    severity: str
    related_calls: List[str] = Field(default_factory=list)
    is_confirmed: bool = False
    confirmed_by: Optional[str] = None
    confirmed_time: Optional[datetime] = None


class FairnessMetric(BaseModel):
    metric_name: str
    value: float
    unit: str
    applicable_scope: str
    threshold: float
    is_normal: bool


class FairnessScoreResult(BaseModel):
    overall_score: float
    score_unit: str = "分"
    applicable_scope: str
    metrics: List[FairnessMetric]
    pending_confirmations: List[PendingConfirmationItem]
    strategy_comparison: Dict[str, float]
    failure_reasons: List[str]
    calculation_time: datetime
    data_version: str


class ConclusionChange(BaseModel):
    call_id: str
    original_conclusion: str
    new_conclusion: str
    change_reason: str
    changed_by: str
    change_time: datetime


class StrategySupplementLog(BaseModel):
    log_id: str
    strategy_id: str
    supplement_time: datetime
    affected_calls: List[str]
    conclusion_changes: List[ConclusionChange]
    operator: str


class DownloadReport(BaseModel):
    report_id: str
    generated_time: datetime
    summary: Dict[str, Any]
    vip_conclusions: List[Dict[str, Any]]
    regular_conclusions: List[Dict[str, Any]]
    pending_items: List[Dict[str, Any]]
    data_consistent: bool = True
