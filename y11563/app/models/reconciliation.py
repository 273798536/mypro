from sqlalchemy import Column, String, Integer, DateTime, Float, Boolean, JSON
from app.models.base import BaseModel


class ReconciliationResult(BaseModel):
    __tablename__ = "reconciliation_results"

    reconciliation_no = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True)
    checkin_no = Column(String, index=True)
    reconciliation_type = Column(String)
    status = Column(String, default="pending")
    is_matched = Column(Boolean, default=False)
    expected_amount = Column(Float, default=0)
    actual_amount = Column(Float, default=0)
    diff_amount = Column(Float, default=0)
    diff_details = Column(JSON, nullable=True)
    issues = Column(JSON, nullable=True)
    operator = Column(String)
    reconciliation_time = Column(DateTime)
    is_manually_adjusted = Column(Boolean, default=False)
    adjust_reason = Column(String, nullable=True)
    adjusted_by = Column(String, nullable=True)
    adjustment_time = Column(DateTime, nullable=True)
    remarks = Column(String, nullable=True)
