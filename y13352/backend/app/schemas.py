from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class RunParameterBase(BaseModel):
    param_name: str
    param_value: str


class RunParameterResponse(RunParameterBase):
    id: int
    changed_from_previous: bool
    previous_value: Optional[str] = None

    class Config:
        from_attributes = True


class ManualJudgmentBase(BaseModel):
    sample_id: str
    original_label: Optional[str] = None
    new_label: str
    reason: Optional[str] = None


class ManualJudgmentCreate(ManualJudgmentBase):
    run_id: Optional[int] = None


class ManualJudgmentResponse(ManualJudgmentBase):
    id: int
    task_id: int
    run_id: Optional[int] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class NoteBase(BaseModel):
    content: str
    note_type: str = "written"


class NoteCreate(NoteBase):
    run_id: Optional[int] = None


class NoteResponse(NoteBase):
    id: int
    task_id: int
    run_id: Optional[int] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReplayRunBase(BaseModel):
    threshold: float = 0.85


class ReplayRunCreate(ReplayRunBase):
    snapshot_file: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class ReplayRunResponse(ReplayRunBase):
    id: int
    task_id: int
    run_number: int
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    snapshot_file: Optional[str] = None
    sample_count: int = 0
    anomaly_count: int = 0
    metrics: Dict[str, Any] = {}
    sample_ids: List[str] = []
    anomaly_ids: List[str] = []
    parameters: List[RunParameterResponse] = []

    class Config:
        from_attributes = True


class ReplayTaskBase(BaseModel):
    name: str
    snapshot_version: Optional[str] = None
    snapshot_alias: Optional[str] = None


class ReplayTaskCreate(ReplayTaskBase):
    pass


class ReplayTaskResponse(ReplayTaskBase):
    id: int
    status: str
    snapshot_alias_points_old: bool = False
    current_status: str
    page_summary: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    runs: List[ReplayRunResponse] = []
    judgments: List[ManualJudgmentResponse] = []
    notes: List[NoteResponse] = []

    class Config:
        from_attributes = True


class TaskSummary(BaseModel):
    task_id: int
    task_name: str
    latest_run_id: Optional[int]
    sample_location: str
    anomaly_location: str
    export_method: str
    anomaly_count: int
    total_samples: int
    last_updated: datetime


class VersionDiff(BaseModel):
    param_diffs: List[Dict[str, Any]]
    metric_diffs: List[Dict[str, Any]]
    sample_diffs: Dict[str, List[str]]
    threshold_diff: Optional[Dict[str, Any]]
    judgment_diffs: List[Dict[str, Any]]
    note_diffs: List[Dict[str, Any]]
    influencing_factors: List[Dict[str, Any]]
    alias_warning: Optional[Dict[str, Any]] = None


class AliasWarning(BaseModel):
    alias_name: str
    points_to_old: bool
    current_file: str
    latest_file: str
    action_steps: List[str]
