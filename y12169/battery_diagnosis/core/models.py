from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator


class DataSourceType(str, Enum):
    VEHICLE_PROFILE = "vehicle_profile"
    TRIP_DATA = "trip_data"
    DIAGNOSIS_REPORT = "diagnosis_report"


class AnomalyType(str, Enum):
    LOW_TEMPERATURE = "low_temperature"
    FAST_CHARGING_EXCESS = "fast_charging_excess"
    ABNORMAL_TRIP = "abnormal_trip"
    BATTERY_DEGRADATION = "battery_degradation"
    DRIVING_HABIT = "driving_habit"


class VehicleProfile(BaseModel):
    vin: str = Field(..., description="车辆识别码")
    brand: str = Field(..., description="品牌")
    model: str = Field(..., description="车型")
    production_date: datetime = Field(..., description="生产日期")
    nominal_range_km: float = Field(..., description="标称续航里程(km)")
    battery_capacity_kwh: float = Field(..., description="电池容量(kWh)")
    initial_battery_health: float = Field(100.0, description="初始电池健康度(%)")
    purchase_date: Optional[datetime] = None
    total_odometer_km: Optional[float] = None

    source_type: DataSourceType = DataSourceType.VEHICLE_PROFILE
    source_file: str = Field(..., description="来源文件名")
    source_line: Optional[int] = Field(None, description="来源文件行号")


class TripRecord(BaseModel):
    trip_id: str = Field(..., description="行程ID")
    vin: str = Field(..., description="车辆识别码")
    start_time: datetime = Field(..., description="开始时间")
    end_time: datetime = Field(..., description="结束时间")
    start_soc: float = Field(..., description="起始SOC(%)")
    end_soc: float = Field(..., description="结束SOC(%)")
    distance_km: float = Field(..., description="行驶距离(km)")
    avg_speed_kmh: float = Field(..., description="平均速度(km/h)")
    avg_temp_c: float = Field(..., description="平均环境温度(°C)")
    min_temp_c: Optional[float] = None
    max_temp_c: Optional[float] = None
    elevation_gain_m: Optional[float] = None
    ac_usage_hours: Optional[float] = None
    fast_charged_before: bool = Field(False, description="行程前是否快充")
    charging_count_7d: int = Field(0, description="7天内充电次数")
    fast_charging_count_7d: int = Field(0, description="7天内快充次数")

    source_type: DataSourceType = DataSourceType.TRIP_DATA
    source_file: str = Field(..., description="来源文件名")
    source_line: Optional[int] = Field(None, description="来源文件行号")

    @validator('start_soc', 'end_soc')
    def check_soc_range(cls, v):
        if not 0 <= v <= 100:
            raise ValueError(f"SOC must be between 0 and 100, got {v}")
        return v

    @validator('distance_km', 'avg_speed_kmh')
    def check_positive(cls, v):
        if v < 0:
            raise ValueError(f"Value must be non-negative, got {v}")
        return v


class DiagnosisReport(BaseModel):
    report_id: str = Field(..., description="报告ID")
    vin: str = Field(..., description="车辆识别码")
    report_date: datetime = Field(..., description="报告日期")
    current_battery_health: float = Field(..., description="当前电池健康度(%)")
    estimated_range_km: Optional[float] = None
    fault_codes: Optional[List[str]] = None
    technician_notes: Optional[str] = None

    source_type: DataSourceType = DataSourceType.DIAGNOSIS_REPORT
    source_file: str = Field(..., description="来源文件名")
    source_line: Optional[int] = Field(None, description="来源文件行号")


class DataPacket(BaseModel):
    packet_id: str = Field(..., description="数据包ID")
    received_at: datetime = Field(default_factory=datetime.now)
    vehicle_profile: Optional[VehicleProfile] = None
    trip_records: List[TripRecord] = Field(default_factory=list)
    diagnosis_reports: List[DiagnosisReport] = Field(default_factory=list)
    raw_files: List[str] = Field(default_factory=list)


class FactorContribution(BaseModel):
    factor: AnomalyType
    contribution_percent: float = Field(..., description="贡献度(%)")
    impact_range_km: float = Field(..., description="影响续航里程(km)")
    evidence: List[str] = Field(default_factory=list, description="证据列表")
    source_refs: List[str] = Field(default_factory=list, description="来源引用")


class AnomalyInstance(BaseModel):
    anomaly_id: str = Field(..., description="异常ID")
    anomaly_type: AnomalyType
    severity: str = Field(..., description="严重程度: low/medium/high/critical")
    description: str = Field(..., description="异常描述")
    detected_at: datetime = Field(..., description="检测时间")
    affected_range_km: float = Field(..., description="影响续航(km)")
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    source_refs: List[str] = Field(default_factory=list, description="来源引用")
    trip_ids: List[str] = Field(default_factory=list, description="关联行程ID")


class RangeEstimate(BaseModel):
    vin: str
    estimate_date: datetime = Field(default_factory=datetime.now)
    nominal_range_km: float
    actual_estimated_range_km: float
    battery_health_percent: float
    base_consumption_kwh_100km: float
    adjusted_consumption_kwh_100km: float
    confidence_score: float = Field(..., description="置信度(0-1)")
    method: str = Field(..., description="估算方法")
    source_refs: List[str] = Field(default_factory=list)


class DiagnosisResult(BaseModel):
    diagnosis_id: str = Field(..., description="诊断ID")
    vin: str
    packet_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    range_estimate: RangeEstimate
    factor_breakdown: List[FactorContribution]
    anomalies: List[AnomalyInstance]
    recommendations: List[str]
    summary: str
    data_quality_score: float = Field(..., description="数据质量评分(0-1)")

    class Config:
        orm_mode = True


class DiagnosisRecordDB(BaseModel):
    id: Optional[int] = None
    diagnosis_id: str
    vin: str
    packet_id: str
    created_at: datetime
    result_json: str
    hash_signature: str = Field(..., description="用于去重的哈希签名")
