from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.enums import (
    ExceptionType,
    ReviewChannel,
    ReceiptStatus,
    FreezeReason,
    AttachmentType,
    OperationType,
    DataSource
)


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(64), unique=True, index=True, nullable=False, comment="批次号(幂等键)")
    source_file = Column(String(255), nullable=False, comment="来源文件名")
    data_source = Column(Enum(DataSource), nullable=False, comment="数据来源")
    total_count = Column(Integer, default=0, comment="总记录数")
    success_count = Column(Integer, default=0, comment="成功数")
    fail_count = Column(Integer, default=0, comment="失败数")
    operator = Column(String(64), nullable=False, comment="操作人")
    remark = Column(Text, nullable=True, comment="备注")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    leader_refunds = relationship("LeaderRefundRaw", back_populates="batch", cascade="all, delete-orphan")
    warehouse_reviews = relationship("WarehouseReviewRaw", back_populates="batch", cascade="all, delete-orphan")


class LeaderRefundRaw(Base):
    __tablename__ = "leader_refund_raw"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    original_row_no = Column(Integer, nullable=False, comment="原始行号")
    original_data = Column(Text, nullable=False, comment="原始数据JSON")
    
    order_no = Column(String(64), index=True, comment="解析后-订单号")
    leader_id = Column(String(64), index=True, comment="解析后-团长ID")
    leader_name = Column(String(128), comment="解析后-团长名称")
    city = Column(String(64), index=True, comment="解析后-城市")
    refund_amount = Column(Float, comment="解析后-退款金额")
    refund_reason = Column(String(255), comment="解析后-退款原因")
    exception_type = Column(Enum(ExceptionType), comment="解析后-异常类型")
    refund_time = Column(DateTime, comment="解析后-退款时间")
    
    parse_success = Column(Boolean, default=True, comment="解析是否成功")
    parse_error = Column(Text, nullable=True, comment="解析错误信息")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="leader_refunds")


class WarehouseReviewRaw(Base):
    __tablename__ = "warehouse_review_raw"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    original_row_no = Column(Integer, nullable=False, comment="原始行号")
    original_data = Column(Text, nullable=False, comment="原始数据JSON")
    
    order_no = Column(String(64), index=True, comment="解析后-订单号")
    reviewer = Column(String(64), comment="解析后-复核人")
    review_result = Column(String(64), comment="解析后-复核结果")
    review_channel = Column(Enum(ReviewChannel), comment="解析后-复核渠道")
    review_remark = Column(Text, comment="解析后-复核备注")
    review_time = Column(DateTime, comment="解析后-复核时间")
    compensate_amount = Column(Float, comment="解析后-补偿金额")
    responsibility = Column(String(128), comment="解析后-责任方")
    
    parse_success = Column(Boolean, default=True, comment="解析是否成功")
    parse_error = Column(Text, nullable=True, comment="解析错误信息")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="warehouse_reviews")


class UserRemark(Base):
    __tablename__ = "user_remarks"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    order_no = Column(String(64), index=True, nullable=False, comment="订单号")
    remark_content = Column(Text, nullable=False, comment="备注内容")
    remarker = Column(String(64), nullable=False, comment="备注人")
    remark_time = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExceptionReceipt(Base):
    __tablename__ = "exception_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(64), unique=True, index=True, nullable=False, comment="回执单号")
    order_no = Column(String(64), index=True, nullable=False, comment="订单号")
    city = Column(String(64), index=True, comment="城市")
    leader_id = Column(String(64), index=True, comment="团长ID")
    leader_name = Column(String(128), comment="团长名称")
    
    exception_type = Column(Enum(ExceptionType), nullable=False, comment="异常类型")
    current_status = Column(Enum(ReceiptStatus), default=ReceiptStatus.PENDING, comment="当前状态")
    review_channel = Column(Enum(ReviewChannel), comment="复核渠道")
    
    refund_amount = Column(Float, default=0, comment="退款金额")
    compensate_amount = Column(Float, default=0, comment="补偿金额")
    amount_diff = Column(Float, default=0, comment="金额差异")
    responsibility = Column(String(128), comment="责任方")
    
    original_leader_refund_id = Column(Integer, ForeignKey("leader_refund_raw.id"), nullable=True)
    original_warehouse_review_id = Column(Integer, ForeignKey("warehouse_review_raw.id"), nullable=True)
    
    latest_review_remark = Column(Text, comment="最新复核备注")
    manual_review_reason = Column(Text, comment="人工改判理由")
    freeze_reason = Column(Enum(FreezeReason), nullable=True, comment="冻结原因")
    
    is_manually_overruled = Column(Boolean, default=False, comment="是否人工改判")
    is_frozen = Column(Boolean, default=False, comment="是否冻结")
    status_before_freeze = Column(Enum(ReceiptStatus), nullable=True, comment="冻结前状态")
    
    operator = Column(String(64), comment="最后操作人")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    frozen_at = Column(DateTime(timezone=True), nullable=True)

    status_histories = relationship("StatusHistory", back_populates="receipt", cascade="all, delete-orphan")
    overrule_histories = relationship("OverruleHistory", back_populates="receipt", cascade="all, delete-orphan")
    freeze_records = relationship("FreezeRecord", back_populates="receipt", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="receipt", cascade="all, delete-orphan")


