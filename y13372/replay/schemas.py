from __future__ import annotations
from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime


class ReplaySessionCreate(BaseModel):
    session_name: str
    config: Optional[dict] = None


class ReplaySessionOut(BaseModel):
    id: int
    session_name: str
    status: str
    config: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class QueueRecordCreate(BaseModel):
    sample_id: str
    original_verdict: Optional[str] = None
    metric_value: Optional[float] = None


class QueueRecordOut(BaseModel):
    id: int
    session_id: int
    sample_id: str
    status: str
    original_verdict: Optional[str] = None
    final_verdict: Optional[str] = None
    metric_value: Optional[float] = None
    is_outlier: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExceptionEventCreate(BaseModel):
    exception_type: str
    exception_detail: Optional[str] = None
    source_line: Optional[str] = None


class ExceptionEventOut(BaseModel):
    id: int
    record_id: int
    exception_type: str
    exception_detail: Optional[str] = None
    source_line: Optional[str] = None
    detected_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdjudicationChangeCreate(BaseModel):
    old_verdict: Optional[str] = None
    new_verdict: str
    source: str
    source_id: Optional[int] = None
    operator: Optional[str] = None
    reason: Optional[str] = None


class AdjudicationChangeOut(BaseModel):
    id: int
    record_id: int
    old_verdict: Optional[str] = None
    new_verdict: str
    source: str
    source_id: Optional[int] = None
    operator: Optional[str] = None
    reason: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MaterialVersionCreate(BaseModel):
    material_type: str
    content: Optional[str] = None


class MaterialVersionOut(BaseModel):
    id: int
    record_id: int
    material_type: str
    content: Optional[str] = None
    version: int
    is_current: bool
    revised_from: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GrayScaleErrorCreate(BaseModel):
    expected_ratio: Optional[float] = None
    actual_ratio: Optional[float] = None
    impact_scope: Optional[str] = None
    source_line: Optional[str] = None


class GrayScaleErrorOut(BaseModel):
    id: int
    record_id: int
    expected_ratio: Optional[float] = None
    actual_ratio: Optional[float] = None
    impact_scope: Optional[str] = None
    source_line: Optional[str] = None
    detected_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class HumanConfirmationCreate(BaseModel):
    confirmer: str
    before_status: Optional[str] = None
    after_status: str
    note: Optional[str] = None


class HumanConfirmationOut(BaseModel):
    id: int
    record_id: int
    confirmer: str
    before_status: Optional[str] = None
    after_status: str
    note: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReplayHistoryOut(BaseModel):
    id: int
    session_id: int
    record_id: Optional[int] = None
    event_type: str
    event_detail: Optional[dict] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RecordTraceOut(BaseModel):
    record: Optional[QueueRecordOut] = None
    exceptions: List[ExceptionEventOut] = []
    adjudications: List[AdjudicationChangeOut] = []
    materials: List[MaterialVersionOut] = []
    grayscale_errors: List[GrayScaleErrorOut] = []
    confirmations: List[HumanConfirmationOut] = []


class OutlierAnalysisOut(BaseModel):
    session_id: int
    total_records: int
    outlier_count: int
    outliers: List[QueueRecordOut] = []
    avg_metric: Optional[float] = None
