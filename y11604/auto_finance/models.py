from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True)
    vin = Column(String(17), unique=True, nullable=False, index=True)
    brand = Column(String(50))
    model = Column(String(50))
    year = Column(Integer)
    plate_number = Column(String(20))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contracts = relationship("Contract", back_populates="vehicle")
    gps_orders = relationship("GpsWorkOrder", back_populates="vehicle")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    contract_no = Column(String(50), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    vin = Column(String(17), ForeignKey("vehicles.vin"), nullable=False)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20))
    total_amount = Column(Float, nullable=False)
    down_payment_amount = Column(Float, nullable=False)
    balance_amount = Column(Float, nullable=False)
    status = Column(String(20), default="active", nullable=False)
    signed_at = Column(DateTime)
    effective_at = Column(DateTime)
    is_current = Column(Boolean, default=True, nullable=False)
    source = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    vehicle = relationship("Vehicle", back_populates="contracts")
    down_payments = relationship("DownPayment", back_populates="contract")
    balance_plans = relationship("BalancePlan", back_populates="contract")
    deliveries = relationship("Delivery", back_populates="contract")
    refunds = relationship("Refund", back_populates="contract")

    __table_args__ = (
        Index("idx_contract_version", "contract_no", "version", unique=True),
    )


class DownPayment(Base):
    __tablename__ = "down_payments"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    transaction_no = Column(String(50), unique=True)
    amount = Column(Float, nullable=False)
    paid_at = Column(DateTime)
    payer = Column(String(100))
    payment_method = Column(String(50))
    status = Column(String(20), default="pending", nullable=False)
    source = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship("Contract", back_populates="down_payments")


class BalancePlan(Base):
    __tablename__ = "balance_plans"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    plan_no = Column(String(50), unique=True)
    total_balance = Column(Float, nullable=False)
    installment_count = Column(Integer, default=1)
    first_payment_date = Column(DateTime)
    monthly_amount = Column(Float)
    status = Column(String(20), default="pending", nullable=False)
    actual_settled_at = Column(DateTime)
    actual_settled_amount = Column(Float)
    source = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship("Contract", back_populates="balance_plans")


class GpsWorkOrder(Base):
    __tablename__ = "gps_work_orders"

    id = Column(Integer, primary_key=True)
    order_no = Column(String(50), unique=True, nullable=False)
    vin = Column(String(17), ForeignKey("vehicles.vin"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    type = Column(String(20), default="install", nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    scheduled_at = Column(DateTime)
    completed_at = Column(DateTime)
    technician = Column(String(100))
    device_no = Column(String(50))
    source = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    vehicle = relationship("Vehicle", back_populates="gps_orders")
    contract = relationship("Contract")


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    delivery_no = Column(String(50), unique=True, nullable=False)
    vin = Column(String(17), nullable=False)
    delivered_at = Column(DateTime)
    is_locked = Column(Boolean, default=False, nullable=False)
    locked_at = Column(DateTime)
    down_payment_verified = Column(Boolean, default=False)
    gps_installed = Column(Boolean, default=False)
    balance_verified = Column(Boolean, default=False)
    delivered_by = Column(String(100))
    received_by = Column(String(100))
    source = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship("Contract", back_populates="deliveries")


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    refund_no = Column(String(50), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    refund_type = Column(String(50), nullable=False)
    reason = Column(Text)
    status = Column(String(20), default="pending", nullable=False)
    refunded_at = Column(DateTime)
    recipient = Column(String(100))
    source = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship("Contract", back_populates="refunds")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String(20), nullable=False)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    source = Column(String(100))
    operator = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now, index=True)
