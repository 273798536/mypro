from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any
from enum import Enum

from app.models import UserRole, BatchStatus, DirtyRecordType


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole


class User(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AffectedStoreBase(BaseModel):
    store_name: str
    store_code: Optional[str] = None
    quantity_received: Optional[float] = None
    quantity_used: Optional[float] = None
    quantity_remaining: Optional[float] = None
    distribution_time: Optional[datetime] = None


class AffectedStoreCreate(AffectedStoreBase):
    pass


class AffectedStore(AffectedStoreBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SampleLabelBase(BaseModel):
    label_code: Optional[str] = None
    sample_time: Optional[datetime] = None
    sampler: Optional[str] = None
    sample_location: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    storage_condition: Optional[str] = None


class SampleLabelCreate(SampleLabelBase):
    idempotency_key: Optional[str] = None
    raw_data: Optional[Any] = None


class SampleLabel(SampleLabelBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TemperatureRecordBase(BaseModel):
    record_time: Optional[datetime] = None
    temperature: Optional[float] = None
    measure_point: Optional[str] = None
    recorder: Optional[str] = None
    is_abnormal: bool = False
    remark: Optional[str] = None


class TemperatureRecordCreate(TemperatureRecordBase):
    idempotency_key: Optional[str] = None
    raw_data: Optional[Any] = None


class TemperatureRecord(TemperatureRecordBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StoreComplaintBase(BaseModel):
    store_name: Optional[str] = None
    store_code: Optional[str] = None
    complaint_time: Optional[datetime] = None
    complaint_type: Optional[str] = None
    complaint_content: Optional[str] = None
    quantity: Optional[float] = None
    amount: Optional[float] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "pending"


class StoreComplaintCreate(StoreComplaintBase):
    idempotency_key: Optional[str] = None
    raw_data: Optional[Any] = None


class StoreComplaint(StoreComplaintBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SupervisorCommentBase(BaseModel):
    comment_type: Optional[str] = None
    content: str
    attachment_urls: Optional[List[str]] = None


class SupervisorCommentCreate(SupervisorCommentBase):
    pass


class SupervisorComment(SupervisorCommentBase):
    id: int
    batch_id: int
    supervisor_id: int
    created_at: datetime
    supervisor: Optional[User] = None

    class Config:
        from_attributes = True


class StatusHistoryBase(BaseModel):
    from_status: Optional[BatchStatus] = None
    to_status: BatchStatus
    change_reason: Optional[str] = None


class StatusHistory(StatusHistoryBase):
    id: int
    batch_id: int
    changed_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DirtyRecordBase(BaseModel):
    source_type: str
    source_id: Optional[str] = None
    dirty_type: DirtyRecordType
    description: str
    raw_content: Any
    processing_opinion: Optional[str] = None


class DirtyRecord(DirtyRecordBase):
    id: int
    batch_id: Optional[int] = None
    is_resolved: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_no: str
    pot_no: str
    product_name: str
    production_date: datetime


class BatchCreate(BatchBase):
    affected_stores: Optional[List[AffectedStoreCreate]] = None


class BatchUpdate(BaseModel):
    pot_no: Optional[str] = None
    product_name: Optional[str] = None
    production_date: Optional[datetime] = None


class Batch(BatchBase):
    id: int
    status: BatchStatus
    before_freeze_status: Optional[BatchStatus] = None
    freeze_reason: Optional[str] = None

    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_result: Optional[str] = None
    review_comment: Optional[str] = None

    sample_labels: List[SampleLabel] = []
    temperature_records: List[TemperatureRecord] = []
    store_complaints: List[StoreComplaint] = []
    supervisor_comments: List[SupervisorComment] = []
    status_history: List[StatusHistory] = []
    dirty_records: List[DirtyRecord] = []
    affected_stores: List[AffectedStore] = []

    class Config:
        from_attributes = True


class BatchList(BaseModel):
    id: int
    batch_no: str
    pot_no: str
    product_name: str
    production_date: datetime
    status: BatchStatus
    created_at: datetime
    sample_label_count: int = 0
    temperature_record_count: int = 0
    store_complaint_count: int = 0
    affected_store_count: int = 0

    class Config:
        from_attributes = True


class BatchReview(BaseModel):
    review_result: str
    review_comment: Optional[str] = None


class BatchFreeze(BaseModel):
    reason: str


class BatchWithdraw(BaseModel):
    reason: str


class ExportFilter(BaseModel):
    status: Optional[BatchStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    pot_no: Optional[str] = None


class DirtyRecordResolve(BaseModel):
    processing_opinion: str
