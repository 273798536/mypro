from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class QuestionInput(BaseModel):
    question_id: str
    title: Optional[str] = None
    content: Optional[str] = None
    quantile: float = 0.95
    var_level: Optional[float] = None
    window: int = 252
    params: Optional[Dict[str, Any]] = None


class QuestionListInput(BaseModel):
    batch_id: str
    name: Optional[str] = None
    version: Optional[str] = None
    questions: List[QuestionInput]
    meta: Optional[Dict[str, Any]] = None


class BacktestQuestionData(BaseModel):
    question_id: str
    returns: List[float]
    historical_var_value: Optional[float] = None
    historical_var_source: Optional[str] = None


class BacktestRunInput(BaseModel):
    batch_id: str
    question_list_batch_id: Optional[str] = None
    question_data: List[BacktestQuestionData]
    triggered_by: Optional[str] = "api"
    notes: Optional[str] = None


class VarResultResponse(BaseModel):
    id: int
    question_external_id: str
    var_value: Optional[float]
    var_lower: Optional[float]
    var_upper: Optional[float]
    historical_var_value: Optional[float]
    is_extrapolation: bool
    extrapolation_bounds_breached: bool
    answer_match: Optional[bool]
    chart_generated: bool
    chart_path: Optional[str]
    chart_verified: bool
    anomalies: List[Dict] = []


class ValidationResponse(BaseModel):
    rule_code: str
    rule_name: str
    passed: bool
    detail: str
    severity: str
    action_required: str
    anomaly_title: Optional[str] = None


class AnomalyResponse(BaseModel):
    id: int
    question_external_id: Optional[str]
    anomaly_type: str
    severity: str
    action_required: str
    title: str
    detail: str
    resolution_status: str


class ImpactNotificationResponse(BaseModel):
    question_external_id: str
    impact_type: str
    description: str
    needs_rerun: bool
    old_result_summary: Optional[Dict] = None


class ReportSummary(BaseModel):
    total_questions: int
    passed: int
    extrapolation_count: int
    extrapolation_breached: int
    answer_mismatch: int
    chart_missing: int
