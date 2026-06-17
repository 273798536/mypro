from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from models import ExperimentStatus, BlockReason


class ExperimentBase(BaseModel):
    experiment_no: str
    vessel_name: str
    start_date: datetime
    end_date: Optional[datetime] = None
    area: Optional[str] = None


class ExperimentCreate(ExperimentBase):
    pass


class ExperimentResponse(ExperimentBase):
    id: int
    status: ExperimentStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_by: Optional[str] = None

    class Config:
        from_attributes = True


class BuoyDataBase(BaseModel):
    buoy_id: str
    record_time: datetime
    ph_value: float
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    depth: float
    dissolved_oxygen: Optional[float] = None


class BuoyDataCreate(BuoyDataBase):
    experiment_id: int
    is_supplementary: bool = False


class BuoyDataResponse(BuoyDataBase):
    id: int
    experiment_id: int
    is_supplementary: bool
    created_at: datetime
    data_quality: str

    class Config:
        from_attributes = True


class VesselTrackBase(BaseModel):
    record_time: datetime
    longitude: float
    latitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None


class VesselTrackCreate(VesselTrackBase):
    experiment_id: int


class VesselTrackResponse(VesselTrackBase):
    id: int
    experiment_id: int
    is_cleaned: bool
    cleaning_version: int
    anomaly_flag: bool
    anomaly_reason: Optional[str] = None

    class Config:
        from_attributes = True


class WeatherForecastBase(BaseModel):
    forecast_time: datetime
    forecast_for_date: datetime
    wind_speed: Optional[float] = None
    wind_direction: Optional[str] = None
    wave_height: Optional[float] = None
    air_pressure: Optional[float] = None
    is_late: bool = False


class WeatherForecastCreate(WeatherForecastBase):
    experiment_id: int


class WeatherForecastResponse(WeatherForecastBase):
    id: int
    experiment_id: int
    received_at: datetime
    version: int

    class Config:
        from_attributes = True


class RiskNotificationBase(BaseModel):
    block_reason: BlockReason
    severity: str = "high"
    description: str
    related_data_id: Optional[int] = None
    related_data_type: Optional[str] = None


class RiskNotificationCreate(RiskNotificationBase):
    experiment_id: int
    notification_no: str


class RiskNotificationResponse(RiskNotificationBase):
    id: int
    experiment_id: int
    notification_no: str
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessingTraceBase(BaseModel):
    operation: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None
    affected_data: Optional[str] = None


class ProcessingTraceCreate(ProcessingTraceBase):
    experiment_id: int


class ProcessingTraceResponse(ProcessingTraceBase):
    id: int
    experiment_id: int
    operation_time: datetime

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    report_type: str
    content_summary: Optional[str] = None


class ReportCreate(ReportBase):
    experiment_id: int
    report_no: str
    generated_by: Optional[str] = None


class ReportResponse(ReportBase):
    id: int
    experiment_id: int
    report_no: str
    generated_at: datetime
    generated_by: Optional[str] = None
    has_blocked_records: bool
    blocked_count: int
    valid_count: int
    weather_impacted: bool
    weather_impact_details: Optional[str] = None

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    new_status: ExperimentStatus
    operator: str
    remark: Optional[str] = None


class WeatherImpactResponse(BaseModel):
    experiment_id: int
    experiment_no: str
    impacted: bool
    impacted_conclusions: List[str]
    late_forecast_count: int
    old_results_preserved: bool


class BlockedRecordSummary(BaseModel):
    experiment_id: int
    experiment_no: str
    vessel_name: str
    block_reason: BlockReason
    block_description: str
    depth_value: Optional[float] = None
    record_time: Optional[datetime] = None
    notification_no: str


class MonthlyHandoverResponse(BaseModel):
    month: str
    total_experiments: int
    available_count: int
    unavailable_count: int
    blocked_records: List[BlockedRecordSummary]


class ExportReportResponse(BaseModel):
    report_no: str
    experiment_no: str
    vessel_name: str
    period: str
    status: str
    valid_data_count: int
    blocked_data_count: int
    risk_notifications: List[RiskNotificationResponse]
    weather_impacted: bool
    weather_impact_details: Optional[str] = None
    depth_block_explanation: Optional[str] = None
