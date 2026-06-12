from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
import warnings

warnings.filterwarnings("ignore")


class GraphNode(BaseModel):
    id: str
    name: Optional[str] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float
    unit: str = "meter"
    attributes: Optional[Dict[str, Any]] = None


class PathQuery(BaseModel):
    source: str
    target: str
    preferred_unit: str = "meter"


class BatchCreateRequest(BaseModel):
    batch_name: str
    created_by: str
    description: Optional[str] = None
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    queries: List[PathQuery] = []


class UnitConversionRequest(BaseModel):
    record_id: int
    from_unit: str
    to_unit: str
    formula_override: Optional[str] = None


class StudentNoteCreate(BaseModel):
    batch_id: int
    note_code: str
    content: str
    student_id: Optional[str] = None
    note_type: str = "error_remark"
    added_by: str


class NoteApplyRequest(BaseModel):
    note_id: int
    target_record_ids: Optional[List[int]] = None


class ChangeJudgmentRequest(BaseModel):
    record_id: int
    new_judgment: str
    reason: str
    changed_by: str
    source_type: str = "manual"


class EvidenceSubmitRequest(BaseModel):
    record_id: int
    evidence_name: str
    evidence_type: str
    detail: str
    submitted_by: str


class RecalcRequest(BaseModel):
    batch_id: int
    note_ids: Optional[List[int]] = None


class PathRecordResponse(BaseModel):
    id: int
    batch_id: int
    record_code: str
    source_node: str
    target_node: str
    original_distance: float
    original_unit: str
    original_judgment: str
    current_distance: Optional[float]
    current_unit: str
    current_judgment: str
    is_out_of_bounds: bool
    bounds_detail: Optional[str]
    unit_conversion_note: Optional[str]
    processing_status: str
    evidence_status: str
    evidence_missing_items: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChangeHistoryResponse(BaseModel):
    id: int
    record_id: Optional[int]
    change_type: str
    field_changed: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    old_judgment: Optional[str]
    new_judgment: Optional[str]
    source_type: str
    source_id: Optional[str]
    source_detail: Optional[str]
    changed_by: str
    changed_at: datetime
    reason: Optional[str]
    current_status_after: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class StudentNoteResponse(BaseModel):
    id: int
    batch_id: int
    note_code: str
    content: str
    student_id: Optional[str]
    note_type: str
    added_by: str
    added_at: datetime
    is_applied: bool
    applied_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class NoteImpactResponse(BaseModel):
    id: int
    note_id: int
    record_id: int
    judgment_before: Optional[str]
    judgment_after: Optional[str]
    distance_before: Optional[float]
    distance_after: Optional[float]
    path_changed: bool
    impact_detail: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExtrapolationWarningResponse(BaseModel):
    id: int
    record_id: int
    warning_type: str
    warning_detail: str
    affected_field: Optional[str]
    raw_value: Optional[str]
    boundary_min: Optional[float]
    boundary_max: Optional[float]
    is_handled: bool
    handling_note: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvidenceItemResponse(BaseModel):
    id: int
    record_id: int
    evidence_name: str
    evidence_type: str
    status: str
    submitted_by: Optional[str]
    submitted_at: Optional[datetime]
    detail: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class BatchStatusResponse(BaseModel):
    batch_id: int
    batch_name: str
    total_records: int
    processed_count: int
    pending_count: int
    need_evidence_count: int
    evidence_complete_count: int
    out_of_bounds_count: int
    note_count: int
    change_count: int

    model_config = ConfigDict(from_attributes=True)


class ConsistencyCheckResponse(BaseModel):
    record_id: Optional[int]
    check_type: str
    is_consistent: bool
    chart_value: Optional[str]
    detail_value: Optional[str]
    inconsistency_detail: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class BatchVerifyResponse(BaseModel):
    batch_id: int
    total_records: int
    records: List[PathRecordResponse]
    warnings: List[ExtrapolationWarningResponse]
    unit_conversions: List[Dict[str, Any]]
