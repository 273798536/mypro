from sqlalchemy import Column, String, Integer, DateTime, Float, Boolean
from app.models.base import BaseModel


class CheckinRecord(BaseModel):
    __tablename__ = "checkin_records"

    checkin_no = Column(String, unique=True, index=True, nullable=False)
    idempotency_key = Column(String, index=True)
    order_no = Column(String, index=True)
    guest_name = Column(String)
    guest_phone = Column(String)
    id_card = Column(String)
    room_no = Column(String, index=True)
    room_type = Column(String)
    checkin_date = Column(DateTime)
    checkout_date = Column(DateTime)
    actual_checkout = Column(DateTime, nullable=True)
    room_rate = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    paid_amount = Column(Float, default=0)
    status = Column(String, default="checked_in")
    source = Column(String)
    is_extended = Column(Boolean, default=False)
    extended_days = Column(Integer, default=0)
    remarks = Column(String, nullable=True)
    batch_no = Column(String, index=True)
