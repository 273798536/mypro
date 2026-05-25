from sqlalchemy import Column, String, Integer, DateTime, JSON
from app.models.base import BaseModel


class SmsRecord(BaseModel):
    """短信截图记录"""

    __tablename__ = "sms_records"

    sms_no = Column(String, unique=True, index=True, nullable=False)
    checkin_no = Column(String, index=True)
    order_no = Column(String, index=True)
    guest_name = Column(String)
    guest_phone = Column(String)
    sms_type = Column(String)
    sms_content = Column(String)
    image_path = Column(String, nullable=True)
    sent_time = Column(DateTime)
    sender = Column(String)
    status = Column(String, default="sent")
    operator = Column(String)
    remarks = Column(String, nullable=True)
    batch_no = Column(String, index=True)
