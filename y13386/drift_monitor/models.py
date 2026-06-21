from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DriftStatus(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    DRIFTED = "drifted"
    GRAY = "gray"


class JudgmentSource(str, Enum):
    ALGORITHM = "algorithm"
    HUMAN = "human"
    THRESHOLD = "threshold"


@dataclass
class FeatureStats:
    feature_name: str
    mean: float
    std: float
    p5: float
    p50: float
    p95: float
    missing_rate: float
    sample_count: int
    boundary_samples: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class FeatureDrift:
    feature_name: str
    psi: float
    ks_stat: float
    status: DriftStatus
    baseline_stats: FeatureStats
    current_stats: FeatureStats
    note: Optional[str] = None


@dataclass
class ThresholdConfig:
    psi_warning: float = 0.1
    psi_drift: float = 0.25
    ks_warning: float = 0.05
    ks_drift: float = 0.1
    min_samples: int = 30


@dataclass
class HumanJudgment:
    judge: str
    original_status: DriftStatus
    new_status: DriftStatus
    reason: str
    timestamp: datetime = field(default_factory=datetime.now)
    source: JudgmentSource = JudgmentSource.HUMAN


@dataclass
class AuditRecord:
    field: str
    old_value: Any
    new_value: Any
    operator: str
    timestamp: datetime = field(default_factory=datetime.now)
    note: Optional[str] = None


@dataclass
class SnapshotParams:
    run_id: str
    version: str
    threshold: ThresholdConfig
    extra_params: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class DriftSnapshot:
    run_id: str
    version: str
    params: SnapshotParams
    overall_status: DriftStatus
    feature_drifts: List[FeatureDrift]
    sample_count: int
    duplicate_run_ids: List[str] = field(default_factory=list)
    human_judgments: List[HumanJudgment] = field(default_factory=list)
    audit_trail: List[AuditRecord] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    is_gray: bool = False

    def final_status(self) -> DriftStatus:
        if self.human_judgments:
            return self.human_judgments[-1].new_status
        return self.overall_status


@dataclass
class GrayDecomposition:
    sample_change_effect: Dict[str, DriftStatus]
    threshold_change_effect: Dict[str, DriftStatus]
    human_judgment_effect: Dict[str, Dict[str, Any]]
    baseline_snapshot: str
    current_snapshot: str
