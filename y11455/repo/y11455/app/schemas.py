from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.enums import (
    ExceptionType,
    ReviewChannel,
    ReceiptStatus,
    FreezeReason,
    AttachmentType,
    OperationType,
    DataSource
)


class BatchBase(BaseModel):
    batch_no: str = Field(..., description="批次号(幂等键)")
    source_file: str = Field(..., description="来源文件名")
    data_source: DataSource = Field(..., description="数据来源")
    operator: str = Field(..., description="操作人")
    remark: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    remark: Optional[str] = None


class BatchResponse(BatchBase):
    id: int
    total_count: int
    success_count: int
    fail_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class BatchImportResult(BaseModel):
    batch_no: str
    total_count: int
    success_count: int
    fail_count: int
    failed_rows: List[Dict[str, Any]] = Field(default_factory=list, description="失败行详情")
    is_duplicate_batch: bool = Field(..., description="是否重复批次")


class LeaderRefundRawImport(BaseModel):
    order_no: str
    leader_id: str
    leader_name: str
    city: str
    refund_amount: float
    refund_reason: str
    exception_type: Optional[ExceptionType] = None
    refund_time: Optional[datetime] = None


class WarehouseReviewRawImport(BaseModel):
    order_no: str
    reviewer: str
    review_result: str
    review_channel: Optional[ReviewChannel] = None
    review_remark: Optional[str] = None
    review_time: Optional[datetime] = None
    compensate_amount: Optional[float] = 0
    responsibility: Optional[str] = None


class ExceptionReceiptBase(BaseModel):
    order_no: str
    city: Optional[str] = None
    leader_id: Optional[str] = None
    leader_name: Optional[str] = None
    exception_type: ExceptionType
    refund_amount: float = 0
    compensate_amount: float = 0
    responsibility: Optional[str] = None


class ExceptionReceiptCreate(ExceptionReceiptBase):
    operator: str


class ExceptionReceiptResponse(BaseModel):
    id: int
    receipt_no: str
    order_no: str
    city: Optional[str]
    leader_id: Optional[str]
    leader_name: Optional[str]
    exception_type: ExceptionType
    current_status: ReceiptStatus
    review_channel: Optional[ReviewChannel]
    refund_amount: float
    compensate_amount: float
    amount_diff: float
    responsibility: Optional[str]
    latest_review_remark: Optional[str]
    manual_review_reason: Optional[str]
    is_manually_overruled: bool
    is_frozen: bool
    status_before_freeze: Optional[ReceiptStatus]
    freeze_reason: Optional[FreezeReason]
    operator: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    frozen_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExceptionReceiptDetail(ExceptionReceiptResponse):
    attachments: List["AttachmentResponse"] = Field(default_factory=list)
    status_histories: List["StatusHistoryResponse"] = Field(default_factory=list)
    overrule_histories: List["OverruleHistoryResponse"] = Field(default_factory=list)
    freeze_records: List["FreezeRecordResponse"] = Field(default_factory=list)
    user_remarks: List["UserRemarkResponse"] = Field(default_factory=list)


class StatusHistoryResponse(BaseModel):
    id: int
    from_status: Optional[ReceiptStatus]
    to_status: ReceiptStatus
    change_reason: Optional[str]
    operator: str
    operation_type: OperationType
    created_at: datetime

    class Config:
        from_attributes = True


class OverruleHistoryResponse(BaseModel):
    id: int
    original_status: ReceiptStatus
    new_status: ReceiptStatus
    original_compensate_amount: Optional[float]
    new_compensate_amount: Optional[float]
    original_responsibility: Optional[str]
    new_responsibility: Optional[str]
    overrule_reason: str
    overrule_channel: ReviewChannel
    operator: str
    created_at: datetime

    class Config:
        from_attributes = True


class FreezeRecordResponse(BaseModel):
    id: int
    freeze_reason: FreezeReason
    status_before_freeze: ReceiptStatus
    is_unfrozen: bool
    unfreeze_reason: Optional[str]
    freeze_operator: str
    unfreeze_operator: Optional[str]
    frozen_at: datetime
    unfrozen_at: Optional[datetime]

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: int
    attachment_type: AttachmentType
    file_name: str
    file_size: Optional[int]
    uploader: str
    remark: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    receipt_ids: List[int] = Field(..., description="回执ID列表")
    review_result: ReceiptStatus = Field(..., description="复核结果")
    review_remark: Optional[str] = None
    compensate_amount: Optional[float] = None
    responsibility: Optional[str] = None
    operator: str = Field(..., description="操作人")
    review_channel: ReviewChannel = ReviewChannel.MANUAL_REVIEW


class OverruleRequest(BaseModel):
    receipt_id: int = Field(..., description="回执ID")
    new_status: ReceiptStatus = Field(..., description="新状态")
    overrule_reason: str = Field(..., description="改判理由")
    new_compensate_amount: Optional[float] = None
    new_responsibility: Optional[str] = None
    operator: str = Field(..., description="操作人")


class FreezeRequest(BaseModel):
    receipt_ids: List[int] = Field(..., description="回执ID列表")
    freeze_reason: FreezeReason = Field(..., description="冻结原因")
    operator: str = Field(..., description="操作人")


class UnfreezeRequest(BaseModel):
    receipt_ids: List[int] = Field(..., description="回执ID列表")
    unfreeze_reason: str = Field(..., description="解冻原因")
    operator: str = Field(..., description="操作人")


class CancelRequest(BaseModel):
    receipt_ids: List[int] = Field(..., description="回执ID列表")
    cancel_reason: str = Field(..., description="撤回原因")
    operator: str = Field(..., description="操作人")


class ArchiveRequest(BaseModel):
    receipt_ids: List[int] = Field(..., description="回执ID列表")
    archive_remark: Optional[str] = None
    operator: str = Field(..., description="操作人")


class AttachmentUploadResponse(BaseModel):
    id: int
    attachment_type: AttachmentType
    file_name: str
    file_path: str
    file_size: Optional[int]
    uploader: str
    remark: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CitySummaryItem(BaseModel):
    city: str
    total_count: int
    pending_count: int
    approved_count: int
    rejected_count: int
    frozen_count: int
    total_refund_amount: float
    total_compensate_amount: float
    total_amount_diff: float
    manually_overruled_count: int


class ExportSummaryItem(BaseModel):
    receipt_no: str
    order_no: str
    city: str
    leader_name: str
    exception_type: str
    current_status: str
    status_before_freeze: Optional[str]
    is_frozen: bool
    is_manually_overruled: bool
    manual_review_reason: Optional[str]
    refund_amount: float
    compensate_amount: float
    amount_diff: float
    responsibility: Optional[str]
    latest_review_remark: Optional[str]
    user_remarks: List[str] = Field(default_factory=list, description="用户备注列表")
    reviewed_at: Optional[datetime]
    created_at: datetime


class UserRemarkCreate(BaseModel):
    order_no: str
    remark_content: str
    remarker: str


class UserRemarkResponse(BaseModel):
    id: int
    order_no: str
    remark_content: str
    remarker: str
    remark_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True


ExceptionReceiptDetail.model_rebuild()
AttachmentResponse.model_rebuild()
StatusHistoryResponse.model_rebuild()
OverruleHistoryResponse.model_rebuild()
FreezeRecordResponse.model_rebuild()
UserRemarkResponse.model_rebuild()
