from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import BatchStatus, TemperatureUnit, IssueSeverity, IssueType


class BatchBase(BaseModel):
    batch_no: str
    catalyst_name: Optional[str] = None
    operator: Optional[str] = None
    import_remark: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    catalyst_name: Optional[str] = None
    operator: Optional[str] = None
    reviewer: Optional[str] = None
    import_remark: Optional[str] = None


class BatchResponse(BatchBase):
    id: int
    status: BatchStatus
    reviewer: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchDetailResponse(BatchResponse):
    experiment_count: int = 0
    curve_point_count: int = 0
    issue_count: int = 0
    unresolved_issue_count: int = 0


class ExperimentRecordBase(BaseModel):
    record_no: Optional[str] = None
    experiment_date: Optional[str] = None
    sample_weight: Optional[float] = None
    sample_weight_unit: Optional[str] = "g"
    weighing_precision: Optional[str] = None
    reaction_condition: Optional[str] = None
    reaction_temperature: Optional[float] = None
    temperature_unit: Optional[TemperatureUnit] = TemperatureUnit.UNKNOWN
    temperature_raw: Optional[str] = None
    space_velocity: Optional[str] = None
    initial_activity: Optional[float] = None
    final_activity: Optional[float] = None
    decay_rate: Optional[float] = None
    raw_remark: Optional[str] = None
    supplementary_note: Optional[str] = None


class ExperimentRecordResponse(ExperimentRecordBase):
    id: int
    batch_id: int
    source_sheet: Optional[str] = None
    source_row: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TemperatureCurveBase(BaseModel):
    time_point: Optional[float] = None
    time_unit: Optional[str] = "h"
    temperature_value: Optional[float] = None
    temperature_unit: Optional[TemperatureUnit] = TemperatureUnit.UNKNOWN
    temperature_raw: Optional[str] = None
    activity_value: Optional[float] = None


class TemperatureCurveResponse(TemperatureCurveBase):
    id: int
    batch_id: int
    is_abnormal: bool = False
    abnormal_reason: Optional[str] = None
    source_sheet: Optional[str] = None
    source_row: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StatusTransitionResponse(BaseModel):
    id: int
    batch_id: int
    from_status: Optional[BatchStatus] = None
    to_status: BatchStatus
    operator: Optional[str] = None
    remark: Optional[str] = None
    transition_at: datetime

    class Config:
        from_attributes = True


class CalculationRecordBase(BaseModel):
    calculation_type: str
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    difference: Optional[str] = None
    reason: Optional[str] = None
    operator: Optional[str] = None


class CalculationRecordResponse(CalculationRecordBase):
    id: int
    batch_id: int
    calculated_at: datetime

    class Config:
        from_attributes = True


class DataIssueBase(BaseModel):
    issue_type: IssueType
    severity: IssueSeverity
    location: Optional[str] = None
    description: Optional[str] = None
    human_readable_desc: Optional[str] = None


class DataIssueResponse(DataIssueBase):
    id: int
    batch_id: int
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None
    source_row: Optional[int] = None
    is_resolved: bool = False
    resolved_remark: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DataIssueResolve(BaseModel):
    resolved_remark: str


class StatusAdvanceRequest(BaseModel):
    operator: str
    remark: Optional[str] = None


class ImportResultResponse(BaseModel):
    batch_id: int
    batch_no: str
    experiment_records_imported: int
    temperature_points_imported: int
    issues_found: int
    warnings: List[str] = []


class PaginatedBatchesResponse(BaseModel):
    items: List[BatchResponse]
    total: int
    page: int
    page_size: int
