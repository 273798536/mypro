from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class StudentCard(Base):
    __tablename__ = "student_cards"

    id = Column(Integer, primary_key=True, index=True)
    card_no = Column(String(32), unique=True, index=True, nullable=False)
    student_id = Column(String(32), index=True)
    student_name = Column(String(64))
    department = Column(String(128))
    status = Column(String(16), default="normal")

    total_balance = Column(Float, default=0.0)
    subsidy_balance = Column(Float, default=0.0)
    recharge_balance = Column(Float, default=0.0)
    revoke_balance = Column(Float, default=0.0)

    is_merged = Column(Boolean, default=False)
    merged_from = Column(String(32))
    merged_to = Column(String(32))

    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    recharges = relationship("RechargeRecord", back_populates="card")
    revokes = relationship("ConsumeRevoke", back_populates="card")
    refunds = relationship("RefundRecord", back_populates="card")


class SubsidyRule(Base):
    __tablename__ = "subsidy_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(32), index=True)
    rule_name = Column(String(128))
    subsidy_type = Column(String(32))
    is_refundable = Column(Boolean, default=True)
    effective_date = Column(DateTime)
    expiry_date = Column(DateTime)
    department = Column(String(128))
    student_level = Column(String(32))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class RechargeRecord(Base):
    __tablename__ = "recharge_records"

    id = Column(Integer, primary_key=True, index=True)
    card_no = Column(String(32), ForeignKey("student_cards.card_no"), index=True)
    recharge_no = Column(String(64), unique=True, index=True)
    recharge_type = Column(String(32))
    amount = Column(Float, nullable=False)
    subsidy_amount = Column(Float, default=0.0)
    self_amount = Column(Float, default=0.0)

    subsidy_rule_code = Column(String(32))
    is_subsidy = Column(Boolean, default=False)
    is_refundable = Column(Boolean, default=True)

    recharge_time = Column(DateTime, index=True)
    operator = Column(String(64))
    window_no = Column(String(16))

    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    is_amended = Column(Boolean, default=False)
    amend_version = Column(Integer, default=1)

    card = relationship("StudentCard", back_populates="recharges")
    amend_history = relationship("RechargeAmendment", back_populates="original")


class ConsumeRevoke(Base):
    __tablename__ = "consume_revokes"

    id = Column(Integer, primary_key=True, index=True)
    card_no = Column(String(32), ForeignKey("student_cards.card_no"), index=True)
    revoke_no = Column(String(64), unique=True, index=True)
    original_consume_no = Column(String(64))
    amount = Column(Float, nullable=False)

    consume_time = Column(DateTime)
    revoke_time = Column(DateTime, index=True)

    is_cross_day = Column(Boolean, default=False)
    operator = Column(String(64))
    window_no = Column(String(16))

    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    card = relationship("StudentCard", back_populates="revokes")


class RefundRecord(Base):
    __tablename__ = "refund_records"

    id = Column(Integer, primary_key=True, index=True)
    card_no = Column(String(32), ForeignKey("student_cards.card_no"), index=True)
    refund_batch_no = Column(String(64), index=True)
    refund_no = Column(String(64), unique=True, index=True)

    total_refund = Column(Float, default=0.0)
    subsidy_refund = Column(Float, default=0.0)
    recharge_refund = Column(Float, default=0.0)
    revoke_refund = Column(Float, default=0.0)

    blocked_subsidy = Column(Float, default=0.0)
    has_blocked_subsidy = Column(Boolean, default=False)
    has_cross_day_revoke = Column(Boolean, default=False)
    has_merged_card = Column(Boolean, default=False)

    status = Column(String(16), default="pending")
    review_status = Column(String(16), default="pending")

    refund_time = Column(DateTime, default=datetime.now)
    operator = Column(String(64))
    reviewer = Column(String(64))
    review_time = Column(DateTime)

    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    card = relationship("StudentCard", back_populates="refunds")
    details = relationship("RefundDetail", back_populates="refund")


class RefundDetail(Base):
    __tablename__ = "refund_details"

    id = Column(Integer, primary_key=True, index=True)
    refund_id = Column(Integer, ForeignKey("refund_records.id"))
    item_type = Column(String(32))
    item_no = Column(String(64))
    amount = Column(Float)
    is_blocked = Column(Boolean, default=False)
    block_reason = Column(String(128))

    refund = relationship("RefundRecord", back_populates="details")


class RechargeAmendment(Base):
    __tablename__ = "recharge_amendments"

    id = Column(Integer, primary_key=True, index=True)
    original_recharge_id = Column(Integer, ForeignKey("recharge_records.id"))
    amendment_no = Column(String(64), unique=True, index=True)

    old_amount = Column(Float)
    new_amount = Column(Float)
    old_subsidy_amount = Column(Float)
    new_subsidy_amount = Column(Float)
    old_self_amount = Column(Float)
    new_self_amount = Column(Float)
    old_is_refundable = Column(Boolean)
    new_is_refundable = Column(Boolean)
    old_remark = Column(Text)
    new_remark = Column(Text)

    amend_reason = Column(Text)
    operator = Column(String(64))
    created_at = Column(DateTime, default=datetime.now)

    original = relationship("RechargeRecord", back_populates="amend_history")


class CardMergeRecord(Base):
    __tablename__ = "card_merge_records"

    id = Column(Integer, primary_key=True, index=True)
    merge_batch_no = Column(String(64), index=True)
    from_card_no = Column(String(32), index=True)
    to_card_no = Column(String(32), index=True)
    transferred_amount = Column(Float)
    operator = Column(String(64))
    merge_time = Column(DateTime, default=datetime.now)
    remark = Column(Text)


class BatchImportLog(Base):
    __tablename__ = "batch_import_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(64), index=True)
    import_type = Column(String(32))
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    operator = Column(String(64))
    created_at = Column(DateTime, default=datetime.now)
    error_details = Column(Text)


Index("idx_card_no_time", RechargeRecord.card_no, RechargeRecord.recharge_time)
Index("idx_refund_batch_status", RefundRecord.refund_batch_no, RefundRecord.status)
