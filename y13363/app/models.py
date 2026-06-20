from datetime import datetime
from typing import Optional, Dict, List, Any
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    NEEDS_CONFIRMATION = "needs_confirmation"
    EVIDENCE_REQUIRED = "evidence_required"
    ARCHIVED = "archived"


class ConfirmationReason(str, Enum):
    FIELD_MISMATCH = "field_mismatch"
    CALIBRATION_MISMATCH = "calibration_mismatch"
    BOUNDARY_EXCEEDED = "boundary_exceeded"
    DUPLICATE_RUN_ID = "duplicate_run_id"
    GRAYSCALE_ANOMALY = "grayscale_anomaly"
    OTHER = "other"


class CostFormula(BaseModel):
    name: str
    expression: str
    unit: str
    description: str
    boundary_min: Optional[float] = None
    boundary_max: Optional[float] = None


class FieldMapping(BaseModel):
    source_field: str
    target_field: str
    data_type: str
    is_required: bool = False
    default_value: Optional[Any] = None


class TrainingLog(BaseModel):
    run_id: str
    source_file: str
    raw_fields: Dict[str, Any]
    mapped_fields: Dict[str, Any]
    field_mappings_used: List[FieldMapping]
    received_at: datetime = Field(default_factory=datetime.now)


class CostCalculation(BaseModel):
    formula: CostFormula
    input_values: Dict[str, float]
    result: float
    unit: str
    is_within_bounds: bool
    boundary_violation: Optional[str] = None
    calculation_trace: List[str]


class GrayscaleChange(BaseModel):
    change_type: str
    old_value: Any
    new_value: Any
    impact: float
    description: str


class GrayscaleResult(BaseModel):
    run_id: str
    original_cost: float
    final_cost: float
    sample_changes: List[GrayscaleChange]
    threshold_changes: List[GrayscaleChange]
    manual_adjustments: List[GrayscaleChange]
    total_sample_impact: float
    total_threshold_impact: float
    total_manual_impact: float


class ProcessingRecord(BaseModel):
    run_id: str
    status: ProcessingStatus
    training_log: Optional[TrainingLog] = None
    cost_calculations: List[CostCalculation] = Field(default_factory=list)
    grayscale_result: Optional[GrayscaleResult] = None
    api_response: Optional[Dict[str, Any]] = None
    confirmation_reason: Optional[ConfirmationReason] = None
    confirmation_note: Optional[str] = None
    next_steps: Optional[List[str]] = None
    evidence_items: List[str] = Field(default_factory=list)
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class DashboardSummary(BaseModel):
    total_runs: int
    processed: int
    pending: int
    needs_confirmation: int
    evidence_required: int
    total_cost: float
    cost_unit: str


class ConfirmationRequest(BaseModel):
    run_id: str
    reason: ConfirmationReason
    note: str
    next_steps: List[str]


class EvidenceSubmission(BaseModel):
    run_id: str
    evidence_description: str
