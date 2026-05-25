from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class DuplicateStrategy(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class BatchStatus(str, Enum):
    PROCESSING = "processing"
    PARTIAL_SUCCESS = "partial_success"
    SUCCESS = "success"
    FAILED = "failed"


class AppointmentBase(BaseModel):
    appointment_no: str
    order_no: Optional[str] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    address: Optional[str] = None
    appliance_type: Optional[str] = None
    appliance_model: Optional[str] = None
    service_type: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    actual_time: Optional[datetime] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    status: str = "scheduled"
    is_rescheduled: bool = False
    original_appointment_no: Optional[str] = None
    is_second_visit: bool = False
    parent_appointment_no: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class AppointmentCreate(AppointmentBase):
    pass


class Appointment(AppointmentBase):
    id: int
    batch_id: Optional[int] = None
    is_withdrawn: bool = False
    withdrawn_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TechnicianLocationBase(BaseModel):
    appointment_no: str
    technician_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_time: Optional[datetime] = None
    location_type: Optional[str] = None
    accuracy: Optional[float] = None


class TechnicianLocationCreate(TechnicianLocationBase):
    pass


class TechnicianLocation(TechnicianLocationBase):
    id: int
    batch_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserReviewBase(BaseModel):
    appointment_no: str
    review_no: str
    rating: Optional[int] = None
    is_negative: bool = False
    negative_reason: Optional[str] = None
    negative_reason_detail: Optional[str] = None
    review_content: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewer_phone: Optional[str] = None
    review_time: Optional[datetime] = None


class UserReviewCreate(UserReviewBase):
    pass


class UserReview(UserReviewBase):
    id: int
    batch_id: Optional[int] = None
    manually_adjusted: bool = False
    adjusted_by: Optional[str] = None
    adjusted_at: Optional[datetime] = None
    adjustment_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AbnormalPhotoBase(BaseModel):
    appointment_no: str
    photo_no: str
    photo_type: Optional[str] = None
    photo_url: Optional[str] = None
    upload_time: Optional[datetime] = None
    uploader: Optional[str] = None
    description: Optional[str] = None
    is_abnormal: bool = True


class AbnormalPhotoCreate(AbnormalPhotoBase):
    pass


class AbnormalPhoto(AbnormalPhotoBase):
    id: int
    batch_id: Optional[int] = None
    photo_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceRemarkBase(BaseModel):
    appointment_no: str
    operator: str
    remark_type: Optional[str] = None
    content: str


class ServiceRemarkCreate(ServiceRemarkBase):
    pass


class ServiceRemark(ServiceRemarkBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BatchDataSubmit(BaseModel):
    batch_no: str
    source: str
    operator: str
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE
    remark: Optional[str] = None
    appointments: List[AppointmentCreate] = Field(default_factory=list)
    locations: List[TechnicianLocationCreate] = Field(default_factory=list)
    reviews: List[UserReviewCreate] = Field(default_factory=list)
    photos: List[AbnormalPhotoCreate] = Field(default_factory=list)


class BatchSubmitResponse(BaseModel):
    batch_no: str
    status: str
    total_count: int
    success_count: int
    fail_count: int
    failed_items: List[Dict[str, Any]] = Field(default_factory=list)
    duplicate_strategy: str
    ignored_count: int
    overwritten_count: int
    appended_count: int


class ComplaintBase(BaseModel):
    complaint_no: str
    appointment_no: str
    review_id: Optional[int] = None
    complaint_type: Optional[str] = None
    complaint_reason: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class Complaint(ComplaintBase):
    id: int
    status: str
    merged_from: Optional[List[str]] = None
    merge_evidence: Optional[Dict[str, Any]] = None
    is_merged: bool = False
    handled_by: Optional[str] = None
    handled_at: Optional[datetime] = None
    handle_result: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ComplaintMergeRequest(BaseModel):
    target_complaint_no: str
    source_complaint_nos: List[str]
    operator: str
    merge_reason: str


class AuditLogQuery(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    operator: Optional[str] = None
    operation_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class AuditLogResponse(BaseModel):
    id: int
    operation_type: str
    entity_type: str
    entity_id: str
    operator: str
    operation_time: datetime
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class ExportRequest(BaseModel):
    task_type: str
    operator: str
    filters: Optional[Dict[str, Any]] = None
    freeze_before_export: bool = False


class ExportResponse(BaseModel):
    task_no: str
    status: str
    file_name: Optional[str] = None
    record_count: int
    is_frozen: bool
    created_at: datetime
    filters_applied: Optional[Dict[str, Any]] = None


class ReconciliationRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    operator: str


class ReconciliationResult(BaseModel):
    total_appointments: int
    total_reviews: int
    total_photos: int
    total_complaints: int
    merged_complaints: int
    unmerged_complaints: int
    negative_reviews_with_evidence: int
    negative_reviews_without_evidence: int
    issues: List[Dict[str, Any]] = Field(default_factory=list)


class ManualAdjustmentRequest(BaseModel):
    review_no: str
    operator: str
    is_negative: Optional[bool] = None
    negative_reason: Optional[str] = None
    adjustment_reason: str
