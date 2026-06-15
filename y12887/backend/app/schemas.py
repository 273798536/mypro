from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class BeachInfoBase(BaseModel):
    name: str = Field(..., description="浴场名称")
    code: str = Field(..., description="浴场编码")
    latitude: float = Field(..., description="纬度")
    longitude: float = Field(..., description="经度")
    safe_zone_radius: Optional[float] = Field(500.0, description="安全区域半径(米)")
    no_navigation_coords: Optional[str] = Field(None, description="禁航区坐标")
    description: Optional[str] = Field(None, description="备注")


class BeachInfoCreate(BeachInfoBase):
    pass


class BeachInfoResponse(BeachInfoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InspectionRecordBase(BaseModel):
    record_no: str = Field(..., description="记录编号")
    beach_id: int = Field(..., description="浴场ID")
    inspection_time: datetime = Field(..., description="巡检时间")
    inspector: Optional[str] = Field(None, description="巡检人员")
    weather: Optional[str] = Field(None, description="天气")
    temperature: Optional[float] = Field(None, description="气温(℃)")
    wind_direction: Optional[str] = Field(None, description="风向")
    wind_level: Optional[str] = Field(None, description="风力等级")
    wave_height: Optional[float] = Field(None, description="浪高(米)")
    tide_level: Optional[str] = Field(None, description="潮位")
    photo_path: Optional[str] = Field(None, description="巡检照片路径")
    photo_name: Optional[str] = Field(None, description="照片名称")
    remark: Optional[str] = Field(None, description="备注")


class InspectionRecordCreate(InspectionRecordBase):
    pass


class InspectionRecordResponse(InspectionRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime
    beach: Optional[BeachInfoResponse] = None

    class Config:
        from_attributes = True


class BuoyDataBase(BaseModel):
    buoy_id: str = Field(..., description="浮标编号")
    beach_id: int = Field(..., description="浴场ID")
    record_time: datetime = Field(..., description="记录时间")
    latitude: Optional[float] = Field(None, description="纬度")
    longitude: Optional[float] = Field(None, description="经度")
    water_temperature: Optional[float] = Field(None, description="水温(℃)")
    ph_value: Optional[float] = Field(None, description="pH值")
    dissolved_oxygen: Optional[float] = Field(None, description="溶解氧(mg/L)")
    turbidity: Optional[float] = Field(None, description="浊度(NTU)")
    salinity: Optional[float] = Field(None, description="盐度(psu)")
    current_speed: Optional[float] = Field(None, description="流速(m/s)")
    current_direction: Optional[float] = Field(None, description="流向(°)")
    wave_height: Optional[float] = Field(None, description="波高(m)")
    wave_period: Optional[float] = Field(None, description="波周期(s)")


class BuoyDataCreate(BuoyDataBase):
    pass


class BuoyDataResponse(BuoyDataBase):
    id: int
    is_missing: bool
    missing_fields: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessingRecordBase(BaseModel):
    batch_no: str = Field(..., description="批次号")
    inspection_id: Optional[int] = Field(None, description="巡检记录ID")
    buoy_data_id: Optional[int] = Field(None, description="浮标数据ID")
    beach_id: int = Field(..., description="浴场ID")


class ProcessingRecordCreate(ProcessingRecordBase):
    pass


class ProcessingRecordResponse(ProcessingRecordBase):
    id: int
    process_time: datetime
    trajectory_drift: Optional[float] = None
    is_drift_abnormal: Optional[bool] = None
    drift_calculation_note: Optional[str] = None
    water_quality_level: Optional[str] = None
    water_quality_score: Optional[float] = None
    is_water_abnormal: Optional[bool] = None
    water_calculation_note: Optional[str] = None
    risk_level: str
    risk_score: Optional[float] = None
    has_processed: bool
    processing_opinion: Optional[str] = None
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    is_reviewed: bool
    review_opinion: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    calculation_status: str
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    inspection: Optional[InspectionRecordResponse] = None
    buoy_data: Optional[BuoyDataResponse] = None
    beach: Optional[BeachInfoResponse] = None

    class Config:
        from_attributes = True


class AnomalyRecordBase(BaseModel):
    processing_record_id: int = Field(..., description="处理记录ID")
    beach_id: int = Field(..., description="浴场ID")
    anomaly_type: str = Field(..., description="异常类型")
    anomaly_level: str = Field("一般", description="异常等级")
    description: str = Field(..., description="异常描述")
    anomaly_value: Optional[float] = Field(None, description="异常值")
    threshold: Optional[float] = Field(None, description="阈值")
    unit: Optional[str] = Field(None, description="单位")
    formula: Optional[str] = Field(None, description="计算公式")


class AnomalyRecordCreate(AnomalyRecordBase):
    pass


class AnomalyRecordResponse(AnomalyRecordBase):
    id: int
    anomaly_no: str
    occurrence_time: datetime
    is_resolved: bool
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    processing_record: Optional[ProcessingRecordResponse] = None
    beach: Optional[BeachInfoResponse] = None

    class Config:
        from_attributes = True


class DataGapBase(BaseModel):
    batch_no: str = Field(..., description="批次号")
    beach_id: int = Field(..., description="浴场ID")
    gap_type: str = Field(..., description="缺口类型")
    description: str = Field(..., description="缺口描述")
    missing_data_time: Optional[datetime] = Field(None, description="缺失数据时间")
    missing_fields: Optional[str] = Field(None, description="缺失字段")


class DataGapResponse(DataGapBase):
    id: int
    is_filled: bool
    filled_by: Optional[str] = None
    filled_at: Optional[datetime] = None
    fill_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResultResponse(BaseModel):
    batch_no: str
    total_records: int
    success_count: int
    partial_count: int
    failed_count: int
    gap_count: int
    message: str
    gaps: List[DataGapResponse] = []


class CalculationFormula(BaseModel):
    name: str
    formula: str
    unit: str
    description: str
    scope: str
    threshold: float
    failure_reasons: List[str]


class TrajectoryDriftCalcRequest(BaseModel):
    point1_lat: float
    point1_lng: float
    point2_lat: float
    point2_lng: float
    safe_radius: float = 500.0


class TrajectoryDriftCalcResponse(BaseModel):
    drift_distance: float
    unit: str
    is_abnormal: bool
    threshold: float
    formula: str
    calculation_note: str
    failure_reason: Optional[str] = None


class WaterQualityCalcRequest(BaseModel):
    water_temperature: Optional[float] = None
    ph_value: Optional[float] = None
    dissolved_oxygen: Optional[float] = None
    turbidity: Optional[float] = None
    salinity: Optional[float] = None


class WaterQualityCalcResponse(BaseModel):
    quality_level: str
    quality_score: float
    is_abnormal: bool
    indicators: Dict[str, Any]
    calculation_note: str
    failure_reason: Optional[str] = None


class ReviewRequest(BaseModel):
    processing_record_id: int
    review_opinion: str
    reviewed_by: str
    need_recalculate: bool = False


class TraceResponse(BaseModel):
    anomaly: AnomalyRecordResponse
    processing_record: ProcessingRecordResponse
    inspection: Optional[InspectionRecordResponse] = None
    buoy_data: Optional[BuoyDataResponse] = None
    beach: BeachInfoResponse
    trace_path: List[Dict[str, Any]] = []
