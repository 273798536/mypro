from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BufferComponentBase(BaseModel):
    reagent_name: str
    formula: Optional[str] = None
    molar_mass: float
    target_concentration: float
    actual_concentration: Optional[float] = None
    theoretical_mass: Optional[float] = None
    actual_mass: Optional[float] = None
    purity: float = 1.0


class BufferComponentCreate(BufferComponentBase):
    pass


class BufferComponent(BufferComponentBase):
    id: int
    record_id: int

    class Config:
        from_attributes = True


class TemperaturePointBase(BaseModel):
    time_minute: float
    set_temp: float
    actual_temp: float


class TemperaturePointCreate(TemperaturePointBase):
    pass


class TemperaturePoint(TemperaturePointBase):
    id: int
    record_id: int

    class Config:
        from_attributes = True


class WeighingRecordBase(BaseModel):
    reagent_name: str
    theoretical_mass: float
    actual_mass: float
    tolerance_pct: float = 0.5
    error_pct: Optional[float] = None
    is_pass: Optional[bool] = None


class WeighingRecordCreate(WeighingRecordBase):
    pass


class WeighingRecord(WeighingRecordBase):
    id: int
    record_id: int

    class Config:
        from_attributes = True


class StatusLogBase(BaseModel):
    from_status: str
    to_status: str
    operator: Optional[str] = None
    remark: Optional[str] = None


class StatusLog(StatusLogBase):
    id: int
    record_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BufferRecordBase(BaseModel):
    batch_no: str
    record_date: str
    buffer_name: str
    target_ph: float
    target_volume: float
    actual_ph: Optional[float] = None
    actual_volume: Optional[float] = None
    operator: Optional[str] = None
    reviewer: Optional[str] = None
    status: str = "draft"
    remark: Optional[str] = None
    precision_pass: Optional[bool] = None
    temp_curve_pass: Optional[bool] = None


class BufferRecordCreate(BufferRecordBase):
    components: Optional[List[BufferComponentCreate]] = []
    temperature_points: Optional[List[TemperaturePointCreate]] = []
    weighing_records: Optional[List[WeighingRecordCreate]] = []


class BufferRecordUpdate(BaseModel):
    actual_ph: Optional[float] = None
    actual_volume: Optional[float] = None
    operator: Optional[str] = None
    reviewer: Optional[str] = None
    remark: Optional[str] = None
    components: Optional[List[BufferComponentCreate]] = None
    temperature_points: Optional[List[TemperaturePointCreate]] = None
    weighing_records: Optional[List[WeighingRecordCreate]] = None


class BufferRecordSummary(BaseModel):
    id: int
    batch_no: str
    record_date: str
    buffer_name: str
    target_ph: float
    target_volume: float
    status: str
    precision_pass: Optional[bool] = None
    temp_curve_pass: Optional[bool] = None
    operator: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BufferRecordDetail(BufferRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime
    reported_at: Optional[datetime] = None
    components: List[BufferComponent] = []
    temperature_points: List[TemperaturePoint] = []
    weighing_records: List[WeighingRecord] = []
    status_logs: List[StatusLog] = []

    class Config:
        from_attributes = True


class StatusTransition(BaseModel):
    target_status: str
    operator: Optional[str] = None
    remark: Optional[str] = None


class ConcentrationCalcRequest(BaseModel):
    molar_mass: float = Field(description="摩尔质量 g/mol")
    volume_l: float = Field(description="体积 L")
    concentration_mol: Optional[float] = Field(None, description="目标浓度 mol/L")
    mass_g: Optional[float] = Field(None, description="质量 g")


class ConcentrationCalcResponse(BaseModel):
    concentration_mol: Optional[float] = None
    mass_g: Optional[float] = None
    molar_mass: float
    volume_l: float
    note: str


class BalanceCalcRequest(BaseModel):
    target_ph: float
    acid_pka: float
    conjugate_pka: Optional[float] = None
    total_concentration: float = Field(description="总浓度 mol/L")
    volume_l: float = Field(description="体积 L")
    acid_molar_mass: float
    salt_molar_mass: float
    acid_name: Optional[str] = "弱酸"
    salt_name: Optional[str] = "共轭碱盐"


class BalanceCalcResponse(BaseModel):
    target_ph: float
    acid_pka: float
    ratio_base_acid: float
    acid_concentration: float
    salt_concentration: float
    acid_mass_g: float
    salt_mass_g: float
    acid_name: str
    salt_name: str
    note: str
