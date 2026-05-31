from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    SAFE = "safe"
    LOW_RISK = "low_risk"
    MODERATE = "moderate"
    HIGH_RISK = "high_risk"
    DANGER = "danger"


class MeasurementCreate(BaseModel):
    zone_name: str = Field(..., description="risk zone name")
    x: Optional[float] = Field(None, description="x coordinate (m)")
    y: Optional[float] = Field(None, description="y coordinate (m)")
    ice_thickness_cm: float = Field(..., gt=0, description="ice thickness (cm)")
    measured_at: Optional[datetime] = Field(None, description="measurement time")
    notes: Optional[str] = Field(None, description="field notes")


class MeasurementUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    ice_thickness_cm: Optional[float] = Field(None, gt=0)
    measured_at: Optional[datetime] = None
    notes: Optional[str] = None


class MeasurementOut(BaseModel):
    id: int
    zone_name: str
    x: Optional[float]
    y: Optional[float]
    ice_thickness_cm: float
    measured_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime


class TemperatureCreate(BaseModel):
    recorded_at: Optional[datetime] = Field(None, description="record time")
    temperature_c: Optional[float] = Field(None, description="temperature (C)")
    source: Optional[str] = Field(None, description="data source")


class TemperatureOut(BaseModel):
    id: int
    recorded_at: Optional[datetime]
    temperature_c: Optional[float]
    source: Optional[str]
    created_at: datetime


class ParticipantCreate(BaseModel):
    zone_name: str = Field(..., description="risk zone name")
    planned_count: int = Field(..., ge=0, description="planned number of people")
    planned_at: Optional[datetime] = Field(None, description="planned activity time")


class ParticipantOut(BaseModel):
    id: int
    zone_name: str
    planned_count: int
    planned_at: Optional[datetime]
    created_at: datetime


class WarningDetail(BaseModel):
    code: str
    message: str
    suggestion: str


class AssessmentOut(BaseModel):
    id: int
    zone_name: str
    assessed_at: datetime
    risk_level: RiskLevel
    avg_thickness_cm: Optional[float]
    min_thickness_cm: Optional[float]
    max_safe_load_kg: Optional[float]
    current_load_kg: Optional[float]
    safety_margin: Optional[float]
    measurement_count: int
    sparse_point_warning: Optional[WarningDetail]
    temperature_warning: Optional[WarningDetail]
    overcapacity_warning: Optional[WarningDetail]
    recommendations: list[str]


class AssessmentSummary(BaseModel):
    zone_name: str
    risk_level: RiskLevel
    assessed_at: datetime
    measurement_count: int
    has_warnings: bool
