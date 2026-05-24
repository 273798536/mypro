from sqlalchemy import Column, String, Integer, DateTime, Float
from app.models.base import BaseModel


class DepositRecord(BaseModel):
    __tablename__ = "deposit_records"

    deposit_no = Column(String, unique=True, index=True, nullable=False)
    idempotency_key = Column(String, index=True)
    checkin_no = Column(String, index=True)
    order_no = Column(String, index=True)
    guest_name = Column(String)
    amount = Column(Float, default=0)
    payment_method = Column(String)
    transaction_type = Column(String)
    transaction_time = Column(DateTime)
    operator = Column(String)
    status = Column(String, default="success")
    remarks = Column(String, nullable=True)
    batch_no = Column(String, index=True)
