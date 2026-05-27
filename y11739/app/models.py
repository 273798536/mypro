from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from .database import Base


class Currency(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    JPY = "JPY"
    CNY = "CNY"


class OrderStatus(str, enum.Enum):
    ACTIVE = "active"
    MODIFIED = "modified"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class ContractStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLOSED = "closed"


class ExposureStatus(str, enum.Enum):
    NORMAL = "normal"
    WARNING = "warning"
    BREACH = "breach"
    ROLLBACK = "rollback"


class AlertType(str, enum.Enum):
    CURRENCY_MISMATCH = "currency_mismatch"
    DUPLICATE_COVERAGE = "duplicate_coverage"
    ORDER_CANCELLED = "order_cancelled"
    LIMIT_EXCEEDED = "limit_exceeded"
    LIMIT_WARNING = "limit_warning"


class ForeignOrder(Base):
    __tablename__ = "foreign_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    currency = Column(Enum(Currency), nullable=False)
    amount = Column(Float, nullable=False)
    order_date = Column(DateTime, nullable=False)
    expected_settle_date = Column(DateTime, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.ACTIVE)
    source = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(50), default="system")

    changes = relationship("OrderChange", back_populates="order", cascade="all, delete-orphan")
    contracts = relationship("ForwardContract", back_populates="order")


class ForwardContract(Base):
    __tablename__ = "forward_contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String(50), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("foreign_orders.id"))
    currency = Column(Enum(Currency), nullable=False)
    amount = Column(Float, nullable=False)
    forward_rate = Column(Float, nullable=False)
    trade_date = Column(DateTime, nullable=False)
    settle_date = Column(DateTime, nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.ACTIVE)
    source = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(50), default="system")

    order = relationship("ForeignOrder", back_populates="contracts")


class SpotRate(Base):
    __tablename__ = "spot_rates"

    id = Column(Integer, primary_key=True, index=True)
    currency = Column(Enum(Currency), nullable=False)
    rate = Column(Float, nullable=False)
    rate_date = Column(DateTime, nullable=False)
    source = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default="system")


class LimitRule(Base):
    __tablename__ = "limit_rules"

    id = Column(Integer, primary_key=True, index=True)
    currency = Column(Enum(Currency), nullable=False)
    single_order_limit = Column(Float, nullable=False)
    total_exposure_limit = Column(Float, nullable=False)
    warning_threshold = Column(Float, default=0.8)
    effective_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    source = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default="system")


class OrderChange(Base):
    __tablename__ = "order_changes"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("foreign_orders.id"), nullable=False)
    change_type = Column(String(50), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    change_reason = Column(String(255))
    change_date = Column(DateTime, server_default=func.now())
    changed_by = Column(String(50), default="system")
    rollback_id = Column(Integer, ForeignKey("order_changes.id"))

    order = relationship("ForeignOrder", back_populates="changes")
    rollback_target = relationship("OrderChange", remote_side=[id])


class ExposureRecord(Base):
    __tablename__ = "exposure_records"

    id = Column(Integer, primary_key=True, index=True)
    record_date = Column(DateTime, nullable=False)
    currency = Column(Enum(Currency), nullable=False)
    total_order_amount = Column(Float, default=0)
    total_contract_amount = Column(Float, default=0)
    net_exposure = Column(Float, default=0)
    net_exposure_cny = Column(Float, default=0)
    coverage_ratio = Column(Float, default=0)
    status = Column(Enum(ExposureStatus), default=ExposureStatus.NORMAL)
    spot_rate_id = Column(Integer, ForeignKey("spot_rates.id"))
    calculation_details = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default="system")

    alerts = relationship("Alert", back_populates="exposure_record", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    exposure_record_id = Column(Integer, ForeignKey("exposure_records.id"))
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(String(20), default="warning")
    message = Column(String(500), nullable=False)
    related_order_id = Column(Integer, ForeignKey("foreign_orders.id"))
    related_contract_id = Column(Integer, ForeignKey("forward_contracts.id"))
    is_resolved = Column(Boolean, default=False)
    resolution_note = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime)

    exposure_record = relationship("ExposureRecord", back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    source = Column(String(100))
    operator = Column(String(50), default="system")
    operation_time = Column(DateTime, server_default=func.now())
