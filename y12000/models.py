from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, index=True)
    account_no = Column(String, unique=True, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    total_assets = Column(Float, default=0.0)
    total_debt = Column(Float, default=0.0)
    available_cash = Column(Float, default=0.0)
    margin_line = Column(Float, default=130.0)
    warning_line = Column(Float, default=150.0)
    current_margin_ratio = Column(Float, nullable=True)
    risk_level = Column(String, default="normal")
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    remark = Column(Text, nullable=True)

    positions = relationship("Position", back_populates="account")
    margin_calls = relationship("MarginCall", back_populates="account")


class Position(Base):
    __tablename__ = "positions"

    id = Column(String, primary_key=True, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    stock_code = Column(String, nullable=False, index=True)
    stock_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    market_value = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    is_suspended = Column(Boolean, default=False)
    suspended_price = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    account = relationship("Account", back_populates="positions")


class QuoteSnapshot(Base):
    __tablename__ = "quote_snapshots"

    id = Column(String, primary_key=True, index=True)
    stock_code = Column(String, nullable=False, index=True)
    stock_name = Column(String, nullable=False)
    snapshot_date = Column(String, nullable=False, index=True)
    snapshot_time = Column(String, nullable=False)
    current_price = Column(Float, nullable=False)
    pre_close_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    is_suspended = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MarginRate(Base):
    __tablename__ = "margin_rates"

    id = Column(String, primary_key=True, index=True)
    stock_code = Column(String, nullable=False, index=True)
    stock_name = Column(String, nullable=False)
    collateral_rate = Column(Float, nullable=False)
    effective_date = Column(String, nullable=False)
    expiry_date = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    remark = Column(Text, nullable=True)


class MarginCall(Base):
    __tablename__ = "margin_calls"

    id = Column(String, primary_key=True, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    call_date = Column(String, nullable=False, index=True)
    margin_ratio = Column(Float, nullable=False)
    required_deposit = Column(Float, nullable=False)
    deadline = Column(String, nullable=False)
    status = Column(String, default="pending")
    risk_level = Column(String, default="warning")
    notification_status = Column(String, default="pending")
    is_duplicate = Column(Boolean, default=False)
    has_expired_rate = Column(Boolean, default=False)
    has_suspended_stock = Column(Boolean, default=False)
    next_action = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    remark = Column(Text, nullable=True)

    account = relationship("Account", back_populates="margin_calls")
    details = relationship("MarginCallDetail", back_populates="margin_call")


class MarginCallDetail(Base):
    __tablename__ = "margin_call_details"

    id = Column(String, primary_key=True, index=True)
    margin_call_id = Column(String, ForeignKey("margin_calls.id"), nullable=False)
    stock_code = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    market_value = Column(Float, nullable=False)
    collateral_rate = Column(Float, nullable=False)
    collateral_value = Column(Float, nullable=False)
    is_suspended = Column(Boolean, default=False)
    is_rate_expired = Column(Boolean, default=False)
    original_collateral_rate = Column(Float, nullable=True)
    is_modified = Column(Boolean, default=False)
    modified_by = Column(String, nullable=True)
    modified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    margin_call = relationship("MarginCall", back_populates="details")
