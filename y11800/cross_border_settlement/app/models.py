from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import String, Float, Boolean, DateTime, Date, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ClientOrder(Base):
    __tablename__ = "client_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    client_name: Mapped[str] = mapped_column(String(128), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    settlements: Mapped[List["Settlement"]] = relationship(back_populates="order")


class BankSlip(Base):
    __tablename__ = "bank_slips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slip_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    order_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    slip_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bank_ref: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_split: Mapped[bool] = mapped_column(Boolean, default=False)
    split_group_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    fee_deducted: Mapped[bool] = mapped_column(Boolean, default=False)
    fee_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    settlements: Mapped[List["Settlement"]] = relationship(
        secondary="settlement_slips", back_populates="slips"
    )


class PlatformBill(Base):
    __tablename__ = "platform_bills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bill_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    order_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bill_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    platform_ref: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    settlements: Mapped[List["Settlement"]] = relationship(
        secondary="settlement_bills", back_populates="bills"
    )


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("client_orders.id"), nullable=False)
    match_status: Mapped[str] = mapped_column(String(32), default="pending")
    original_amount: Mapped[float] = mapped_column(Float, nullable=False)
    settled_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    exchange_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rate_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    rate_date_mismatch: Mapped[bool] = mapped_column(Boolean, default=False)
    fee_handling: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    fee_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order: Mapped["ClientOrder"] = relationship(back_populates="settlements")
    slips: Mapped[List["BankSlip"]] = relationship(
        secondary="settlement_slips", back_populates="settlements"
    )
    bills: Mapped[List["PlatformBill"]] = relationship(
        secondary="settlement_bills", back_populates="settlements"
    )
    logs: Mapped[List["SettlementLog"]] = relationship(back_populates="settlement")


class SettlementSlip(Base):
    __tablename__ = "settlement_slips"

    settlement_id: Mapped[int] = mapped_column(Integer, ForeignKey("settlements.id"), primary_key=True)
    slip_id: Mapped[int] = mapped_column(Integer, ForeignKey("bank_slips.id"), primary_key=True)


class SettlementBill(Base):
    __tablename__ = "settlement_bills"

    settlement_id: Mapped[int] = mapped_column(Integer, ForeignKey("settlements.id"), primary_key=True)
    bill_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_bills.id"), primary_key=True)


class SettlementLog(Base):
    __tablename__ = "settlement_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    settlement_id: Mapped[int] = mapped_column(Integer, ForeignKey("settlements.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    operator: Mapped[str] = mapped_column(String(64), default="system")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    settlement: Mapped["Settlement"] = relationship(back_populates="logs")
