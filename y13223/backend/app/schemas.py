from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChangeLogBase(BaseModel):
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    source: str
    source_ref: Optional[str] = None
    operator: Optional[str] = None


class ChangeLogOut(ChangeLogBase):
    id: int
    track_id: int
    changed_at: datetime

    class Config:
        from_attributes = True


class TrackBase(BaseModel):
    filename: str
    track_name: str
    track_no: Optional[str] = None
    artist: Optional[str] = None
    contract_scan_ref: Optional[str] = None
    is_anomaly: bool = False
    anomaly_type: Optional[str] = None
    current_note: Optional[str] = None
    current_source: str = "system"


class TrackCreate(TrackBase):
    pass


class TrackUpdate(BaseModel):
    filename: Optional[str] = None
    track_name: Optional[str] = None
    track_no: Optional[str] = None
    artist: Optional[str] = None
    contract_scan_ref: Optional[str] = None
    is_anomaly: Optional[bool] = None
    anomaly_type: Optional[str] = None
    current_note: Optional[str] = None
    current_source: Optional[str] = None
    operator: Optional[str] = None
    source_ref: Optional[str] = None


class HumanVerify(BaseModel):
    verified: bool
    verifier: str
    reason: str
    next_step: Optional[str] = None
    operator: Optional[str] = None


class TrackOut(TrackBase):
    id: int
    human_verified: bool = False
    human_verifier: Optional[str] = None
    human_verify_reason: Optional[str] = None
    next_step: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    change_logs: List[ChangeLogOut] = []
    anomaly_reason_human: Optional[str] = None
    bad_data_hint: Optional[str] = None

    class Config:
        from_attributes = True
