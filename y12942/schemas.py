from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import BatchStatus, ProcessingStatus, ReviewResult


class QuestionImportItem(BaseModel):
    question_external_id: Optional[str] = None
    prompt: str
    expected_code: Optional[str] = None
    question_category: Optional[str] = None
    difficulty_level: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class BatchImportRequest(BaseModel):
    batch_code: str
    prompt_version: str
    description: Optional[str] = None
    created_by: Optional[str] = None
    import_note: Optional[str] = None
    questions: List[QuestionImportItem]


class BatchResponse(BaseModel):
    id: int
    batch_code: str
    prompt_version: str
    run_number: int
    status: BatchStatus
    description: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    import_note: Optional[str]
    question_count: int

    class Config:
        from_attributes = True


class BatchDetailResponse(BatchResponse):
    questions: List["QuestionResponse"]


class QuestionResponse(BaseModel):
    id: int
    batch_id: int
    question_external_id: Optional[str]
    prompt: str
    expected_code: Optional[str]
    question_category: Optional[str]
    difficulty_level: Optional[str]
    tags: Optional[List[str]]

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    status: BatchStatus
    note: Optional[str] = None


class ProcessingRecordUpdate(BaseModel):
    status: ProcessingStatus
    predicted_code: Optional[str] = None
    execution_result: Optional[str] = None
    error_message: Optional[str] = None
    quality_score: Optional[int] = None
    metrics: Optional[Dict[str, Any]] = None
    processing_note: Optional[str] = None


class ProcessingRecordResponse(BaseModel):
    id: int
    batch_id: int
    question_id: int
    run_number: int
    status: ProcessingStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    predicted_code: Optional[str]
    execution_result: Optional[str]
    error_message: Optional[str]
    quality_score: Optional[int]
    metrics: Optional[Dict[str, Any]]
    processing_note: Optional[str]
    question: Optional[QuestionResponse]
    review_record: Optional["ReviewRecordResponse"]

    class Config:
        from_attributes = True


class ReviewSubmitRequest(BaseModel):
    reviewer: Optional[str] = None
    review_result: ReviewResult
    review_comment: Optional[str] = None
    annotation_record: Optional[Dict[str, Any]] = None
    manual_feedback: Optional[Dict[str, Any]] = None
    tag_conflicts: Optional[List[Dict[str, Any]]] = None


class ReviewRecordResponse(BaseModel):
    id: int
    processing_record_id: int
    reviewer: Optional[str]
    reviewed_at: Optional[datetime]
    review_result: Optional[ReviewResult]
    review_comment: Optional[str]
    annotation_record: Optional[Dict[str, Any]]
    manual_feedback: Optional[Dict[str, Any]]
    tag_conflicts: Optional[List[Dict[str, Any]]]

    class Config:
        from_attributes = True


class AnomalyRecordRequest(BaseModel):
    anomaly_type: str
    description: str
    handling_opinion: Optional[str] = None


class AnomalyRecordResponse(BaseModel):
    id: int
    processing_record_id: int
    anomaly_type: str
    description: str
    detected_at: datetime
    handling_opinion: Optional[str]
    resolved_at: Optional[datetime]
    is_resolved: bool

    class Config:
        from_attributes = True


class AnomalyTraceResponse(BaseModel):
    anomaly: AnomalyRecordResponse
    processing_record: ProcessingRecordResponse
    question: QuestionResponse
    batch: BatchResponse
    review_record: Optional[ReviewRecordResponse]


class BatchListResponse(BaseModel):
    total: int
    items: List[BatchResponse]


class ProcessingRecordListResponse(BaseModel):
    total: int
    items: List[ProcessingRecordResponse]


BatchDetailResponse.model_rebuild()
ProcessingRecordResponse.model_rebuild()
