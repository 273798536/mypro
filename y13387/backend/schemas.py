from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any, Dict


class DriftCaseBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    case_no: str
    title: str
    model_name: str


class DriftCaseOut(DriftCaseBase):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    latest_run_id: Optional[int] = None
    latest_status: Optional[str] = None


class ReplayRunOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: int
    case_id: int
    run_version: int
    model_version: str
    status: str
    trigger_source: str
    triggered_by: str
    drift_score: Optional[float] = None
    threshold: Optional[float] = None
    is_drift: Optional[bool] = None
    final_conclusion: Optional[str] = None
    feature_late_reason: Optional[str] = None
    confirm_next_step: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None


class ReplayRunDetail(ReplayRunOut):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    snapshots: List["FeatureSnapshotOut"] = []
    materials: List["MaterialMappingOut"] = []
    judgments: List["ManualJudgmentOut"] = []


class FeatureSnapshotOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: int
    run_id: int
    feature_name: str
    reference_dist: Dict[str, Any]
    current_dist: Dict[str, Any]
    ks_statistic: Optional[float] = None
    was_late: bool
    arrived_at: Optional[datetime] = None
    created_at: datetime


class MaterialMappingIn(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    material_name_raw: str
    material_name_standard: str
    matched_evidence: str
    linked_conclusion: str
    uploaded_by: str


class MaterialMappingOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: int
    run_id: int
    material_name_raw: str
    material_name_standard: str
    matched_evidence: str
    linked_conclusion: str
    uploaded_by: str
    created_at: datetime


class ManualJudgmentIn(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    run_id: int
    judge_name: str
    judgment: str
    reason: str


class ManualJudgmentOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: int
    run_id: int
    judge_name: str
    judgment: str
    reason: str
    before_status: str
    after_status: str
    preserved: bool
    prev_run_id: Optional[int] = None
    created_at: datetime


class TimelineEventOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: int
    case_id: int
    run_id: Optional[int] = None
    event_type: str
    operator: str
    description: str
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime


class TriggerRerunIn(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    case_id: int
    model_version: Optional[str] = None
    triggered_by: str
    trigger_source: str = "manual"


class ConfirmLateIn(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    run_id: int
    judge_name: str
    confirmed: bool
    reason: str
    next_step: Optional[str] = None


class ExportRunIn(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    run_id: int
    exported_by: str


class RunCompareOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    run_a: ReplayRunDetail
    run_b: ReplayRunDetail
    status_diff: Dict[str, Any]
    judgment_diff: Dict[str, Any]


ReplayRunDetail.model_rebuild()
