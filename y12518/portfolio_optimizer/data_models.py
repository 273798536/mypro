from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
from uuid import uuid4

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field, field_validator, model_validator


class ConflictType(str, Enum):
    WEIGHT_INDUSTRY = "weight_vs_industry"
    WEIGHT_COST = "weight_vs_cost"
    INDUSTRY_COST = "industry_vs_cost"
    CONSTRAINT_VIOLATION = "constraint_violation"


class SolverStatus(str, Enum):
    OPTIMAL = "optimal"
    INFEASIBLE = "infeasible"
    UNBOUNDED = "unbounded"
    MAX_ITERATIONS = "max_iterations"
    ERROR = "error"


class Position(BaseModel):
    stock_code: str
    target_weight: float
    current_weight: float = 0.0
    min_weight: float = 0.0
    max_weight: float = 1.0
    is_forbidden: bool = False
    source: str = "main"

    @field_validator("target_weight", "current_weight", "min_weight", "max_weight")
    @classmethod
    def _check_weights(cls, v: float) -> float:
        if v < 0 or v > 1:
            raise ValueError(f"权重必须在[0, 1]范围内，当前值: {v}")
        return v

    @field_validator("max_weight")
    @classmethod
    def _check_min_max(cls, v: float, info) -> float:
        if "min_weight" in info.data and v < info.data["min_weight"]:
            raise ValueError(f"max_weight({v}) 不能小于 min_weight({info.data['min_weight']})")
        return v


class IndustryTag(BaseModel):
    stock_code: str
    industry: str
    industry_confidence: float = 1.0
    source: str = "industry"

    @field_validator("industry_confidence")
    @classmethod
    def _check_confidence(cls, v: float) -> float:
        if v < 0 or v > 1:
            raise ValueError(f"行业置信度必须在[0, 1]范围内，当前值: {v}")
        return v


class TransactionCost(BaseModel):
    stock_code: str
    buy_cost: float = 0.001
    sell_cost: float = 0.001
    liquidity_score: float = 1.0
    source: str = "cost"

    @field_validator("buy_cost", "sell_cost")
    @classmethod
    def _check_cost(cls, v: float) -> float:
        if v < 0:
            raise ValueError(f"交易成本不能为负，当前值: {v}")
        return v

    @field_validator("liquidity_score")
    @classmethod
    def _check_liquidity(cls, v: float) -> float:
        if v < 0 or v > 1:
            raise ValueError(f"流动性评分必须在[0, 1]范围内，当前值: {v}")
        return v


class ConstraintConfig(BaseModel):
    total_weight_min: float = 0.95
    total_weight_max: float = 1.05
    industry_max_weight: Dict[str, float] = Field(default_factory=dict)
    industry_min_weight: Dict[str, float] = Field(default_factory=dict)
    max_single_stock_weight: float = 0.15
    min_single_stock_weight: float = 0.0
    max_turnover: float = 1.0
    cost_sensitive: bool = True
    random_seed: int = 42

    @field_validator("total_weight_min", "total_weight_max")
    @classmethod
    def _check_total_weight(cls, v: float) -> float:
        if v < 0:
            raise ValueError(f"总权重约束不能为负，当前值: {v}")
        return v

    @model_validator(mode="after")
    def _check_weight_range(self) -> "ConstraintConfig":
        if self.total_weight_min > self.total_weight_max:
            raise ValueError(
                f"total_weight_min({self.total_weight_min}) 不能大于 "
                f"total_weight_max({self.total_weight_max})"
            )
        if self.min_single_stock_weight > self.max_single_stock_weight:
            raise ValueError(
                f"min_single_stock_weight({self.min_single_stock_weight}) 不能大于 "
                f"max_single_stock_weight({self.max_single_stock_weight})"
            )
        return self


class ConflictRecord(BaseModel):
    conflict_id: str = Field(default_factory=lambda: str(uuid4()))
    conflict_type: ConflictType
    stock_code: Optional[str] = None
    description: str
    source_data: Dict[str, Any]
    severity: str = "warning"
    resolved: bool = False
    resolution: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ConstraintViolation(BaseModel):
    constraint_name: str
    description: str
    current_value: float
    limit_value: float
    involved_stocks: List[str] = Field(default_factory=list)


class OptimizerInput(BaseModel):
    input_id: str = Field(default_factory=lambda: str(uuid4()))
    positions: List[Position]
    industry_tags: List[IndustryTag]
    transaction_costs: List[TransactionCost]
    constraints: ConstraintConfig
    timestamp: datetime = Field(default_factory=datetime.now)

    def get_stock_codes(self) -> List[str]:
        return [p.stock_code for p in self.positions]

    def get_target_weights_array(self) -> np.ndarray:
        return np.array([p.target_weight for p in self.positions])

    def get_current_weights_array(self) -> np.ndarray:
        return np.array([p.current_weight for p in self.positions])

    def get_stock_bounds(self) -> Tuple[np.ndarray, np.ndarray]:
        lower = np.array([p.min_weight for p in self.positions])
        upper = np.array([p.max_weight for p in self.positions])
        for i, p in enumerate(self.positions):
            if p.is_forbidden:
                upper[i] = 0.0
                lower[i] = 0.0
        return lower, upper

    def to_dict(self) -> Dict[str, Any]:
        return {
            "input_id": self.input_id,
            "timestamp": self.timestamp.isoformat(),
            "positions": [p.model_dump() for p in self.positions],
            "industry_tags": [i.model_dump() for i in self.industry_tags],
            "transaction_costs": [t.model_dump() for t in self.transaction_costs],
            "constraints": self.constraints.model_dump(),
        }


class OptimizerResult(BaseModel):
    result_id: str = Field(default_factory=lambda: str(uuid4()))
    input_id: str
    status: SolverStatus
    optimal_weights: Optional[Dict[str, float]] = None
    objective_value: Optional[float] = None
    solve_time_ms: float = 0.0
    conflicts: List[ConflictRecord] = Field(default_factory=list)
    violations: List[ConstraintViolation] = Field(default_factory=list)
    explanation: str = ""
    error_message: Optional[str] = None
    solver_details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)
    manual_correction: Optional[Dict[str, Any]] = None

    def is_success(self) -> bool:
        return self.status == SolverStatus.OPTIMAL

    def to_dict(self) -> Dict[str, Any]:
        return {
            "result_id": self.result_id,
            "input_id": self.input_id,
            "status": self.status.value,
            "optimal_weights": self.optimal_weights,
            "objective_value": self.objective_value,
            "solve_time_ms": self.solve_time_ms,
            "conflicts": [c.model_dump() for c in self.conflicts],
            "violations": [v.model_dump() for v in self.violations],
            "explanation": self.explanation,
            "error_message": self.error_message,
            "solver_details": self.solver_details,
            "timestamp": self.timestamp.isoformat(),
            "manual_correction": self.manual_correction,
        }


class HistoryRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: str(uuid4()))
    original_input: Dict[str, Any]
    processing_result: Dict[str, Any]
    manual_correction: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    notes: str = ""

    def update_correction(self, correction: Dict[str, Any], notes: str = ""):
        self.manual_correction = correction
        self.notes = notes
        self.updated_at = datetime.now()
