from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class AnomalyType(Enum):
    REWARD_LEAKAGE = "reward_leakage"
    ACTION_LOOP = "action_loop"
    TERMINATION_ERROR = "termination_error"
    MISSING_FIELD = "missing_field"
    SUSPICIOUS_REWARD = "suspicious_reward"


@dataclass
class RewardItem:
    name: str
    value: float
    weight: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def weighted_value(self) -> float:
        return self.value * self.weight


@dataclass
class Action:
    name: str
    parameters: Dict[str, Any] = field(default_factory=dict)

    def __hash__(self):
        return hash((self.name, frozenset(self.parameters.items())))


@dataclass
class Step:
    step_id: int
    state: Dict[str, Any]
    action: Optional[Action]
    reward_items: List[RewardItem] = field(default_factory=list)
    done: bool = False
    timestamp: Optional[float] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)

    @property
    def total_reward(self) -> float:
        return sum(r.weighted_value for r in self.reward_items)

    @property
    def reward_breakdown(self) -> Dict[str, float]:
        return {r.name: r.weighted_value for r in self.reward_items}


@dataclass
class Trajectory:
    trajectory_id: str
    steps: List[Step] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    parsing_warnings: List[str] = field(default_factory=list)

    @property
    def total_steps(self) -> int:
        return len(self.steps)

    @property
    def total_reward(self) -> float:
        return sum(s.total_reward for s in self.steps)

    @property
    def is_complete(self) -> bool:
        return len(self.steps) > 0 and self.steps[-1].done

    def get_reward_breakdown(self) -> Dict[str, float]:
        breakdown = {}
        for step in self.steps:
            for name, value in step.reward_breakdown.items():
                breakdown[name] = breakdown.get(name, 0) + value
        return breakdown

    def get_action_sequence(self) -> List[Action]:
        return [s.action for s in self.steps if s.action is not None]


@dataclass
class DataCorrection:
    field_name: str
    step_id: Optional[int]
    correction_type: str
    message: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


@dataclass
class ParsingResult:
    trajectories: List[Trajectory]
    corrections: List[DataCorrection] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class RewardAggregation:
    reward_name: str
    total: float
    mean: float
    std: float
    min: float
    max: float
    per_step: List[float]
    contribution_ratio: float


@dataclass
class Anomaly:
    anomaly_type: AnomalyType
    severity: str
    trajectory_id: str
    step_id: Optional[int]
    description: str
    evidence: Dict[str, Any] = field(default_factory=dict)
    recommendation: str = ""


@dataclass
class AnalysisResult:
    parsing_result: ParsingResult
    reward_aggregations: Dict[str, RewardAggregation]
    anomalies: List[Anomaly]
    summary: Dict[str, Any]
