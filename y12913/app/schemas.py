from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MergeStatusEnum(str, Enum):
    PENDING = "pending"
    PASS = "pass"
    FAIL = "fail"
    NEED_CONFIRM = "need_confirm"


class LoraRecordBase(BaseModel):
    lora_id: str = Field(..., min_length=1, max_length=64)
    lora_name: str = Field(..., min_length=1, max_length=256)
    base_model: str = Field(..., min_length=1, max_length=128)
    version: str = Field(..., min_length=1, max_length=32)
    dataset_name: Optional[str] = None
    sample_count: Optional[int] = 0
    epoch: Optional[int] = 0
    learning_rate: Optional[float] = 0.0
    rank: Optional[int] = 0
    alpha: Optional[float] = 0.0
    is_gray_release: Optional[bool] = False
    source_type: Optional[str] = "import"
    source_ref: Optional[str] = None
    truncation_note: Optional[str] = None


class LoraRecordCreate(LoraRecordBase):
    pass


class LoraRecordUpdate(BaseModel):
    lora_name: Optional[str] = None
    status: Optional[str] = None
    merge_result: Optional[str] = None
    merge_result_detail: Optional[str] = None
    safety_check_result: Optional[str] = None
    safety_check_detail: Optional[Dict[str, Any]] = None
    is_gray_release: Optional[bool] = None
    truncation_note: Optional[str] = None


class LoraRecordOut(LoraRecordBase):
    id: int
    status: str
    merge_result: str
    merge_result_detail: Optional[str] = None
    safety_check_result: str
    safety_check_detail: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LoraRecordDetail(LoraRecordOut):
    log_count: int = 0
    feedback_count: int = 0
    latest_feedback: Optional[Dict[str, Any]] = None


class ProcessingLogBase(BaseModel):
    record_id: int
    stage: str
    action: str
    operator: Optional[str] = None
    detail: Optional[Dict[str, Any]] = None
    result: Optional[str] = "success"
    error_msg: Optional[str] = None
    raw_source_snapshot: Optional[str] = None


class ProcessingLogCreate(ProcessingLogBase):
    pass


class ProcessingLogOut(ProcessingLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class HumanFeedbackBase(BaseModel):
    record_id: int
    feedback_id: str
    feedback_type: Optional[str] = None
    content: str
    reviewer: Optional[str] = None
    conclusion: Optional[str] = None
    confidence: Optional[float] = None
    source_channel: Optional[str] = "manual"
    import_batch: Optional[str] = None


class HumanFeedbackCreate(HumanFeedbackBase):
    pass


class HumanFeedbackOut(HumanFeedbackBase):
    id: int
    is_duplicate: bool
    duplicate_of: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GrayComparisonBase(BaseModel):
    record_id: int
    compared_lora_id: Optional[int] = None
    test_case_id: Optional[str] = None
    input_prompt: Optional[str] = None
    output_a: Optional[str] = None
    output_b: Optional[str] = None
    diff_score: Optional[float] = 0.0
    safety_a: Optional[str] = None
    safety_b: Optional[str] = None
    human_preference: Optional[str] = None


class GrayComparisonCreate(GrayComparisonBase):
    pass


class GrayComparisonOut(GrayComparisonBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SafetyRuleBase(BaseModel):
    rule_id: str
    rule_name: str
    rule_type: Optional[str] = None
    pattern: str
    severity: Optional[str] = "warn"
    description: Optional[str] = None
    is_active: Optional[bool] = True


class SafetyRuleCreate(SafetyRuleBase):
    pass


class SafetyRuleOut(SafetyRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TraceRecord(BaseModel):
    record: Dict[str, Any]
    logs: List[Dict[str, Any]]
    feedbacks: List[Dict[str, Any]]
    source_chain: List[Dict[str, Any]]


class ExportRequest(BaseModel):
    export_type: str = "monthly"
    export_format: str = "xlsx"
    scope_filter: Optional[Dict[str, Any]] = None
    operator: Optional[str] = "system"


class SummaryStats(BaseModel):
    total: int = 0
    pass_count: int = 0
    fail_count: int = 0
    pending_count: int = 0
    need_confirm_count: int = 0
    gray_release_count: int = 0
    safety_warn_count: int = 0
    has_feedback_count: int = 0


class BatchFeedbackRequest(BaseModel):
    items: List[HumanFeedbackCreate]
    batch_id: Optional[str] = None