class StatusHistory(Base):
    __tablename__ = "status_histories"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("exception_receipts.id"), nullable=False)
    from_status = Column(Enum(ReceiptStatus), nullable=True, comment="变更前状态")
    to_status = Column(Enum(ReceiptStatus), nullable=False, comment="变更后状态")
    change_reason = Column(Text, comment="变更原因")
    operator = Column(String(64), nullable=False, comment="操作人")
    operation_type = Column(Enum(OperationType), nullable=False, comment="操作类型")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("ExceptionReceipt", back_populates="status_histories")


class OverruleHistory(Base):
    __tablename__ = "overrule_histories"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("exception_receipts.id"), nullable=False)
    original_status = Column(Enum(ReceiptStatus), nullable=False, comment="原状态")
    new_status = Column(Enum(ReceiptStatus), nullable=False, comment="新状态")
    original_compensate_amount = Column(Float, comment="原补偿金额")
    new_compensate_amount = Column(Float, comment="新补偿金额")
    original_responsibility = Column(String(128), comment="原责任方")
    new_responsibility = Column(String(128), comment="新责任方")
    overrule_reason = Column(Text, nullable=False, comment="改判理由")
    overrule_channel = Column(Enum(ReviewChannel), default=ReviewChannel.MANUAL_REVIEW, comment="改判渠道")
    operator = Column(String(64), nullable=False, comment="操作人")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("ExceptionReceipt", back_populates="overrule_histories")


class FreezeRecord(Base):
    __tablename__ = "freeze_records"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("exception_receipts.id"), nullable=False)
    freeze_reason = Column(Enum(FreezeReason), nullable=False, comment="冻结原因")
    status_before_freeze = Column(Enum(ReceiptStatus), nullable=False, comment="冻结前状态")
    is_unfrozen = Column(Boolean, default=False, comment="是否已解冻")
    unfreeze_reason = Column(Text, nullable=True, comment="解冻原因")
    freeze_operator = Column(String(64), nullable=False, comment="冻结操作人")
    unfreeze_operator = Column(String(64), nullable=True, comment="解冻操作人")
    frozen_at = Column(DateTime(timezone=True), server_default=func.now())
    unfrozen_at = Column(DateTime(timezone=True), nullable=True)

    receipt = relationship("ExceptionReceipt", back_populates="freeze_records")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("exception_receipts.id"), nullable=False)
    attachment_type = Column(Enum(AttachmentType), nullable=False, comment="附件类型")
    file_name = Column(String(255), nullable=False, comment="文件名")
    file_path = Column(String(512), nullable=False, comment="文件路径")
    file_size = Column(Integer, comment="文件大小(字节)")
    uploader = Column(String(64), nullable=False, comment="上传人")
    remark = Column(Text, nullable=True, comment="备注")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("ExceptionReceipt", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(Enum(OperationType), nullable=False, comment="操作类型")
    target_type = Column(String(64), comment="目标类型")
    target_id = Column(Integer, comment="目标ID")
    operator = Column(String(64), nullable=False, comment="操作人")
    detail = Column(Text, comment="操作详情JSON")
    ip_address = Column(String(64), nullable=True, comment="IP地址")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
