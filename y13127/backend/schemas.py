from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPORTED = "exported"


class ProcessingStatusEnum(str, Enum):
    PENDING = "pending"
    MAPPED = "mapped"
    ADOPTED = "adopted"
    IGNORED = "ignored"


class TraceStageEnum(str, Enum):
    MATERIAL = "material"
    PREPROCESS = "preprocess"
    CALCULATION = "calculation"
    ADJUST = "adjust"
    FINALIZE = "finalize"


# ============ 试算主表 Schema ============

class TrialCalculationBase(BaseModel):
    project_name: str = Field(..., description="项目名称")
    parameter_name: str = Field(..., description="参数名称")
    description: Optional[str] = None
    prior_alpha: float = Field(..., gt=0, description="先验Alpha>0")
    prior_beta: float = Field(..., gt=0, description="先验Beta>0")
    weight: float = Field(1.0, gt=0, description="权重>0")
    sample_success: int = Field(0, ge=0)
    sample_total: int = Field(0, ge=0)
    source_batch_no: Optional[str] = None
    source_filename: Optional[str] = None
    source_uploader: Optional[str] = None


class TrialCalculationCreate(TrialCalculationBase):
    raw_data_snapshot: Optional[Dict[str, Any]] = None
    field_mapping_snapshot: Optional[Dict[str, str]] = None
    created_by: Optional[str] = None


class TrialCalculationUpdate(BaseModel):
    project_name: Optional[str] = None
    parameter_name: Optional[str] = None
    description: Optional[str] = None
    prior_alpha: Optional[float] = Field(None, gt=0)
    prior_beta: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, gt=0)
    sample_success: Optional[int] = Field(None, ge=0)
    sample_total: Optional[int] = Field(None, ge=0)
    status: Optional[StatusEnum] = None
    status_remark: Optional[str] = None
    is_duplicate: Optional[bool] = None
    duplicate_reason: Optional[str] = None
    duplicate_of_id: Optional[int] = None
    updated_by: Optional[str] = None
    weight_change_reason: Optional[str] = None
    weight_change_historical_answer_id: Optional[int] = None


class TrialCalculationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trial_no: str
    project_name: str
    parameter_name: str
    description: Optional[str] = None

    prior_alpha: float
    prior_beta: float
    prior_mean: Optional[float] = None
    weight: float

    sample_success: int
    sample_total: int
    sample_fail: Optional[int] = None

    posterior_alpha: Optional[float] = None
    posterior_beta: Optional[float] = None
    posterior_mean: Optional[float] = None

    status: str
    status_label: Optional[str] = None
    status_remark: Optional[str] = None
    status_export_description: Optional[str] = None

    is_duplicate: bool
    duplicate_reason: Optional[str] = None
    duplicate_of_id: Optional[int] = None
    duplicate_tag: Optional[str] = None

    source_batch_no: Optional[str] = None
    source_filename: Optional[str] = None
    source_uploader: Optional[str] = None
    source_import_time: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    weight_change_count: Optional[int] = None
    historical_answer_count: Optional[int] = None


class TrialCalculationDetailOut(TrialCalculationOut):
    raw_data_snapshot: Optional[Dict[str, Any]] = None
    field_mapping_snapshot: Optional[Dict[str, str]] = None
    weight_changes: List[Dict[str, Any]] = []
    status_changes: List[Dict[str, Any]] = []
    historical_answers: List[Dict[str, Any]] = []
    trace_records: List[Dict[str, Any]] = []
    export_records: List[Dict[str, Any]] = []


class TrialCalculationListResponse(BaseModel):
    items: List[TrialCalculationOut]
    total: int
    page: int
    page_size: int


# ============ 权重修改记录 Schema ============

class WeightChangeLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trial_id: int
    old_weight: float
    new_weight: float
    historical_answer_id: Optional[int] = None
    reference_answer_value: Optional[float] = None
    reason: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime


# ============ 状态变更 Schema ============

class StatusChangeCreate(BaseModel):
    new_status: StatusEnum
    remark: Optional[str] = None
    changed_by: Optional[str] = None


class StatusChangeLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trial_id: int
    old_status: str
    new_status: str
    old_status_label: Optional[str] = None
    new_status_label: Optional[str] = None
    remark: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime


# ============ 历史答案 Schema ============

class HistoricalAnswerCreate(BaseModel):
    answer_source: str
    answer_batch: Optional[str] = None
    original_field_names: Optional[List[str]] = None
    standardized_field_map: Optional[Dict[str, Any]] = None
    answer_value: float
    answer_confidence: Optional[float] = None
    processing_status: ProcessingStatusEnum = ProcessingStatusEnum.PENDING
    processing_remark: Optional[str] = None
    raw_answer_payload: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None


class HistoricalAnswerUpdate(BaseModel):
    processing_status: Optional[ProcessingStatusEnum] = None
    processing_remark: Optional[str] = None
    answer_value: Optional[float] = None
    answer_confidence: Optional[float] = None


class HistoricalAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trial_id: int
    answer_source: str
    answer_batch: Optional[str] = None
    original_field_names: Optional[List[str]] = None
    standardized_field_map: Optional[Dict[str, Any]] = None
    answer_value: float
    answer_confidence: Optional[float] = None
    processing_status: str
    processing_status_label: Optional[str] = None
    processing_remark: Optional[str] = None
    raw_answer_payload: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None
    created_at: datetime
    adopted_at: Optional[datetime] = None


# ============ 追溯线索 Schema ============

class TraceRecordCreate(BaseModel):
    trace_stage: TraceStageEnum
    field_name: Optional[str] = None
    field_value_before: Optional[str] = None
    field_value_after: Optional[str] = None
    narrative: str
    evidence_ref: Optional[str] = None
    evidence_snapshot: Optional[Dict[str, Any]] = None
    operator: Optional[str] = None


class TraceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trial_id: int
    trace_stage: str
    trace_stage_label: Optional[str] = None
    field_name: Optional[str] = None
    field_value_before: Optional[str] = None
    field_value_after: Optional[str] = None
    narrative: str
    evidence_ref: Optional[str] = None
    operator: Optional[str] = None
    operated_at: datetime


# ============ 导出 Schema ============

class ExportRequest(BaseModel):
    export_type: str = "screenshot"
    export_format: str = "xlsx"
    caption_override: Optional[str] = None
    exported_by: Optional[str] = None


class ExportRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trial_id: int
    export_type: str
    export_filename: str
    export_status_label: str
    export_status_description: Optional[str] = None
    status_at_export: str
    is_duplicate_at_export: bool
    weight_at_export: float
    export_screenshot_caption: Optional[str] = None
    exported_by: Optional[str] = None
    exported_at: datetime


# ============ 批量导入 Schema ============

class BatchImportRequest(BaseModel):
    source_filename: str
    source_batch_no: Optional[str] = None
    source_uploader: Optional[str] = None
    records: List[Dict[str, Any]]
    field_mapping: Optional[Dict[str, str]] = None
    historical_answers: Optional[List[Dict[str, Any]]] = None


# ============ 重复样本检测 Schema ============

class DuplicateCheckResult(BaseModel):
    checked_id: int
    checked_trial_no: str
    duplicates_found: List[Dict[str, Any]] = []
    total_matches: int = 0
