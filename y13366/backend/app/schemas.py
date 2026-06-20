from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class ThresholdConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    recall_threshold: float = Field(..., description="召回阈值")
    precision_threshold: Optional[float] = Field(None, description="精确率阈值")
    score_threshold: Optional[float] = Field(None, description="分数阈值")
    extra_rules: Optional[Dict[str, Any]] = Field(None, description="额外规则配置")


class FunnelSnapshotCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    snapshot_name: str
    model_version: str
    threshold_config: ThresholdConfig
    description: Optional[str] = None
    created_by: str
    parent_snapshot_id: Optional[int] = None
    seal_month: Optional[str] = None
    initial_samples: Optional[List[Dict[str, Any]]] = None


class FunnelSnapshotResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    snapshot_name: str
    snapshot_version: str
    model_version: str
    threshold_config: Dict[str, Any]
    description: Optional[str]
    created_by: str
    created_at: datetime
    is_locked: bool
    locked_reason: Optional[str]
    status: str
    parent_snapshot_id: Optional[int]
    seal_month: Optional[str]


class TrainingLogUpload(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    log_name: str
    log_content_summary: str
    uploaded_by: str
    batch_number: int = 1
    is_complete: bool = False
    completeness_note: Optional[str] = None


class TrainingLogResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    snapshot_id: int
    log_name: str
    log_content_summary: str
    uploaded_by: str
    uploaded_at: datetime
    batch_number: int
    is_complete: bool
    completeness_note: Optional[str]


class SampleJudgmentUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    sample_id: str
    human_judgment: str
    judged_by: str
    judgment_note: Optional[str] = None
    is_manual_locked: bool = False
    lock_reason: Optional[str] = None
    change_reason: Optional[str] = None


class SampleJudgmentResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    snapshot_id: int
    sample_id: str
    model_prediction: str
    model_score: Optional[float]
    human_judgment: Optional[str]
    judged_by: Optional[str]
    judged_at: Optional[datetime]
    is_manual_locked: bool
    lock_reason: Optional[str]
    judgment_note: Optional[str]
    change_reason: Optional[str]
    previous_judgment: Optional[str]


class JudgmentHistoryResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    judgment_id: int
    old_judgment: Optional[str]
    new_judgment: str
    changed_by: str
    changed_at: datetime
    change_reason: str
    is_temporary_edit: bool
    editor_role: Optional[str]


class ChangeHistoryResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    snapshot_id: int
    change_type: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    changed_by: str
    changed_at: datetime
    change_reason: str
    affected_samples: Optional[List[str]]
    next_step_hint: Optional[str]


class FeatureMaterialUpload(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    material_name: str
    material_type: str
    uploaded_by: str
    is_late_arrival: bool = False
    impact_description: Optional[str] = None


class FeatureMaterialResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    snapshot_id: int
    material_name: str
    material_type: str
    uploaded_by: str
    uploaded_at: datetime
    is_late_arrival: bool
    impact_description: Optional[str]
    next_action: Optional[str]
    affected_samples_count: int


class ThresholdUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    threshold_config: ThresholdConfig
    updated_by: str
    update_reason: str


class SnapshotCompareResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    sample_id: str
    old_judgment: Optional[str]
    new_judgment: str
    old_score: Optional[float]
    new_score: Optional[float]
    judgment_changed: bool
    explanation: Optional[str] = None
    key_factors: Optional[List[str]] = None


class LateArrivalResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    material_id: int
    is_late: bool
    affected_samples: List[str]
    next_steps: List[str]
    warning_message: str


class SealMonthProcessResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    stage: str
    snapshot_id: int
    changes_summary: List[ChangeHistoryResponse]
    new_materials: List[FeatureMaterialResponse]
    rejudged_samples: List[SnapshotCompareResult]
    final_status: str
    human_readable_summary: str
    action_required: List[str]


class JudgmentExplanationResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    sample_id: str
    old_snapshot_id: int
    new_snapshot_id: int
    old_judgment: str
    new_judgment: str
    explanation_text: str
    key_factors: List[str]
    threshold_differences: Dict[str, Any]
    feature_differences: Optional[Dict[str, Any]]
    created_at: datetime
