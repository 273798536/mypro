from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Mold(Base):
    __tablename__ = "molds"

    id = Column(Integer, primary_key=True, index=True)
    mold_no = Column(String, unique=True, index=True, nullable=False)
    mold_name = Column(String)
    spec = Column(String)
    status = Column(String, default="idle")
    created_at = Column(DateTime, default=datetime.utcnow)

    borrow_records = relationship("BorrowRecord", back_populates="mold")


class BorrowRecord(Base):
    __tablename__ = "borrow_records"

    id = Column(Integer, primary_key=True, index=True)
    mold_id = Column(Integer, ForeignKey("molds.id"))
    mold_no = Column(String, index=True, nullable=False)
    workshop = Column(String, nullable=False)
    borrower = Column(String)
    borrow_date = Column(DateTime, default=datetime.utcnow)
    expected_return_date = Column(DateTime)
    actual_return_date = Column(DateTime)
    status = Column(String, default="borrowed")
    is_overdue = Column(Integer, default=0)
    maintenance_done = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    mold = relationship("Mold", back_populates="borrow_records")
    maintenance_records = relationship("MaintenanceRecord", back_populates="borrow_record")
    return_records = relationship("ReturnRecord", back_populates="borrow_record")
    missing_parts = relationship("MissingPart", back_populates="borrow_record")
    compensation_records = relationship("CompensationRecord", back_populates="borrow_record")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    borrow_record_id = Column(Integer, ForeignKey("borrow_records.id"))
    mold_no = Column(String, index=True)
    maintenance_date = Column(DateTime, default=datetime.utcnow)
    maintenance_content = Column(Text)
    maintenance_person = Column(String)
    maintenance_status = Column(String, default="done")
    created_at = Column(DateTime, default=datetime.utcnow)

    borrow_record = relationship("BorrowRecord", back_populates="maintenance_records")


class ReturnRecord(Base):
    __tablename__ = "return_records"

    id = Column(Integer, primary_key=True, index=True)
    borrow_record_id = Column(Integer, ForeignKey("borrow_records.id"))
    mold_no = Column(String, index=True)
    return_date = Column(DateTime, default=datetime.utcnow)
    photo_url = Column(String)
    photo_description = Column(Text)
    wear_level = Column(String)
    checker = Column(String)
    check_result = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    borrow_record = relationship("BorrowRecord", back_populates="return_records")


class MissingPart(Base):
    __tablename__ = "missing_parts"

    id = Column(Integer, primary_key=True, index=True)
    borrow_record_id = Column(Integer, ForeignKey("borrow_records.id"))
    mold_no = Column(String, index=True)
    part_name = Column(String, nullable=False)
    part_quantity = Column(Integer, default=1)
    part_value = Column(Float)
    found_date = Column(DateTime, default=datetime.utcnow)
    reporter = Column(String)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    borrow_record = relationship("BorrowRecord", back_populates="missing_parts")


class CompensationRecord(Base):
    __tablename__ = "compensation_records"

    id = Column(Integer, primary_key=True, index=True)
    borrow_record_id = Column(Integer, ForeignKey("borrow_records.id"))
    mold_no = Column(String, index=True)
    compensation_reason = Column(Text)
    compensation_amount = Column(Float, nullable=False)
    compensation_party = Column(String)
    compensation_status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    borrow_record = relationship("BorrowRecord", back_populates="compensation_records")
