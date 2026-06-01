from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel


class ExperimentCreate(BaseModel):
    title: str
    frequency_hz: float
    pipe_length_m: float
    temperature_c: Optional[float] = 20.0
    temperature_corrected: Optional[bool] = False
    temperature_correction_applied: Optional[float] = 0.0
    classroom_notes: Optional[str] = ""
    source_ref: Optional[str] = None


class ExperimentUpdate(BaseModel):
    title: Optional[str] = None
    frequency_hz: Optional[float] = None
    pipe_length_m: Optional[float] = None
    temperature_c: Optional[float] = None
    temperature_corrected: Optional[bool] = None
    temperature_correction_applied: Optional[float] = None
    classroom_notes: Optional[str] = None
    source_ref: Optional[str] = None
    reason: Optional[str] = None


class NodeMarkingCreate(BaseModel):
    position_m: float
    is_antinode: bool = False
    manual_override: Optional[bool] = False
    override_reason: Optional[str] = None


class NodeMarkingUpdate(BaseModel):
    position_m: Optional[float] = None
    is_antinode: Optional[bool] = None
    override_reason: Optional[str] = None


class NodeMarkingOut(BaseModel):
    id: int
    experiment_id: int
    position_m: float
    is_antinode: bool
    manual_override: bool
    override_reason: Optional[str]
    original_position_m: Optional[float]
    original_is_antinode: Optional[bool]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    id: int
    experiment_id: Optional[int]
    entity_type: str
    entity_id: int
    field_changed: str
    old_value: Optional[str]
    new_value: Optional[str]
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ExperimentOut(BaseModel):
    id: int
    title: str
    frequency_hz: float
    pipe_length_m: float
    temperature_c: Optional[float]
    temperature_corrected: bool
    temperature_correction_applied: float
    classroom_notes: Optional[str]
    source_ref: Optional[str]
    created_at: datetime
    updated_at: datetime
    nodes: List[NodeMarkingOut] = []
    audit_entries: List[AuditLogOut] = []

    class Config:
        from_attributes = True


class ExperimentListItem(BaseModel):
    id: int
    title: str
    frequency_hz: float
    pipe_length_m: float
    temperature_c: Optional[float]
    temperature_corrected: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TemperatureCorrectRequest(BaseModel):
    temperature_c: float
    reason: Optional[str] = None


class ReportOut(BaseModel):
    experiment: ExperimentOut
    speed_of_sound: Optional[float]
    corrected_speed_of_sound: Optional[float]
    node_corrections: List[Dict]
    temperature_correction_impact: Optional[dict]
