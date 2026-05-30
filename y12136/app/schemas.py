from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DataStatus(str, Enum):
    PENDING = "待确认"
    CONFIRMED = "已确认"
    REJECTED = "已驳回"
    CALCULATED = "已计算"


class AnomalyType(str, Enum):
    FLOW_MISSING = "流量缺采"
    TEMP_SENSOR_ERROR = "温度传感器错误"
    DEFROST_CYCLE = "除霜周期"
    EQUIPMENT_MISMATCH = "设备参数不匹配"
    OTHER = "其他异常"


class OperatingMode(str, Enum):
    HEATING = "制热"
    COOLING = "制冷"
    DEFROST = "除霜"
    STANDBY = "待机"


class FlowRecordCreate(BaseModel):
    record_time: datetime
    equipment_id: str
    flow_rate: Optional[float] = None
    is_missing: bool = False


class FlowRecordResponse(BaseModel):
    id: int
    record_time: datetime
    equipment_id: str
    flow_rate: Optional[float]
    is_missing: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    confirmed_by: Optional[str]
    confirmed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TemperatureDataCreate(BaseModel):
    flow_record_id: Optional[int] = None
    record_time: datetime
    equipment_id: str
    inlet_water_temp: float
    outlet_water_temp: float
    outdoor_temp: float
    refrigerant_temp: Optional[float] = None
    compressor_temp: Optional[float] = None


class TemperatureDataResponse(BaseModel):
    id: int
    flow_record_id: int
    record_time: datetime
    equipment_id: str
    inlet_water_temp: float
    outlet_water_temp: float
    outdoor_temp: float
    refrigerant_temp: Optional[float]
    compressor_temp: Optional[float]
    has_sensor_error: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class EquipmentProfileCreate(BaseModel):
    equipment_id: str
    equipment_name: str
    model: str
    rated_power: float
    rated_heating_capacity: Optional[float] = None
    rated_cooling_capacity: Optional[float] = None
    rated_cop_heating: Optional[float] = None
    rated_cop_cooling: Optional[float] = None
    design_flow_rate: float
    min_flow_rate: Optional[float] = None
    max_flow_rate: Optional[float] = None
    design_inlet_temp_heating: Optional[float] = None
    design_outlet_temp_heating: Optional[float] = None
    design_inlet_temp_cooling: Optional[float] = None
    design_outlet_temp_cooling: Optional[float] = None
    installation_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    manufacturer: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    remarks: Optional[str] = None


class EquipmentProfileUpdate(BaseModel):
    equipment_name: Optional[str] = None
    model: Optional[str] = None
    rated_power: Optional[float] = None
    rated_heating_capacity: Optional[float] = None
    rated_cooling_capacity: Optional[float] = None
    rated_cop_heating: Optional[float] = None
    rated_cop_cooling: Optional[float] = None
    design_flow_rate: Optional[float] = None
    min_flow_rate: Optional[float] = None
    max_flow_rate: Optional[float] = None
    design_inlet_temp_heating: Optional[float] = None
    design_outlet_temp_heating: Optional[float] = None
    design_inlet_temp_cooling: Optional[float] = None
    design_outlet_temp_cooling: Optional[float] = None
    installation_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    manufacturer: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    remarks: Optional[str] = None
    changed_by: Optional[str] = None
    change_remarks: Optional[str] = None


class EquipmentProfileResponse(BaseModel):
    id: int
    equipment_id: str
    equipment_name: str
    model: str
    rated_power: float
    rated_heating_capacity: Optional[float]
    rated_cooling_capacity: Optional[float]
    rated_cop_heating: Optional[float]
    rated_cop_cooling: Optional[float]
    design_flow_rate: float
    min_flow_rate: Optional[float]
    max_flow_rate: Optional[float]
    design_inlet_temp_heating: Optional[float]
    design_outlet_temp_heating: Optional[float]
    design_inlet_temp_cooling: Optional[float]
    design_outlet_temp_cooling: Optional[float]
    installation_date: Optional[datetime]
    last_maintenance_date: Optional[datetime]
    manufacturer: Optional[str]
    contact_person: Optional[str]
    contact_phone: Optional[str]
    remarks: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    version: int

    class Config:
        from_attributes = True


class COPResultResponse(BaseModel):
    id: int
    flow_record_id: int
    temperature_data_id: int
    equipment_id: str
    record_time: datetime
    operating_mode: str
    water_temp_diff: float
    flow_rate: float
    heating_capacity: float
    power_consumption: float
    cop: float
    rated_cop: Optional[float]
    cop_deviation: Optional[float]
    operating_condition_group: Optional[str]
    outdoor_temp: float
    has_anomaly: bool
    is_estimated: bool
    calculation_method: str
    equipment_version: int
    status: str
    created_at: datetime
    recalculated_at: Optional[datetime]
    remarks: Optional[str]

    class Config:
        from_attributes = True


class AnomalyRecordResponse(BaseModel):
    id: int
    flow_record_id: Optional[int]
    temperature_data_id: Optional[int]
    cop_result_id: Optional[int]
    equipment_id: str
    record_time: datetime
    anomaly_type: str
    anomaly_description: str
    severity: str
    next_action: str
    responsible_person: str
    contact_phone: Optional[str]
    is_resolved: bool
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    resolution: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DataCollectionRequest(BaseModel):
    record_time: datetime
    equipment_id: str
    inlet_water_temp: float
    outlet_water_temp: float
    outdoor_temp: float
    flow_rate: Optional[float] = None
    is_flow_missing: bool = False
    refrigerant_temp: Optional[float] = None
    compressor_temp: Optional[float] = None


class CalculationResult(BaseModel):
    success: bool
    message: str
    cop_result: Optional[COPResultResponse] = None
    anomalies: List[AnomalyRecordResponse] = Field(default_factory=list)


class OperatingConditionGroup(BaseModel):
    name: str
    min_temp: float
    max_temp: float
    description: str


class EfficiencyReportItem(BaseModel):
    record_time: datetime
    equipment_id: str
    equipment_name: str
    operating_mode: str
    operating_condition_group: str
    outdoor_temp: float
    water_temp_diff: float
    flow_rate: float
    heating_capacity: float
    power_consumption: float
    cop: float
    rated_cop: Optional[float]
    cop_deviation: Optional[float]
    has_anomaly: bool
    is_estimated: bool
    anomaly_type: Optional[str]
    anomaly_description: Optional[str]
    calculation_method: str
    equipment_version: int

    class Config:
        from_attributes = True


class EfficiencyReport(BaseModel):
    report_period: str
    start_time: datetime
    end_time: datetime
    total_records: int
    valid_records: int
    estimated_records: int
    anomaly_records: int
    average_cop: float
    average_rated_cop: float
    average_deviation: float
    operating_condition_summary: dict
    items: List[EfficiencyReportItem]
    generated_at: datetime
