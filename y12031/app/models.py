from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func

from app.database import Base


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    farmer_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    id_number = Column(String, unique=True)
    phone = Column(String)
    address = Column(String)
    cooperative_id = Column(String)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class QualityGrade(Base):
    __tablename__ = "quality_grades"

    id = Column(Integer, primary_key=True, index=True)
    grade_code = Column(String, unique=True, index=True, nullable=False)
    grade_name = Column(String, nullable=False)
    price_multiplier = Column(Float, nullable=False)
    description = Column(String)


class DeliveryTicket(Base):
    __tablename__ = "delivery_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_no = Column(String, unique=True, index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    product_type = Column(String, nullable=False)
    gross_weight = Column(Float, nullable=False)
    tare_weight = Column(Float, nullable=False, default=0.0)
    deduction_amount = Column(Float, default=0.0)
    deduction_reason = Column(String)
    quality_grade_id = Column(Integer, ForeignKey("quality_grades.id"))
    market_price = Column(Float)
    delivery_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class FloorPriceAgreement(Base):
    __tablename__ = "floor_price_agreements"

    id = Column(Integer, primary_key=True, index=True)
    agreement_no = Column(String, unique=True, index=True, nullable=False)
    product_type = Column(String, nullable=False)
    floor_price = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=func.now())


class SettlementRecord(Base):
    __tablename__ = "settlement_records"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("delivery_tickets.id"), unique=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    agreement_id = Column(Integer, ForeignKey("floor_price_agreements.id"), nullable=True)
    net_weight = Column(Float)
    adjusted_weight = Column(Float)
    market_price = Column(Float)
    floor_price = Column(Float)
    applied_price = Column(Float)
    price_source = Column(String)
    net_amount = Column(Float)
    floor_difference = Column(Float)
    status = Column(String, default="draft")
    verification_status = Column(String, default="pending")
    verification_note = Column(String)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SettlementChangeLog(Base):
    __tablename__ = "settlement_change_log"

    id = Column(Integer, primary_key=True, index=True)
    settlement_id = Column(Integer, ForeignKey("settlement_records.id"), nullable=False)
    change_type = Column(String, nullable=False)
    field_changed = Column(String, nullable=False)
    old_value = Column(String)
    new_value = Column(String)
    explanation = Column(String)
    operator = Column(String)
    created_at = Column(DateTime, default=func.now())
