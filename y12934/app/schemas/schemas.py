from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import QuestionStatus, IssueType, CopyrightType


class CopyrightSourceBase(BaseModel):
    copyright_type: CopyrightType = CopyrightType.UNKNOWN
    source_title: Optional[str] = None
    source_author: Optional[str] = None
    source_publisher: Optional[str] = None
    source_url: Optional[str] = None
    publication_date: Optional[str] = None
    authorization_number: Optional[str] = None
    authorization_expiry: Optional[str] = None
    fair_use_justification: Optional[str] = None
    remark: Optional[str] = None


class CopyrightSourceCreate(CopyrightSourceBase):
    pass


class CopyrightSource(CopyrightSourceBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True


class ReviewRecordBase(BaseModel):
    reviewer: Optional[str] = None
    issue_type: Optional[IssueType] = None
    issue_detail: Optional[str] = None
    next_action: Optional[str] = None
    passed: bool = False


class ReviewRecordCreate(ReviewRecordBase):
    pass


class ReviewRecord(ReviewRecordBase):
    id: int
    question_id: int
    review_time: datetime
    human_note_preserved: Optional[str] = None

    class Config:
        from_attributes = True


class StatusHistoryBase(BaseModel):
    from_status: Optional[QuestionStatus] = None
    to_status: QuestionStatus
    operator: Optional[str] = None
    reason: Optional[str] = None


class StatusHistoryCreate(StatusHistoryBase):
    pass


class StatusHistory(StatusHistoryBase):
    id: int
    batch_id: Optional[int] = None
    question_id: Optional[int] = None
    operate_time: datetime

    class Config:
        from_attributes = True


class PromptVersionBase(BaseModel):
    version_code: str
    version_name: Optional[str] = None
    prompt_content: str
    creator: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = False


class PromptVersionCreate(PromptVersionBase):
    pass


class PromptVersion(PromptVersionBase):
    id: int
    create_time: datetime

    class Config:
        from_attributes = True


class PromptVersionTrackBase(BaseModel):
    prompt_version_id: int
    operator: Optional[str] = None
    remark: Optional[str] = None


class PromptVersionTrackCreate(PromptVersionTrackBase):
    batch_id: Optional[int] = None
    question_id: Optional[int] = None


class PromptVersionTrack(PromptVersionTrackBase):
    id: int
    batch_id: Optional[int] = None
    question_id: Optional[int] = None
    bind_time: datetime
    prompt_version: Optional[PromptVersion] = None

    class Config:
        from_attributes = True


class EvaluationQuestionBase(BaseModel):
    question_id_external: Optional[str] = None
    question_content: str
    standard_answer: Optional[str] = None
    difficulty: Optional[str] = None
    knowledge_point: Optional[str] = None
    human_note: Optional[str] = None
    sort_order: int = 0


class EvaluationQuestionCreate(EvaluationQuestionBase):
    copyright_sources: List[CopyrightSourceCreate] = []


class EvaluationQuestionUpdate(BaseModel):
    question_content: Optional[str] = None
    standard_answer: Optional[str] = None
    difficulty: Optional[str] = None
    knowledge_point: Optional[str] = None
    human_note: Optional[str] = None
    current_status: Optional[QuestionStatus] = None


class EvaluationQuestion(EvaluationQuestionBase):
    id: int
    batch_id: int
    current_status: QuestionStatus
    copyright_sources: List[CopyrightSource] = []
    review_records: List[ReviewRecord] = []
    status_history: List[StatusHistory] = []
    prompt_version_tracks: List[PromptVersionTrack] = []

    class Config:
        from_attributes = True


class EvaluationBatchBase(BaseModel):
    batch_name: str
    importer: Optional[str] = None
    description: Optional[str] = None
    subject_category: Optional[str] = None


class EvaluationBatchCreate(EvaluationBatchBase):
    questions: List[EvaluationQuestionCreate] = []


class EvaluationBatch(EvaluationBatchBase):
    id: int
    import_time: datetime
    total_questions: int = 0
    current_status: QuestionStatus
    rejection_reason: Optional[str] = None
    questions: List[EvaluationQuestion] = []
    status_history: List[StatusHistory] = []
    prompt_version_tracks: List[PromptVersionTrack] = []

    class Config:
        from_attributes = True


class BatchListItem(BaseModel):
    id: int
    batch_name: str
    import_time: datetime
    importer: Optional[str] = None
    subject_category: Optional[str] = None
    total_questions: int
    current_status: QuestionStatus

    class Config:
        from_attributes = True


class BatchReviewIssueSummary(BaseModel):
    material_missing_count: int = 0
    calibration_wrong_count: int = 0
    total_blocked: int = 0
    total_passed: int = 0
    total_pending: int = 0


class ReviewSubmitItem(BaseModel):
    question_id: int
    passed: bool
    issue_type: Optional[IssueType] = None
    issue_detail: Optional[str] = None
    next_action: Optional[str] = None


class BatchReviewSubmit(BaseModel):
    reviewer: str
    items: List[ReviewSubmitItem]


class StatusTransitionRequest(BaseModel):
    target_status: QuestionStatus
    operator: str
    reason: Optional[str] = None


class PromptVersionBindRequest(BaseModel):
    prompt_version_id: int
    operator: str
    remark: Optional[str] = None
    question_ids: Optional[List[int]] = None


class IssueBreakdown(BaseModel):
    issue_type: IssueType
    issue_type_label: str
    count: int
    question_ids: List[int]
    details: List[dict]


class ExportReportResponse(BaseModel):
    batch_id: int
    batch_name: str
    export_time: datetime
    plain_explanation: str
    status_summary: dict
    issue_breakdown: List[IssueBreakdown]
    bias_check_result: Optional[dict] = None
    rejection_explanation: Optional[str] = None
    full_data: dict
