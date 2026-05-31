from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class InverterBase(BaseModel):
    name: str
    model: Optional[str] = None
    rated_power: float
    dc_capacity: float
    efficiency: float = 0.96
    temp_coefficient: float = -0.41
    nominal_temp: float = 25.0
    clipping_threshold: float = 0.98


class InverterCreate(InverterBase):
    pass


class InverterResponse(InverterBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ComponentPowerCreate(BaseModel):
    inverter_id: int
    timestamp: datetime
    dc_power: Optional[float] = None
    ac_power: Optional[float] = None
    module_temp: Optional[float] = None
    inverter_temp: Optional[float] = None


class IrradianceCreate(BaseModel):
    inverter_id: int
    timestamp: datetime
    global_irradiance: Optional[float] = None
    plane_irradiance: Optional[float] = None
    ambient_temp: Optional[float] = None
    wind_speed: Optional[float] = None


class CurtailmentRecordCreate(BaseModel):
    inverter_id: int
    start_time: datetime
    end_time: datetime
    curtailment_type: str
    reason: Optional[str] = None
    power_limit: Optional[float] = None
    approved_by: Optional[str] = None


class ClippingPeriod(BaseModel):
    start_time: datetime
    end_time: datetime
    duration_minutes: float
    max_expected_power: float
    max_actual_power: float
    clipping_loss: float
    cause: str


class LossBreakdown(BaseModel):
    clipping_loss: float
    temperature_loss: float
    curtailment_loss: float
    irradiance_gap_loss: float
    other_loss: float


class AnalysisResultBase(BaseModel):
    inverter_id: int
    analysis_date: datetime
    scenario: Optional[str] = None


class AnalysisResultResponse(BaseModel):
    id: int
    inverter_id: int
    analysis_date: datetime
    scenario: Optional[str] = None
    status: str

    total_expected_energy: Optional[float] = None
    total_actual_energy: Optional[float] = None
    total_loss_energy: Optional[float] = None
    loss_rate: Optional[float] = None

    clipping_loss: Optional[float] = None
    temperature_loss: Optional[float] = None
    curtailment_loss: Optional[float] = None
    irradiance_gap_loss: Optional[float] = None
    other_loss: Optional[float] = None

    summary: Optional[str] = None
    inverter_params: Optional[Dict[str, Any]] = None

    created_at: datetime
    updated_at: datetime
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalysisResultDetail(AnalysisResultResponse):
    peak_clipping_periods: Optional[List[ClippingPeriod]] = None
    clipping_details: Optional[Dict[str, Any]] = None
    power_curve_data: Optional[Dict[str, Any]] = None
    loss_analysis: Optional[Dict[str, Any]] = None


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="新状态: pending/processing/completed/confirmed")
    confirmed_by: Optional[str] = None


class SampleGenerateRequest(BaseModel):
    scenario: str = Field(..., description="场景: normal/irradiance_gap/temperature_high/curtailment_overlap")
    inverter_name: Optional[str] = None
    analysis_date: Optional[datetime] = None


class DataImportResponse(BaseModel):
    success: bool
    message: str
    component_power_count: int = 0
    irradiance_count: int = 0
    curtailment_count: int = 0
    errors: List[str] = []


class ExportRequest(BaseModel):
    format: str = Field(default="csv", description="导出格式: csv/excel")
    include_details: bool = Field(default=True, description="是否包含详细数据")
