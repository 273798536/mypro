from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class SampleBase(BaseModel):
    sample_id: str
    query: str
    source: Optional[str] = "unknown"
    category: Optional[str] = "default"


class SampleCreate(SampleBase):
    pass


class Sample(SampleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlgorithmVersionBase(BaseModel):
    version: str
    description: Optional[str] = ""
    threshold_config: Optional[Dict[str, Any]] = {}
    model_info: Optional[Dict[str, Any]] = {}
    is_active: Optional[bool] = False


class AlgorithmVersionCreate(AlgorithmVersionBase):
    pass


class AlgorithmVersion(AlgorithmVersionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationRecordBase(BaseModel):
    sample_id: int
    version_id: int
    recall_results: Optional[List[Any]] = []
    score: Optional[float] = 0.0
    is_pass: Optional[bool] = False
    is_repeat_eval: Optional[bool] = False
    raw_response: Optional[Dict[str, Any]] = {}
    remark: Optional[str] = ""


class EvaluationRecordCreate(EvaluationRecordBase):
    pass


class EvaluationRecord(EvaluationRecordBase):
    id: int
    eval_time: datetime
    sample: Optional[Sample] = None
    version: Optional[AlgorithmVersion] = None

    class Config:
        from_attributes = True


class ManualCorrectionBase(BaseModel):
    sample_id: int
    version_id: Optional[int] = None
    source: str
    process_status: Optional[str] = "pending"
    correction_data: Optional[Dict[str, Any]] = {}
    correction_type: Optional[str] = "general"
    operator: Optional[str] = ""
    remark: Optional[str] = ""


class ManualCorrectionCreate(ManualCorrectionBase):
    pass


class ManualCorrectionUpdate(BaseModel):
    process_status: Optional[str] = None
    correction_data: Optional[Dict[str, Any]] = None
    operator: Optional[str] = None
    remark: Optional[str] = None


class ManualCorrection(ManualCorrectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    sample: Optional[Sample] = None

    class Config:
        from_attributes = True


class ReviewHistoryBase(BaseModel):
    sample_id: int
    action_type: str
    before_data: Optional[Dict[str, Any]] = {}
    after_data: Optional[Dict[str, Any]] = {}
    operator: Optional[str] = ""
    remark: Optional[str] = ""


class ReviewHistoryCreate(ReviewHistoryBase):
    pass


class ReviewHistory(ReviewHistoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewConclusionBase(BaseModel):
    conclusion_id: str
    version_id: int
    title: str
    summary: Optional[str] = ""
    total_samples: Optional[int] = 0
    pass_count: Optional[int] = 0
    fail_count: Optional[int] = 0
    correction_count: Optional[int] = 0
    metrics: Optional[Dict[str, Any]] = {}
    highlights: Optional[List[Any]] = []
    is_final: Optional[bool] = False
    operator: Optional[str] = ""


class ReviewConclusionCreate(ReviewConclusionBase):
    pass


class ReviewConclusion(ReviewConclusionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    version: Optional[AlgorithmVersion] = None

    class Config:
        from_attributes = True


class VersionCompareResult(BaseModel):
    version_old: AlgorithmVersion
    version_new: AlgorithmVersion
    total_samples: int
    same_count: int
    diff_count: int
    pass_increase: int
    pass_decrease: int
    threshold_diff: Dict[str, Any]
    sample_diffs: List[Dict[str, Any]]
    correction_stats: Dict[str, Any]


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
