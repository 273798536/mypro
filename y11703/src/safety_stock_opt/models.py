from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class DataSource(str, Enum):
    SALES = "sales"
    REPLENISHMENT_CYCLE = "replenishment_cycle"
    SERVICE_LEVEL = "service_level"
    STOCKOUT = "stockout"
    WAREHOUSE_CAPACITY = "warehouse_capacity"
    MANUAL_SUGGESTION = "manual_suggestion"


class WarningType(str, Enum):
    NEW_PRODUCT = "new_product"
    PROMOTION_PEAK = "promotion_peak"
    CAPACITY_LIMIT = "capacity_limit"
    INSUFFICIENT_DATA = "insufficient_data"
    OUTLIER = "outlier"


class SalesRecord(BaseModel):
    sku_id: str
    date: str
    quantity: float
    source_line: Optional[int] = None
    source_file: Optional[str] = None

    @field_validator('quantity')
    def quantity_non_negative(cls, v):
        if v < 0:
            raise ValueError(f"销量不能为负数: {v}")
        return v


class ReplenishmentCycle(BaseModel):
    sku_id: str
    lead_time_days: float
    review_period_days: Optional[float] = None
    source_line: Optional[int] = None
    source_file: Optional[str] = None


class ServiceLevelConfig(BaseModel):
    sku_id: str
    service_level: float = Field(..., ge=0.5, le=0.9999)
    source_line: Optional[int] = None
    source_file: Optional[str] = None


class StockoutRecord(BaseModel):
    sku_id: str
    date: str
    duration_hours: Optional[float] = None
    estimated_lost_sales: Optional[float] = None
    source_line: Optional[int] = None
    source_file: Optional[str] = None


class WarehouseCapacity(BaseModel):
    sku_id: str
    max_capacity: float
    current_capacity: Optional[float] = None
    source_line: Optional[int] = None
    source_file: Optional[str] = None


class ManualSuggestion(BaseModel):
    sku_id: str
    suggested_safety_stock: Optional[float] = None
    note: Optional[str] = None
    source_line: Optional[int] = None
    source_file: Optional[str] = None


class SkuAnalysisResult(BaseModel):
    sku_id: str
    calculation_timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    demand_mean: float
    demand_std: float
    demand_cv: float
    
    lead_time_days: float
    review_period_days: float
    
    service_level: float
    z_score: float
    
    raw_safety_stock: float
    capacity_adjusted_safety_stock: float
    final_safety_stock: float
    
    reorder_point: float
    order_up_to_level: Optional[float] = None
    
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    data_sources_used: List[str] = Field(default_factory=list)
    
    manual_override: Optional[float] = None
    manual_note: Optional[str] = None
    
    calculation_trace: Dict[str, Any] = Field(default_factory=dict)


class ProcessingError(BaseModel):
    sku_id: Optional[str]
    error_type: str
    error_message: str
    source_file: Optional[str] = None
    source_line: Optional[int] = None
    raw_data: Optional[Dict[str, Any]] = None


class CalculationSummary(BaseModel):
    total_skus: int
    successful_calculations: int
    failed_calculations: int
    warnings_count: Dict[str, int]
    output_directory: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
