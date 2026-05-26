from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, Text, Date, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship

from app.config import settings
from app.models.base import IdempotentModel, BaseModel


JSONType = JSON
if settings.DATABASE_URL.startswith("postgresql"):
    from sqlalchemy.dialects.postgresql import JSONB
    JSONType = JSONB


class OutsourceDelivery(IdempotentModel):
    __tablename__ = "outsource_delivery"

    delivery_no = Column(String(50), index=True, nullable=False)
    supplier_code = Column(String(50), index=True, nullable=False)
    supplier_name = Column(String(200), nullable=False)
    product_code = Column(String(50), index=True, nullable=False)
    product_name = Column(String(200), nullable=False)
    delivery_date = Column(Date, nullable=False, index=True)
    quantity = Column(Numeric(18, 4), nullable=False)
    unit_price = Column(Numeric(18, 6), nullable=False)
    total_amount = Column(Numeric(18, 2), nullable=False)
    batch_no = Column(String(50), nullable=True)
    work_order_no = Column(String(50), nullable=True)
    metadata_ = Column(JSONType, default=dict)
    
    repair_records = relationship("RepairRecord", back_populates="delivery")
    deduction_details = relationship("DeductionDetail", back_populates="delivery")
    compensation_items = relationship("CompensationItem", back_populates="delivery", foreign_keys="CompensationItem.delivery_id")

    __table_args__ = (
        Index('idx_delivery_supplier_date', 'supplier_code', 'delivery_date'),
    )


class RepairRecord(IdempotentModel):
    __tablename__ = "repair_record"

    repair_no = Column(String(50), index=True, nullable=False)
    delivery_id = Column(Integer, ForeignKey("outsource_delivery.id"), nullable=False)
    repair_date = Column(Date, nullable=False, index=True)
    repair_type = Column(String(50), nullable=False)
    repair_reason = Column(String(500), nullable=False)
    repair_quantity = Column(Numeric(18, 4), nullable=False)
    repair_cost = Column(Numeric(18, 2), nullable=False)
    responsible_party = Column(String(50), nullable=False)
    batch_no = Column(String(50), nullable=True)
    metadata_ = Column(JSONType, default=dict)
    
    delivery = relationship("OutsourceDelivery", back_populates="repair_records")
    deduction_details = relationship("DeductionDetail", back_populates="repair")
    compensation_items = relationship("CompensationItem", back_populates="repair", foreign_keys="CompensationItem.repair_id")


class DeductionDetail(IdempotentModel):
    __tablename__ = "deduction_detail"

    deduction_no = Column(String(50), index=True, nullable=False)
    delivery_id = Column(Integer, ForeignKey("outsource_delivery.id"), nullable=True)
    repair_id = Column(Integer, ForeignKey("repair_record.id"), nullable=True)
    deduction_type = Column(String(50), nullable=False)
    deduction_date = Column(Date, nullable=False, index=True)
    deduction_amount = Column(Numeric(18, 2), nullable=False)
    deduction_reason = Column(String(500), nullable=False)
    deduction_basis = Column(String(200), nullable=True)
    metadata_ = Column(JSONType, default=dict)
    
    delivery = relationship("OutsourceDelivery", back_populates="deduction_details")
    repair = relationship("RepairRecord", back_populates="deduction_details")
    compensation_items = relationship("CompensationItem", back_populates="deduction", foreign_keys="CompensationItem.deduction_id")


class ShiftRecord(IdempotentModel):
    __tablename__ = "shift_record"

    shift_date = Column(Date, nullable=False, index=True)
    shift_type = Column(String(50), nullable=False)
    team_code = Column(String(50), nullable=False)
    team_name = Column(String(200), nullable=False)
    worker_count = Column(Integer, nullable=False)
    work_hours = Column(Numeric(10, 2), nullable=False)
    output_quantity = Column(Numeric(18, 4), nullable=False)
    product_code = Column(String(50), nullable=True)
    product_name = Column(String(200), nullable=True)
    metadata_ = Column(JSONType, default=dict)


