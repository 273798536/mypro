from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from .models import (
    UserRole, SessionStatus, CorrectionType,
    LeakStatus, ReportComponentType
)


class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ManualCorrectionBase(BaseModel):
    correction_type: CorrectionType
    target_item_id: str
    target_item_name: Optional[str] = None
    original_judgment: Dict[str, Any]
    new_judgment: Dict[str, Any]
    changed_fields: List[str]
    reason: str
    impact_description: Optional[str] = None


class ManualCorrectionCreate(ManualCorrectionBase):
    session_id: int


class ManualCorrectionResponse(ManualCorrectionBase):
    id: int
    session_id: int
    operator_id: int
    operator_name: Optional[str] = None
    is_overridden: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SampleLeakAlertBase(BaseModel):
    leak_type: Optional[str] = None
    suspected_cause: Optional[str] = None
    impact_scope: Optional[Dict[str, Any]] = None
    affected_items: Optional[List[Dict[str, Any]]] = None
    affected_count: int = 0


class SampleLeakAlertResponse(SampleLeakAlertBase):
    id: int
    session_id: int
    detected_at: datetime
    status: LeakStatus
    confirmed_cause: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True


class LeakConfirmRequest(BaseModel):
    confirmed_cause: str
    status: LeakStatus = LeakStatus.CONFIRMED


class LeakResolveRequest(BaseModel):
    resolution_notes: str
    status: LeakStatus = LeakStatus.RESOLVED


class ReportComponentBase(BaseModel):
    component_type: ReportComponentType
    title: str
    summary: Optional[str] = None
    data: Dict[str, Any]
    changed_count: int = 0


class ReportComponentResponse(ReportComponentBase):
    id: int

    class Config:
        from_attributes = True


class GrayReportBase(BaseModel):
    report_name: str
    report_version: str = "1.0"
    overall_summary: Optional[str] = None


class GrayReportCreate(GrayReportBase):
    session_id: int
    components: List[ReportComponentBase]


class GrayReportResponse(GrayReportBase):
    id: int
    session_id: int
    generated_by: Optional[int] = None
    generated_at: datetime
    total_changed: int = 0
    components: List[ReportComponentResponse] = []

    class Config:
        from_attributes = True


class SessionCommentBase(BaseModel):
    content: str
    comment_type: str = "note"
    metadata: Optional[Dict[str, Any]] = None


class SessionCommentCreate(SessionCommentBase):
    session_id: int


class SessionCommentResponse(SessionCommentBase):
    id: int
    session_id: int
    author_id: int
    author_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewSessionBase(BaseModel):
    session_name: str
    description: Optional[str] = None
    batch_id: Optional[str] = None
    original_result: Optional[Dict[str, Any]] = None
    current_result: Optional[Dict[str, Any]] = None
    page_snapshot: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    assigned_to: Optional[int] = None


class ReviewSessionCreate(ReviewSessionBase):
    pass


class ReviewSessionUpdate(BaseModel):
    session_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[SessionStatus] = None
    current_result: Optional[Dict[str, Any]] = None
    page_snapshot: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    assigned_to: Optional[int] = None


class ReviewSessionResponse(ReviewSessionBase):
    id: int
    status: SessionStatus
    created_by: int
    creator_name: Optional[str] = None
    assignee_name: Optional[str] = None
    has_sample_leak: bool
    created_at: datetime
    updated_at: datetime
    last_processed_at: Optional[datetime] = None
    corrections_count: int = 0
    comments_count: int = 0
    leak_alerts_count: int = 0

    class Config:
        from_attributes = True


class ReviewSessionDetailResponse(ReviewSessionResponse):
    corrections: List[ManualCorrectionResponse] = []
    leak_alerts: List[SampleLeakAlertResponse] = []
    reports: List[GrayReportResponse] = []
    comments: List[SessionCommentResponse] = []


class OperationGuideBase(BaseModel):
    section_key: str
    title: str
    content: str
    position_hint: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class OperationGuideResponse(OperationGuideBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageSnapshotCreate(BaseModel):
    session_id: int
    snapshot_data: Dict[str, Any]
    snapshot_type: Optional[str] = None


class PageSnapshotResponse(BaseModel):
    id: int
    session_id: int
    snapshot_data: Dict[str, Any]
    snapshot_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RerunRequest(BaseModel):
    reason: str
    preserve_corrections: bool = True


class ExportRequest(BaseModel):
    format: str = "xlsx"
    include_components: List[ReportComponentType] = [
        ReportComponentType.SAMPLE_CHANGE,
        ReportComponentType.THRESHOLD_CHANGE,
        ReportComponentType.MANUAL_CORRECTION
    ]
