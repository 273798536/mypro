from sqlalchemy import Column, String, Integer, DateTime, Float, JSON
from app.models.base import BaseModel


class HandoverRecord(BaseModel):
    """门店交接记录"""

    __tablename__ = "handover_records"

    handover_no = Column(String, unique=True, index=True, nullable=False)
    shift_type = Column(String)
    handover_date = Column(DateTime)
    operator_out = Column(String)
    operator_in = Column(String)
    room_count = Column(Integer, default=0)
    checkin_count = Column(Integer, default=0)
    checkout_count = Column(Integer, default=0)
    total_cash = Column(Float, default=0)
    total_card = Column(Float, default=0)
    total_online = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    issues = Column(JSON, nullable=True)
    remarks = Column(String, nullable=True)
    batch_no = Column(String, index=True)
    status = Column(String, default="pending")
