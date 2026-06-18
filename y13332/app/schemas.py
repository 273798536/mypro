from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ModelVersionBase(BaseModel):
    version_tag: str
    description: Optional[str] = None


class ModelVersionOut(ModelVersionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RevisionBatchBase(BaseModel):
    batch_name: str
    model_version_id: int
    source_file: Optional[str] = None
    remark: Optional[str] = None


class RevisionBatchOut(RevisionBatchBase):
    id: int
    created_at: datetime
    model_version: Optional[ModelVersionOut] = None
    sample_count: int = 0
    drift_count: int = 0
    confirmed_count: int = 0
    rejected_count: int = 0

    class Config:
        from_attributes = True


class SampleOut(BaseModel):
    id: int
    batch_id: int
    sample_id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    ai_predicted_attr: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_threshold: Optional[float] = None
    manual_attr_old: Optional[str] = None
    manual_attr_new: Optional[str] = None
    manual_revision_source: Optional[str] = None
    manual_process_status: Optional[str] = None
    manual_operator: Optional[str] = None
    manual_remark: Optional[str] = None
    is_threshold_drift: bool = False
    drift_reason: Optional[str] = None
    final_status: Optional[str] = None
    final_attr: Optional[str] = None
    raw_fields_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SampleUpdate(BaseModel):
    manual_attr_new: Optional[str] = None
    manual_process_status: Optional[str] = None
    manual_revision_source: Optional[str] = None
    manual_operator: Optional[str] = None
    manual_remark: Optional[str] = None
    is_threshold_drift: Optional[bool] = None
    drift_reason: Optional[str] = None
    final_status: Optional[str] = None
    final_attr: Optional[str] = None


class FilterParams(BaseModel):
    batch_id: Optional[int] = None
    final_status: Optional[str] = None
    is_threshold_drift: Optional[bool] = None
    manual_process_status: Optional[str] = None
    sample_id: Optional[str] = None
    product_id: Optional[str] = None
    keyword: Optional[str] = None


class StatisticsOut(BaseModel):
    total: int = 0
    confirmed: int = 0
    rejected: int = 0
    pending: int = 0
    drift: int = 0
    merged: int = 0
    by_source: Dict[str, int] = {}
    by_process_status: Dict[str, int] = {}


class PageSummaryOut(BaseModel):
    batch_id: int
    batch_name: str
    model_version: str
    generated_at: datetime
    statistics: StatisticsOut
    filter_condition: Dict[str, Any]
    status_text: Dict[str, str]


class CompareItem(BaseModel):
    sample_id: str
    product_name: Optional[str] = None
    left_batch: Optional[str] = None
    left_final_attr: Optional[str] = None
    left_final_status: Optional[str] = None
    right_batch: Optional[str] = None
    right_final_attr: Optional[str] = None
    right_final_status: Optional[str] = None
    diff_type: Optional[str] = None


class CompareResult(BaseModel):
    left_batch_id: int
    right_batch_id: int
    left_batch_name: str
    right_batch_name: str
    total_compared: int = 0
    same_count: int = 0
    diff_count: int = 0
    only_left_count: int = 0
    only_right_count: int = 0
    items: List[CompareItem] = []
