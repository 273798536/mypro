from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class _BaseSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class EvaluationRunBase(_BaseSchema):
    model_version: str
    evaluator: str
    notes: Optional[str] = ""


class EvaluationRunCreate(EvaluationRunBase):
    pass


class ManualJudgmentBase(_BaseSchema):
    record_id: int
    judge_type: str
    before_value: Optional[Dict[str, Any]] = {}
    after_value: Optional[Dict[str, Any]] = {}
    reason: str
    judge_name: str


class ManualJudgmentCreate(ManualJudgmentBase):
    pass


class ManualJudgment(ManualJudgmentBase):
    id: int
    created_at: datetime


class AnomalyRecordBase(_BaseSchema):
    record_id: int
    anomaly_type: str
    original_description: str
    status: Optional[str] = "open"
    handler: Optional[str] = ""
    notes: Optional[str] = ""


class AnomalyRecordCreate(AnomalyRecordBase):
    pass


class AnomalyRecord(AnomalyRecordBase):
    id: int
    created_at: datetime


class EvaluationRecordBase(_BaseSchema):
    query_id: str
    query_text: Optional[str] = ""
    expected_docs: Optional[List[Any]] = []
    recalled_docs: Optional[List[Any]] = []
    metrics: Optional[Dict[str, Any]] = {}
    original_fields: Optional[Dict[str, Any]] = {}
    anomaly_flag: Optional[str] = ""
    anomaly_desc: Optional[str] = ""


class EvaluationRecord(EvaluationRecordBase):
    id: int
    run_id: int
    is_archived: bool
    created_at: datetime
    judgments: List[ManualJudgment] = []
    anomalies: List[AnomalyRecord] = []


class EvaluationRun(EvaluationRunBase):
    id: int
    source_file: str
    original_filename: str
    status: str
    created_at: datetime
    record_count: Optional[int] = 0


class FieldMappingBase(_BaseSchema):
    source_field: str
    standard_field: str
    run_id: Optional[int] = None
    is_global: Optional[bool] = False


class FieldMappingCreate(FieldMappingBase):
    pass


class FieldMapping(FieldMappingBase):
    id: int
    created_at: datetime


class ImportResult(_BaseSchema):
    run_id: int
    record_count: int
    warnings: List[str] = []
    auto_mapped_fields: List[Dict[str, str]] = []


class ComparisonResult(_BaseSchema):
    run_a_id: int
    run_b_id: int
    model_a: str
    model_b: str
    total_queries: int
    common_queries: int
    only_in_a: int
    only_in_b: int
    metric_diffs: List[Dict[str, Any]] = []
    query_diffs: List[Dict[str, Any]] = []


class DashboardStats(_BaseSchema):
    total_runs: int
    total_records: int
    total_judgments: int
    open_anomalies: int
    model_versions: List[str]
    recent_runs: List[EvaluationRun]
