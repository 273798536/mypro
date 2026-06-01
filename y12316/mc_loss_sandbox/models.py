from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DataSource(Enum):
    POLICY_MAIN = "policy_main"
    LOSS_DISTRIBUTION = "loss_distribution"
    EXPENSE_RATE = "expense_rate"
    DEDUCTIBLE_RULE = "deductible_rule"


class ConflictType(Enum):
    VALUE_MISMATCH = "value_mismatch"
    MISSING_DATA = "missing_data"
    TIMING_ISSUE = "timing_issue"
    EXTREME_VALUE = "extreme_value"
    SAMPLE_INSUFFICIENT = "sample_insufficient"


class PolicyRecord(BaseModel):
    policy_id: str
    insured_amount: float
    policy_type: str
    effective_date: datetime
    expiry_date: datetime
    region: Optional[str] = None
    industry: Optional[str] = None
    deductible: Optional[float] = None
    limit: Optional[float] = None
    source_file: str
    source: DataSource = DataSource.POLICY_MAIN


class LossDistribution(BaseModel):
    policy_type: str
    distribution_type: str
    params: Dict[str, float]
    sample_size: int
    confidence_level: float = 0.95
    source_file: str
    source: DataSource = DataSource.LOSS_DISTRIBUTION


class ExpenseRate(BaseModel):
    policy_type: str
    expense_rate: float
    acquisition_cost: float
    administrative_cost: float
    source_file: str
    source: DataSource = DataSource.EXPENSE_RATE


class DeductibleRule(BaseModel):
    policy_type: str
    deductible_amount: float
    deductible_ratio: Optional[float] = None
    effective_date: datetime
    received_date: datetime
    is_late_arrival: bool = False
    source_file: str
    source: DataSource = DataSource.DEDUCTIBLE_RULE


class ConflictRecord(BaseModel):
    conflict_id: str
    conflict_type: ConflictType
    description: str
    sources: List[DataSource]
    policy_id: Optional[str] = None
    policy_type: Optional[str] = None
    values: Dict[str, Any]
    resolution: str
    timestamp: datetime
    order_index: int


class SimulationConfig(BaseModel):
    num_simulations: int = 10000
    random_seed: int = 42
    confidence_levels: List[float] = Field(default_factory=lambda: [0.5, 0.75, 0.9, 0.95, 0.99, 0.995])
    time_horizon_months: int = 12


class SimulationResult(BaseModel):
    total_losses: List[float]
    percentiles: Dict[float, float]
    mean_loss: float
    std_loss: float
    var_95: float
    var_99: float
    cvar_95: float
    cvar_99: float
    expenses: float
    net_loss: float


class ExecutionTimeline(BaseModel):
    event: str
    timestamp: datetime
    description: str
    order_index: int
