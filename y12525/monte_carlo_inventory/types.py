from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Tuple
import pandas as pd
import numpy as np


class RiskLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class DataIssueType(str, Enum):
    MISSING_VALUE = "MISSING_VALUE"
    EXTREME_VALUE = "EXTREME_VALUE"
    NEGATIVE_VALUE = "NEGATIVE_VALUE"
    OUTLIER = "OUTLIER"
    INCONSISTENT = "INCONSISTENT"
    DUPLICATE = "DUPLICATE"


class IssueSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class DataIssue:
    issue_type: DataIssueType
    severity: IssueSeverity
    location: str
    description: str
    suggested_fix: str
    original_value: Optional[float] = None
    row_index: Optional[int] = None


@dataclass
class SalesHistory:
    sku: str
    dates: List[pd.Timestamp]
    quantities: List[float]
    raw_data: pd.DataFrame

    def __post_init__(self):
        if len(self.dates) != len(self.quantities):
            raise ValueError("dates and quantities must have same length")


@dataclass
class SupplyCycle:
    sku: str
    lead_time_mean: float
    lead_time_std: float
    lead_time_min: float
    lead_time_max: float
    supplier_reliability: float
    raw_data: pd.DataFrame
    historical_lead_times: Optional[List[float]] = None


@dataclass
class InventoryStatus:
    sku: str
    current_stock: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float
    unit_cost: float
    holding_cost_rate: float = 0.15
    stockout_cost_rate: float = 2.0
    last_restock_date: Optional[pd.Timestamp] = None
    pending_orders: List[Dict] = field(default_factory=list)


@dataclass
class ImportResult:
    sales: Optional[SalesHistory] = None
    supply: Optional[SupplyCycle] = None
    inventory: Optional[InventoryStatus] = None
    issues: List[DataIssue] = field(default_factory=list)
    import_success: bool = False
    messages: List[str] = field(default_factory=list)


@dataclass
class SimulationConfig:
    n_simulations: int = 5000
    horizon_days: int = 90
    demand_distribution: str = "auto"
    lead_time_distribution: str = "gamma"
    confidence_level: float = 0.95
    random_seed: int = 42
    service_level_target: float = 0.95


@dataclass
class DemandForecast:
    sku: str
    distribution_type: str
    parameters: Dict[str, float]
    daily_demand_mean: float
    daily_demand_std: float
    goodness_of_fit: Dict[str, float]
    historical_demand: List[float]
    forecast_dates: List[pd.Timestamp]
    forecast_quantiles: Dict[float, List[float]]


@dataclass
class SimulationTrajectory:
    simulation_id: int
    dates: List[pd.Timestamp]
    inventory_level: List[float]
    stockout_days: List[bool]
    replenishment_arrivals: List[Dict]
    demand_realized: List[float]
    lead_time_realized: List[float]
    negative_inventory_days: List[bool]
    delayed_orders: List[Dict]


@dataclass
class RiskMetrics:
    sku: str
    stockout_probability: float
    expected_stockout_days: float
    expected_shortage_units: float
    fill_rate: float
    service_level: float
    avg_inventory: float
    max_inventory: float
    min_inventory: float
    negative_inventory_probability: float
    delayed_order_probability: float
    holding_cost: float
    stockout_cost: float
    total_cost: float
    per_tile_metrics: Dict[float, Dict[str, float]]


@dataclass
class ReplenishmentAdvice:
    sku: str
    action: str
    suggested_order_quantity: float
    suggested_order_date: pd.Timestamp
    urgency: RiskLevel
    rationale: str
    expected_service_level: float
    risk_reduction: float
    cost_impact: float
    alternative_scenarios: List[Dict]


@dataclass
class ResultClassification:
    overall_level: RiskLevel
    direct_usable: List[str]
    needs_confirmation: List[Dict]
    cannot_calculate: List[Dict]
    confirmation_required_details: List[Dict]


@dataclass
class PipelineState:
    stage: str
    input_hash: str
    timestamp: pd.Timestamp
    data: Dict
    metadata: Dict = field(default_factory=dict)


@dataclass
class CompleteAnalysis:
    sku: str
    pipeline_states: List[PipelineState]
    import_result: ImportResult
    demand_forecast: Optional[DemandForecast] = None
    simulation_config: Optional[SimulationConfig] = None
    trajectories: Optional[List[SimulationTrajectory]] = None
    risk_metrics: Optional[RiskMetrics] = None
    replenishment_advice: Optional[ReplenishmentAdvice] = None
    classification: Optional[ResultClassification] = None
    export_paths: Dict[str, str] = field(default_factory=dict)
