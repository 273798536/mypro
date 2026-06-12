from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, date


class TideRecordBase(BaseModel):
    port_code: str = Field(..., description="港口代码")
    port_name: Optional[str] = None
    record_date: date
    record_time: datetime
    tide_height: float = Field(..., description="潮高(米)")
    tide_type: Optional[str] = None
    data_source: Optional[str] = None


class TideRecordCreate(TideRecordBase):
    batch_id: Optional[str] = None


class TideRecord(TideRecordBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WaterQualityBase(BaseModel):
    port_code: str
    station_code: Optional[str] = None
    record_date: date
    record_time: datetime
    water_depth: Optional[float] = Field(None, description="实测水深(米)")
    water_level: Optional[float] = None
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    turbidity: Optional[float] = None


class WaterQualityCreate(WaterQualityBase):
    batch_id: Optional[str] = None


class WaterQualityRecord(WaterQualityBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VesselTrajectoryBase(BaseModel):
    mmsi: str
    vessel_name: Optional[str] = None
    port_code: Optional[str] = None
    record_time: datetime
    longitude: float
    latitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None


class TrajectoryCreate(VesselTrajectoryBase):
    batch_id: Optional[str] = None


class VesselTrajectory(VesselTrajectoryBase):
    id: int
    status: str = "raw"
    is_cleaned: bool = False
    remark: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TideWindowCalcRequest(BaseModel):
    port_code: str
    port_name: Optional[str] = None
    vessel_name: str
    mmsi: Optional[str] = None
    work_date: date
    required_depth: float = Field(8.0, description="要求最小水深(米)")
    draft: float = Field(..., description="船舶吃水(米)")
    under_keel_margin: float = Field(0.5, description="富余水深余量(米)")
    time_window_hours: float = Field(24.0, description="搜索时间窗(小时)")
    batch_id: Optional[str] = None
    operator: Optional[str] = None


class TideWindowResultBase(BaseModel):
    port_code: str
    port_name: Optional[str] = None
    vessel_name: Optional[str] = None
    mmsi: Optional[str] = None
    work_date: date
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    window_duration_min: Optional[float] = None
    min_depth: Optional[float] = None
    max_depth: Optional[float] = None
    avg_depth: Optional[float] = None
    required_depth: float = 8.0
    draft: Optional[float] = None
    under_keel_clearance: Optional[float] = None
    negative_depth_count: int = 0
    tide_water_match_score: Optional[float] = None
    data_status: str = "pending"
    available_flag: bool = False
    pending_reason: Optional[str] = None
    recollect_reason: Optional[str] = None
    failure_reason: Optional[str] = None
    formula_used: Optional[str] = None
    formula_note: Optional[str] = None


class TideWindowResult(TideWindowResultBase):
    id: int
    result_no: str
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    source_tide_ids: Optional[List[int]] = None
    source_water_ids: Optional[List[int]] = None
    source_trajectory_ids: Optional[List[int]] = None
    calc_params: Optional[Any] = None

    class Config:
        from_attributes = True


class TideWindowResultDetail(TideWindowResult):
    audit_logs: List["CorrectionAuditLog"] = []


class ManualCorrectionRequest(BaseModel):
    result_id: int
    operator: str
    field_name: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    new_status: Optional[str] = None
    remark: Optional[str] = None
    change_summary: Optional[str] = None


class CorrectionAuditLogBase(BaseModel):
    result_id: int
    operator: str
    action: str
    field_name: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    change_summary: Optional[str] = None
    remark: Optional[str] = None
    ip_address: Optional[str] = None


class CorrectionAuditLog(CorrectionAuditLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


TideWindowResultDetail.model_rebuild()


class BatchImportRequest(BaseModel):
    batch_id: str
    batch_type: str
    source_file: Optional[str] = None
    source_hash: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None
    is_reimport: bool = False
    superseded_batch_id: Optional[str] = None


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[Any]


class CalcFormulaInfo(BaseModel):
    name: str
    formula: str
    unit: str
    scope: str
    failure_modes: List[str]
    description: str


class DataStatusStats(BaseModel):
    available: int = 0
    pending: int = 0
    recollect: int = 0
    confirmed: int = 0
    total: int = 0


class DashboardStats(BaseModel):
    status_stats: DataStatusStats
    today_calc_count: int
    negative_depth_alerts: int
    pending_review_count: int
    last_7_days_trend: List[dict]
