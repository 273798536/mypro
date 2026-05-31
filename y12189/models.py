from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), index=True, nullable=False)
    composer = Column(String(100))
    key = Column(String(20), index=True)
    time_signature = Column(String(20))
    total_pages = Column(Integer, default=1)
    file_path = Column(String(500))
    file_name = Column(String(200))
    file_hash = Column(String(64), index=True)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parts = relationship("Part", back_populates="score", cascade="all, delete-orphan")
    borrow_records = relationship("BorrowRecord", back_populates="score")


class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    score_id = Column(Integer, ForeignKey("scores.id"), nullable=False)
    instrument = Column(String(50), index=True, nullable=False)
    page_start = Column(Integer, default=1)
    page_end = Column(Integer, default=1)
    file_path = Column(String(500))
    remarks = Column(Text)

    score = relationship("Score", back_populates="parts")


class BorrowRecord(Base):
    __tablename__ = "borrow_records"

    id = Column(Integer, primary_key=True, index=True)
    score_id = Column(Integer, ForeignKey("scores.id"), nullable=False)
    borrower = Column(String(100), nullable=False)
    borrowed_at = Column(DateTime, default=datetime.utcnow)
    returned_at = Column(DateTime)
    purpose = Column(String(200))
    remarks = Column(Text)

    score = relationship("Score", back_populates="borrow_records")