class TemporarySupplement(IdempotentModel):
    __tablename__ = "temporary_supplement"

    supplement_no = Column(String(50), index=True, nullable=False)
    supplement_type = Column(String(50), nullable=False)
    supplement_date = Column(Date, nullable=False, index=True)
    supplement_reason = Column(String(500), nullable=False)
    related_order_no = Column(String(50), nullable=True)
    supplement_content = Column(JSONType, default=dict)
    amount = Column(Numeric(18, 2), nullable=True)
    metadata_ = Column(JSONType, default=dict)


class CompensationQueue(BaseModel):
    __tablename__ = "compensation_queue"

    business_type = Column(String(50), nullable=False, index=True)
    business_key = Column(String(255), nullable=False, index=True)
    business_id = Column(Integer, nullable=True)
    status = Column(String(50), default="pending", nullable=False, index=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    next_retry_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_error = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)
    process_logs = Column(JSONType, default=list)
    handled_by = Column(Integer, nullable=True)
    handled_at = Column(DateTime, nullable=True)
    source_ids = Column(JSONType, default=list)
    version = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        Index('idx_queue_status_retry', 'status', 'next_retry_at'),
        Index('idx_queue_business', 'business_type', 'business_key'),
    )


class CompensationItem(BaseModel):
    __tablename__ = "compensation_item"

    queue_id = Column(Integer, ForeignKey("compensation_queue.id"), nullable=False)
    delivery_id = Column(Integer, ForeignKey("outsource_delivery.id"), nullable=True)
    repair_id = Column(Integer, ForeignKey("repair_record.id"), nullable=True)
    deduction_id = Column(Integer, ForeignKey("deduction_detail.id"), nullable=True)
    item_type = Column(String(50), nullable=False)
    original_amount = Column(Numeric(18, 2), nullable=False)
    adjusted_amount = Column(Numeric(18, 2), nullable=False)
    adjustment_reason = Column(String(500), nullable=False)
    is_posted = Column(String(1), default="N", nullable=False)
    posted_at = Column(DateTime, nullable=True)

    delivery = relationship("OutsourceDelivery", back_populates="compensation_items", foreign_keys=[delivery_id])
    repair = relationship("RepairRecord", back_populates="compensation_items", foreign_keys=[repair_id])
    deduction = relationship("DeductionDetail", back_populates="compensation_items", foreign_keys=[deduction_id])


class FailedRecord(BaseModel):
    __tablename__ = "failed_records"

    business_type = Column(String(50), nullable=False, index=True)
    idempotent_key = Column(String(255), nullable=False, index=True)
    raw_data = Column(JSONType, nullable=False)
    error_type = Column(String(100), nullable=False)
    error_message = Column(Text, nullable=False)
    error_detail = Column(JSONType, nullable=True)
    is_resolved = Column(String(1), default="N", nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, nullable=True)
    resolution_note = Column(Text, nullable=True)

    __table_args__ = (
        Index('idx_failed_resolved_type', 'is_resolved', 'business_type'),
    )


class SettlementSummary(BaseModel):
    __tablename__ = "settlement_summary"

    summary_date = Column(Date, nullable=False, index=True)
    supplier_code = Column(String(50), nullable=False, index=True)
    supplier_name = Column(String(200), nullable=False)
    product_code = Column(String(50), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    delivery_amount = Column(Numeric(18, 2), default=0, nullable=False)
    repair_amount = Column(Numeric(18, 2), default=0, nullable=False)
    deduction_amount = Column(Numeric(18, 2), default=0, nullable=False)
    final_amount = Column(Numeric(18, 2), default=0, nullable=False)
    source_ids = Column(JSONType, default=dict)
    version = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        Index('idx_summary_supplier_date', 'supplier_code', 'summary_date', 'product_code', unique=True),
    )


class ChangeHistory(BaseModel):
    __tablename__ = "change_history"

    business_type = Column(String(50), nullable=False)
    business_id = Column(Integer, nullable=False)
    field_name = Column(String(100), nullable=False)
    old_value = Column(JSONType, nullable=True)
    new_value = Column(JSONType, nullable=True)
    change_reason = Column(String(500), nullable=True)
    operator_id = Column(Integer, nullable=False)
    operator_name = Column(String(100), nullable=False)

    __table_args__ = (
        Index('idx_change_business', 'business_type', 'business_id'),
    )
