from sqlalchemy import Column, String, Integer, DateTime, Float
from app.models.base import BaseModel


class RoomChangeRecord(BaseModel):
    __tablename__ = "room_change_records"

    change_no = Column(String, unique=True, index=True, nullable=False)
    idempotency_key = Column(String, index=True)
    checkin_no = Column(String, index=True)
    order_no = Column(String, index=True)
    guest_name = Column(String)
    old_room_no = Column(String)
    new_room_no = Column(String)
    old_room_type = Column(String)
    new_room_type = Column(String)
    old_rate = Column(Float, default=0)
    new_rate = Column(Float, default=0)
    rate_diff = Column(Float, default=0)
    change_time = Column(DateTime)
    change_reason = Column(String)
    operator = Column(String)
    status = Column(String, default="completed")
    remarks = Column(String, nullable=True)
    batch_no = Column(String, index=True)
