from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import (
    BatchStatus, AnomalyCategory, ResultGrade
)


class ProcessBatchBase(BaseModel):
    batch_name: str
    remark: Optional[str] = None
    operator: Optional[str] = None


class ProcessBatchCreate(ProcessBatchBase):
    pass


class ProcessBatch(ProcessBatchBase):
    id: int
    status: BatchStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionItemBase(BaseModel):
    batch_id: int
    original_row_no: int
    question_code: str
    question_title: Optional[str] = None
    image_name: Optional[str] = None
    source_remark: Optional[str] = None
    kkt_params_json: Optional[str] = None
    difficulty: Optional[str] = None
    knowledge_point: Optional[str] = None


class QuestionItemCreate(QuestionItemBase):
    pass


class QuestionItem(QuestionItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ParamRecordBase(BaseModel):
    batch_id: int
    original_row_no: int
    question_code: str
    param_key: str
    param_value: Optional[str] = None
    source_sheet: Optional[str] = None
    source_remark: Optional[str] = None


class ParamRecordCreate(ParamRecordBase):
    pass


class ParamRecord(ParamRecordBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConflictRecordBase(BaseModel):
    batch_id: int
    question_id: Optional[int] = None
    param_record_id: Optional[int] = None
    question_code: str
    conflict_type: str
    conflict_field: Optional[str] = None
    question_value: Optional[str] = None
    param_value: Optional[str] = None
    description: str
    resolution_suggestion: Optional[str] = None


class ConflictRecordCreate(ConflictRecordBase):
    pass


class ConflictRecord(ConflictRecordBase):
    id: int
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConflictResolve(BaseModel):
    is_resolved: bool
    resolution_suggestion: Optional[str] = None


class ReviewRecordBase(BaseModel):
    batch_id: int
    question_id: int
    anomaly_category: AnomalyCategory = AnomalyCategory.NONE
    result_grade: ResultGrade = ResultGrade.PENDING
    reviewer: Optional[str] = None
    review_note: Optional[str] = None
    next_step: Optional[str] = None


class ReviewRecordCreate(ReviewRecordBase):
    pass


class ReviewRecordUpdate(BaseModel):
    anomaly_category: Optional[AnomalyCategory] = None
    result_grade: Optional[ResultGrade] = None
    reviewer: Optional[str] = None
    review_note: Optional[str] = None
    next_step: Optional[str] = None


class ReviewRecord(ReviewRecordBase):
    id: int
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    question: Optional[QuestionItem] = None

    class Config:
        from_attributes = True


class ErrorAnalysisBase(BaseModel):
    batch_id: int
    question_id: int
    kkt_violation_degree: float = 0.0
    stationarity_error: float = 0.0
    primal_feasibility_error: float = 0.0
    dual_feasibility_error: float = 0.0
    complementarity_error: float = 0.0
    overall_error: float = 0.0
    is_excessive: bool = False
    analysis_detail: Optional[str] = None


class ErrorAnalysisCreate(ErrorAnalysisBase):
    pass


class ErrorAnalysis(ErrorAnalysisBase):
    id: int
    created_at: datetime
    question: Optional[QuestionItem] = None

    class Config:
        from_attributes = True


class CounterExampleBase(BaseModel):
    question_id: int
    example_content: str
    source_reference: Optional[str] = None
    explanation: Optional[str] = None


class CounterExampleCreate(CounterExampleBase):
    pass


class CounterExample(CounterExampleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class HistorySnapshotBase(BaseModel):
    batch_id: int
    snapshot_name: str
    snapshot_type: str
    snapshot_data: str
    created_by: Optional[str] = None


class HistorySnapshotCreate(HistorySnapshotBase):
    pass


class HistorySnapshot(HistorySnapshotBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExportReportBase(BaseModel):
    batch_id: int
    report_name: str
    report_type: str
    file_path: str
    file_size: Optional[int] = None
    exported_by: Optional[str] = None


class ExportReportCreate(ExportReportBase):
    pass


class ExportReport(ExportReportBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BatchDetailResponse(BaseModel):
    batch: ProcessBatch
    questions_count: int
    param_records_count: int
    conflicts_count: int
    conflicts_unresolved_count: int
    reviews_count: int
    error_analyses_count: int
    excessive_errors_count: int


class ImportResponse(BaseModel):
    success: bool
    message: str
    batch_id: Optional[int] = None
    questions_imported: int = 0
    params_imported: int = 0


class BatchListResponse(BaseModel):
    total: int
    items: List[ProcessBatch]


class ReviewSummaryResponse(BaseModel):
    total_questions: int
    usable_count: int
    pending_count: int
    recollect_count: int
    need_material_count: int
    need_standard_count: int
    no_anomaly_count: int
