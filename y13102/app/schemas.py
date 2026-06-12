from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from .models import ScreenshotStatus, ResultStatus, ChangeCause


class ParameterBase(BaseModel):
    param_key: str
    param_name: str
    current_value: Optional[float] = None
    unit: Optional[str] = None
    threshold_low: Optional[float] = None
    threshold_high: Optional[float] = None
    segment_count: int = 2


class ParameterCreate(ParameterBase):
    pass


class ParameterUpdate(BaseModel):
    param_name: Optional[str] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    threshold_low: Optional[float] = None
    threshold_high: Optional[float] = None
    segment_count: Optional[int] = None
    change_reason: Optional[str] = None
    changed_by: Optional[str] = None


class ParameterResponse(ParameterBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ParameterHistoryResponse(BaseModel):
    id: int
    parameter_id: int
    version: int
    value: Optional[float]
    unit: Optional[str]
    threshold_low: Optional[float]
    threshold_high: Optional[float]
    segment_count: Optional[int]
    change_reason: Optional[str]
    changed_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class RemarkCreate(BaseModel):
    parameter_id: int
    content: str
    remark_type: str = "后补备注"
    created_by: Optional[str] = None
    idempotency_key: Optional[str] = None


class RemarkResponse(BaseModel):
    id: int
    parameter_id: int
    idempotency_key: str
    content: str
    remark_type: str
    created_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ScreenshotCreate(BaseModel):
    parameter_id: int
    parameter_history_id: Optional[int] = None
    file_path: str
    description: Optional[str] = None
    status: ScreenshotStatus = ScreenshotStatus.PENDING_MATERIAL
    version_tag: Optional[str] = None
    created_by: Optional[str] = None


class ScreenshotUpdate(BaseModel):
    status: Optional[ScreenshotStatus] = None
    description: Optional[str] = None


class ScreenshotResponse(BaseModel):
    id: int
    parameter_id: int
    parameter_history_id: Optional[int]
    file_path: str
    description: Optional[str]
    status: ScreenshotStatus
    version_tag: Optional[str]
    created_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CalculationRequestCreate(BaseModel):
    parameter_id: int
    sample_data: List[Dict[str, Any]]
    idempotency_key: Optional[str] = None
    requested_by: Optional[str] = None


class SegmentResult(BaseModel):
    segment_index: int
    start_x: float
    end_x: float
    slope: float
    intercept: float
    r_squared: float
    sample_count: int


class CalculationResultResponse(BaseModel):
    id: int
    parameter_id: int
    version: int
    result_value: Optional[float]
    result_status: ResultStatus
    suspend_reason: Optional[str]
    r_squared: Optional[float]
    is_jump: bool
    jump_cause: Optional[ChangeCause]
    jump_description: Optional[str]
    segments: Optional[List[SegmentResult]]
    coefficients: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class ChangeTraceResponse(BaseModel):
    id: int
    result_id: int
    change_cause: ChangeCause
    old_value: Optional[str]
    new_value: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class JumpAnalysisResponse(BaseModel):
    result_id: int
    is_jump: bool
    jump_cause: Optional[ChangeCause]
    jump_description: Optional[str]
    change_traces: List[ChangeTraceResponse]
    previous_result: Optional[CalculationResultResponse]
    current_result: CalculationResultResponse


class IdempotencyCheckResponse(BaseModel):
    is_duplicate: bool
    existing_result: Optional[CalculationResultResponse]
    message: str


class ParameterDetailResponse(ParameterResponse):
    history: List[ParameterHistoryResponse]
    remarks: List[RemarkResponse]
    screenshots: List[ScreenshotResponse]
    latest_result: Optional[CalculationResultResponse]
