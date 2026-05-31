import enum
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Enum, Text, ForeignKey, Boolean,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class AllocationStatus(str, enum.Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    EXPORTED = "exported"


class AuditType(str, enum.Enum):
    VOYAGE_MISMATCH = "voyage_mismatch"
    RATE_DATE_ERROR = "rate_date_error"
    CONTRACT_EXT_OVERWRITE = "contract_extension_overwrite"


class BunkeringSlip(Base):
    __tablename__ = "bunkering_slip"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slip_no = Column(String(64), unique=True, nullable=False)
    vessel_name = Column(String(128), nullable=False)
    port = Column(String(128), nullable=False)
    fuel_type = Column(String(32), nullable=False)
    quantity_mt = Column(Float, nullable=False)
    unit_price_usd = Column(Float, nullable=False)
    total_usd = Column(Float, nullable=False)
    bunkering_date = Column(Date, nullable=False)
    exchange_rate = Column(Float, nullable=True)
    exchange_rate_date = Column(Date, nullable=True)
    voyage_id = Column(Integer, ForeignKey("voyage_plan.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    voyage = relationship("VoyagePlan", back_populates="bunkering_slips")
    allocations = relationship("PnLAllocation", back_populates="bunkering_slip")


class VoyagePlan(Base):
    __tablename__ = "voyage_plan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voyage_no = Column(String(64), unique=True, nullable=False)
    vessel_name = Column(String(128), nullable=False)
    departure_port = Column(String(128), nullable=False)
    arrival_port = Column(String(128), nullable=False)
    departure_date = Column(Date, nullable=False)
    arrival_date = Column(Date, nullable=False)
    is_supplementary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bunkering_slips = relationship("BunkeringSlip", back_populates="voyage")
    allocations = relationship("PnLAllocation", back_populates="voyage")


class HedgeContract(Base):
    __tablename__ = "hedge_contract"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_no = Column(String(64), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    fuel_type = Column(String(32), nullable=False)
    hedge_quantity_mt = Column(Float, nullable=False)
    hedge_price_usd = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_extended = Column(Boolean, default=False)
    replaced_by_id = Column(Integer, ForeignKey("hedge_contract.id"), nullable=True)
    status = Column(String(32), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    replaced_by = relationship("HedgeContract", remote_side=[id], foreign_keys=[replaced_by_id])
    allocations = relationship("PnLAllocation", back_populates="hedge_contract")


class PnLAllocation(Base):
    __tablename__ = "pnl_allocation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bunkering_slip_id = Column(Integer, ForeignKey("bunkering_slip.id"), nullable=False)
    voyage_id = Column(Integer, ForeignKey("voyage_plan.id"), nullable=True)
    hedge_contract_id = Column(Integer, ForeignKey("hedge_contract.id"), nullable=True)
    spot_pnl = Column(Float, default=0.0)
    hedge_pnl = Column(Float, default=0.0)
    net_pnl = Column(Float, default=0.0)
    voyage_allocation_amount = Column(Float, default=0.0)
    exchange_rate_used = Column(Float, nullable=True)
    exchange_rate_date_used = Column(Date, nullable=True)
    status = Column(Enum(AllocationStatus), default=AllocationStatus.DRAFT, nullable=False)
    reviewed_by = Column(String(64), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    approved_by = Column(String(64), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bunkering_slip = relationship("BunkeringSlip", back_populates="allocations")
    voyage = relationship("VoyagePlan", back_populates="allocations")
    hedge_contract = relationship("HedgeContract", back_populates="allocations")
    audit_trails = relationship("AuditTrail", back_populates="allocation")


class AuditTrail(Base):
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    allocation_id = Column(Integer, ForeignKey("pnl_allocation.id"), nullable=False)
    audit_type = Column(Enum(AuditType), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    allocation = relationship("PnLAllocation", back_populates="audit_trails")
