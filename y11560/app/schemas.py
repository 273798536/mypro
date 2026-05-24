from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from .models import UserRole, BatchStatus, DirtyRecordType, RecordType


class UserBase(BaseModel):
    username: str
    role: UserRole


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CheckinRecordBase(BaseModel):
    record_no: str
    guest_name: Optional[str] = None
    id_card: Optional[str] = None
    room_no: Optional[str] = None
    room_type: Optional[str] = None
    checkin_time: Optional[datetime] = None
    checkout_time: Optional[datetime] = None
    planned_checkout: Optional[datetime] = None
    room_rate: float = 0
    actual_room_fee: float = 0
    invoice_amount: float = 0
    is_extended: bool = False
    original_checkout: Optional[datetime] = None
    source: Optional[str] = None
    raw_data: Optional[str] = None


class CheckinRecordCreate(CheckinRecordBase):
    pass


class CheckinRecord(CheckinRecordBase):
    id: int
    batch_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepositRecordBase(BaseModel):
    record_no: str
    checkin_record_no: Optional[str] = None
    guest_name: Optional[str] = None
    room_no: Optional[str] = None
    deposit_amount: float = 0
    deposit_method: Optional[str] = None
    deposit_time: Optional[datetime] = None
    refund_amount: float = 0
    refund_time: Optional[datetime] = None
    balance: float = 0
    source: Optional[str] = None
    raw_data: Optional[str] = None


class DepositRecordCreate(DepositRecordBase):
    pass


class DepositRecord(DepositRecordBase):
    id: int
    batch_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoomChangeRecordBase(BaseModel):
    record_no: str
    checkin_record_no: Optional[str] = None
    guest_name: Optional[str] = None
    old_room_no: Optional[str] = None
    new_room_no: Optional[str] = None
    old_room_type: Optional[str] = None
    new_room_type: Optional[str] = None
    change_time: Optional[datetime] = None
    old_room_rate: float = 0
    new_room_rate: float = 0
    rate_difference: float = 0
    reason: Optional[str] = None
    operator: Optional[str] = None
    source: Optional[str] = None
    raw_data: Optional[str] = None


class RoomChangeRecordCreate(RoomChangeRecordBase):
    pass


class RoomChangeRecord(RoomChangeRecordBase):
    id: int
    batch_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupervisorCommentBase(BaseModel):
    comment: str
    comment_type: str


class SupervisorCommentCreate(SupervisorCommentBase):
    pass


class SupervisorComment(SupervisorCommentBase):
    id: int
    batch_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class DirtyRecordBase(BaseModel):
    record_type: RecordType
    record_id: int
    dirty_type: DirtyRecordType
    description: str
    field_name: Optional[str] = None
    original_value: Optional[str] = None
    corrected_value: Optional[str] = None


class DirtyRecordCreate(DirtyRecordBase):
    pass


class DirtyRecordResolve(BaseModel):
    corrected_value: Optional[str] = None
    resolution_note: str


class DirtyRecord(DirtyRecordBase):
    id: int
    batch_id: int
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StateTransitionBase(BaseModel):
    from_status: BatchStatus
    to_status: BatchStatus
    reason: Optional[str] = None


class StateTransition(StateTransitionBase):
    id: int
    batch_id: int
    transition_by: int
    transition_at: datetime
    snapshot_before: Optional[str] = None
    snapshot_after: Optional[str] = None

    class Config:
        from_attributes = True


class BatchCreate(BaseModel):
    batch_no: str
    audit_date: datetime


class BatchUpdateStatus(BaseModel):
    reason: Optional[str] = None


class BatchSummary(BaseModel):
    id: int
    batch_no: str
    audit_date: datetime
    status: BatchStatus
    created_at: datetime
    checkin_count: int
    deposit_count: int
    room_change_count: int
    dirty_record_count: int
    unresolved_dirty_count: int

    class Config:
        from_attributes = True


class BatchDetail(BaseModel):
    id: int
    batch_no: str
    audit_date: datetime
    status: BatchStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[int] = None
    freeze_reason: Optional[str] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[int] = None
    checkins: List[CheckinRecord] = []
    deposits: List[DepositRecord] = []
    room_changes: List[RoomChangeRecord] = []
    comments: List[SupervisorComment] = []
    dirty_records: List[DirtyRecord] = []
    state_transitions: List[StateTransition] = []

    class Config:
        from_attributes = True


class BatchRecordsCreate(BaseModel):
    checkins: List[CheckinRecordCreate] = []
    deposits: List[DepositRecordCreate] = []
    room_changes: List[RoomChangeRecordCreate] = []


class DiffItem(BaseModel):
    field: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


class StateTransitionDiff(BaseModel):
    transition_id: int
    from_status: BatchStatus
    to_status: BatchStatus
    changes: List[DiffItem]


class FinancialSummary(BaseModel):
    batch_no: str
    audit_date: datetime
    status_before_freeze: Optional[BatchStatus] = None
    status_after_freeze: Optional[BatchStatus] = None
    total_room_fee: float
    total_deposit: float
    total_invoice: float
    discrepancy_amount: float
    manual_reason: Optional[str] = None
    dirty_record_summary: Dict[str, int]


class ExportRequest(BaseModel):
    batch_ids: List[int]
    include_dirty_records: bool = True
    include_state_transitions: bool = True
