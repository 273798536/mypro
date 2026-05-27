from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True)
    merchant_code = Column(String(50), unique=True, nullable=False, index=True)
    merchant_name = Column(String(200), nullable=False)
    shop_name = Column(String(200))
    category = Column(String(100))
    contact = Column(String(100))
    phone = Column(String(50))
    status = Column(String(20), default="normal")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    orders = relationship("Order", back_populates="merchant")
    freezes = relationship("FreezeRecord", back_populates="merchant")
    violations = relationship("ViolationRecord", back_populates="merchant")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_no = Column(String(100), unique=True, nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), index=True)
    order_amount = Column(Float, nullable=False)
    goods_amount = Column(Float, default=0)
    shipping_fee = Column(Float, default=0)
    order_status = Column(String(50), default="completed")
    payment_method = Column(String(50))
    buyer_account = Column(String(100))
    order_time = Column(DateTime)
    receipt_time = Column(DateTime)
    settlement_amount = Column(Float, default=0)
    settlement_time = Column(DateTime)
    data_source = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    merchant = relationship("Merchant", back_populates="orders")
    freezes = relationship("FreezeRecord", back_populates="order")
    violations = relationship("ViolationRecord", back_populates="order")


class ViolationRecord(Base):
    __tablename__ = "violation_records"

    id = Column(Integer, primary_key=True)
    violation_no = Column(String(50), unique=True, nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    violation_type = Column(String(100))
    violation_desc = Column(Text)
    violation_time = Column(DateTime)
    report_source = Column(String(100))
    violation_status = Column(String(50), default="pending")
    penalty_amount = Column(Float, default=0)
    handler = Column(String(100))
    handle_time = Column(DateTime)
    remark = Column(Text)
    data_source = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    merchant = relationship("Merchant", back_populates="violations")
    order = relationship("Order", back_populates="violations")
    appeals = relationship("AppealRecord", back_populates="violation")


class AppealRecord(Base):
    __tablename__ = "appeal_records"

    id = Column(Integer, primary_key=True)
    appeal_no = Column(String(50), unique=True, nullable=False, index=True)
    violation_id = Column(Integer, ForeignKey("violation_records.id"), index=True)
    appeal_reason = Column(Text)
    appeal_evidence = Column(Text)
    appeal_time = Column(DateTime)
    appellant = Column(String(100))
    appeal_status = Column(String(50), default="pending")
    audit_opinion = Column(Text)
    auditor = Column(String(100))
    audit_time = Column(DateTime)
    appeal_result = Column(String(50))
    unfreeze_suggestion = Column(Float, default=0)
    data_source = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    violation = relationship("ViolationRecord", back_populates="appeals")


class FreezeRecord(Base):
    __tablename__ = "freeze_records"

    id = Column(Integer, primary_key=True)
    freeze_no = Column(String(50), unique=True, nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    violation_id = Column(Integer, ForeignKey("violation_records.id"), index=True)
    freeze_amount = Column(Float, nullable=False)
    freeze_reason = Column(String(500))
    freeze_type = Column(String(50))
    freeze_status = Column(String(50), default="frozen", index=True)
    freeze_time = Column(DateTime, default=datetime.now)
    unfreeze_amount = Column(Float, default=0)
    remain_frozen_amount = Column(Float)
    last_unfreeze_time = Column(DateTime)
    operator = Column(String(100))
    data_source = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    merchant = relationship("Merchant", back_populates="freezes")
    order = relationship("Order", back_populates="freezes")
    unfreeze_records = relationship("UnfreezeRecord", back_populates="freeze")


class UnfreezeRecord(Base):
    __tablename__ = "unfreeze_records"

    id = Column(Integer, primary_key=True)
    unfreeze_no = Column(String(50), unique=True, nullable=False, index=True)
    freeze_id = Column(Integer, ForeignKey("freeze_records.id"), index=True)
    appeal_id = Column(Integer, ForeignKey("appeal_records.id"), index=True)
    unfreeze_amount = Column(Float, nullable=False)
    unfreeze_reason = Column(String(500))
    unfreeze_type = Column(String(50))
    unfreeze_status = Column(String(50), default="completed")
    operator = Column(String(100))
    operate_time = Column(DateTime, default=datetime.now)
    remark = Column(Text)
    data_source = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    freeze = relationship("FreezeRecord", back_populates="unfreeze_records")


class MerchantBalance(Base):
    __tablename__ = "merchant_balances"

    id = Column(Integer, primary_key=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), unique=True, index=True)
    total_frozen = Column(Float, default=0)
    total_unfrozen = Column(Float, default=0)
    total_penalty = Column(Float, default=0)
    available_balance = Column(Float, default=0)
    last_audit_time = Column(DateTime)
    last_auditor = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    operation_type = Column(String(50), index=True)
    operation_subtype = Column(String(50))
    target_type = Column(String(50))
    target_id = Column(Integer)
    before_value = Column(Text)
    after_value = Column(Text)
    operator = Column(String(100))
    operate_time = Column(DateTime, default=datetime.now, index=True)
    remark = Column(Text)
    data_source = Column(String(100))
    risk_level = Column(String(20), default="normal")
    risk_desc = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class DataImportRecord(Base):
    __tablename__ = "data_import_records"

    id = Column(Integer, primary_key=True)
    batch_no = Column(String(50), unique=True, nullable=False)
    import_type = Column(String(50))
    file_name = Column(String(200))
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    dirty_count = Column(Integer, default=0)
    operator = Column(String(100))
    import_time = Column(DateTime, default=datetime.now)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
