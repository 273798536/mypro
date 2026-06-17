from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class FeedbackBase(BaseModel):
    status: Optional[str] = "pending"
    original_source: Optional[str] = None
    original_location: Optional[str] = None
    original_content: Optional[str] = None
    original_reporter: Optional[str] = None
    original_contact: Optional[str] = None
    original_date: Optional[str] = None
    normalized_location: Optional[str] = None
    bridge_name: Optional[str] = None
    lng: Optional[float] = None
    lat: Optional[float] = None
    impact_scope: Optional[str] = None
    review_remark: Optional[str] = None
    capacity_conclusion: Optional[str] = None
    handler: Optional[str] = None
    leader_inquiry: Optional[str] = None


class FeedbackCreate(FeedbackBase):
    feedback_no: str
    original_raw_row: Optional[Any] = None


class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    original_source: Optional[str] = None
    original_location: Optional[str] = None
    original_content: Optional[str] = None
    original_reporter: Optional[str] = None
    original_contact: Optional[str] = None
    original_date: Optional[str] = None
    normalized_location: Optional[str] = None
    bridge_name: Optional[str] = None
    lng: Optional[float] = None
    lat: Optional[float] = None
    impact_scope: Optional[str] = None
    review_remark: Optional[str] = None
    capacity_conclusion: Optional[str] = None
    handler: Optional[str] = None
    leader_inquiry: Optional[str] = None
    leader_inquiry_date: Optional[datetime] = None
    operator: Optional[str] = None


class FeedbackRead(FeedbackBase):
    id: int
    feedback_no: str
    original_raw_row: Optional[Any] = None
    leader_inquiry_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    total: int
    items: List[FeedbackRead]


class MergeRelationCreate(BaseModel):
    merged_from_id: int
    merged_to_id: int
    merge_reason: Optional[str] = None
    merge_evidence: Optional[str] = None
    merged_by: Optional[str] = None


class MergeRelationRead(BaseModel):
    id: int
    merged_from_id: int
    merged_to_id: int
    from_feedback_no: Optional[str] = None
    to_feedback_no: Optional[str] = None
    merge_reason: Optional[str] = None
    merge_evidence: Optional[str] = None
    merged_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EvidenceBase(BaseModel):
    evidence_type: Optional[str] = None
    evidence_desc: Optional[str] = None
    file_name: Optional[str] = None


class EvidenceCreate(EvidenceBase):
    feedback_id: int
    uploaded_by: Optional[str] = None


class EvidenceRead(EvidenceBase):
    id: int
    feedback_id: int
    uploaded_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OperationLogRead(BaseModel):
    id: int
    feedback_id: int
    operator: Optional[str] = None
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total: int
    pending: int
    reviewing: int
    need_evidence: int
    approved: int
    merged: int
    closed: int


class StatusTransition(BaseModel):
    target_status: str
    operator: Optional[str] = None
    remark: Optional[str] = None
