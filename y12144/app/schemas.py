from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models import DataStatus, NextVerifier


class StationBase(BaseModel):
    station_code: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    elevation: Optional[float] = 0.0
    network: Optional[str] = None
    status: Optional[DataStatus] = DataStatus.NORMAL


class StationCreate(StationBase):
    pass


class StationUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None
    network: Optional[str] = None
    status: Optional[DataStatus] = None


class StationOut(StationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StationDetail(StationOut):
    arrivals_count: int = 0


class ArrivalBase(BaseModel):
    station_id: int
    event_tag: str
    phase: str
    arrival_time: Optional[float] = None
    arrival_time_str: Optional[str] = None
    uncertainty: Optional[float] = 0.1
    status: Optional[DataStatus] = DataStatus.PENDING_CONFIRM
    next_verifier: Optional[NextVerifier] = None
    remark: Optional[str] = None
    magnitude_remark: Optional[str] = None


class ArrivalCreate(ArrivalBase):
    pass


class ArrivalUpdate(BaseModel):
    arrival_time: Optional[float] = None
    arrival_time_str: Optional[str] = None
    uncertainty: Optional[float] = None
    status: Optional[DataStatus] = None
    next_verifier: Optional[NextVerifier] = None
    remark: Optional[str] = None
    magnitude_remark: Optional[str] = None


class StatusUpdate(BaseModel):
    status: DataStatus
    next_verifier: Optional[NextVerifier] = None
    remark: Optional[str] = None
    operator: Optional[str] = "system"


class MagnitudeRemarkUpdate(BaseModel):
    magnitude_remark: str
    operator: Optional[str] = "system"
    change_reason: Optional[str] = None


class ArrivalOut(ArrivalBase):
    id: int
    has_magnitude_update: bool
    created_at: datetime
    updated_at: datetime
    station: Optional[StationOut] = None

    class Config:
        from_attributes = True


class VelocityLayerBase(BaseModel):
    depth_top: float
    depth_bottom: float
    vp: float
    vs: float


class VelocityLayerCreate(VelocityLayerBase):
    pass


class VelocityLayerOut(VelocityLayerBase):
    id: int

    class Config:
        from_attributes = True


class VelocityModelBase(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_name: str
    version: str
    region: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True
    status: Optional[DataStatus] = DataStatus.NORMAL


class VelocityModelCreate(VelocityModelBase):
    layers: List[VelocityLayerCreate]


class VelocityModelOut(VelocityModelBase):
    id: int
    layers: List[VelocityLayerOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class InversionStationOut(BaseModel):
    id: Optional[int] = None
    station_id: int
    station_code: Optional[str] = None
    station_name: Optional[str] = None
    arrival_id: int
    phase: Optional[str] = None
    observed_time: Optional[float] = None
    calculated_time: Optional[float] = None
    residual: Optional[float] = None
    weight: float = 1.0
    is_rejected: bool = False
    reject_reason: Optional[str] = None

    class Config:
        from_attributes = True


class InversionResultBase(BaseModel):
    event_tag: str


class InversionCreate(InversionResultBase):
    velocity_model_id: Optional[int] = None
    residual_threshold: Optional[float] = 2.0
    max_iterations: Optional[int] = 20


class InversionResultOut(BaseModel):
    id: int
    event_tag: str
    latitude: float
    longitude: float
    depth: float
    origin_time: float
    origin_time_str: Optional[str]
    magnitude: Optional[float]
    residual_mean: Optional[float]
    residual_std: Optional[float]
    num_stations_used: int
    num_stations_rejected: int
    iterations: int
    convergence: bool
    status: DataStatus
    remark: Optional[str]
    created_at: datetime
    stations_used: List[InversionStationOut] = []
    velocity_model: Optional[VelocityModelOut] = None

    class Config:
        from_attributes = True


class InversionDetail(InversionResultOut):
    pass


class AuditLogOut(BaseModel):
    id: int
    arrival_id: int
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    operator: str
    change_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TraceResult(BaseModel):
    station: Optional[StationOut] = None
    arrivals: List[ArrivalOut] = []
    inversions: List[InversionResultOut] = []
    message: str


class StatusTransition(BaseModel):
    from_status: DataStatus
    to_status: DataStatus
    allowed: bool
    required_verifier: Optional[NextVerifier] = None
    description: str


class BulkImportResult(BaseModel):
    stations_imported: int = 0
    stations_skipped: int = 0
    arrivals_imported: int = 0
    arrivals_skipped: int = 0
    velocity_imported: int = 0
    errors: List[str] = []


class SampleGenerateResult(BaseModel):
    event_tag: str
    stations_created: int
    arrivals_created: int
    velocity_model_created: int
    has_missing_arrival: bool
    has_duplicate_station: bool
    has_wrong_velocity: bool
    message: str
