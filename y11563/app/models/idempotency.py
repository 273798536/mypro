from sqlalchemy import Column, String, Integer, DateTime, JSON
from app.models.base import BaseModel


class IdempotencyRecord(BaseModel):
    __tablename__ = "idempotency_records"

    idempotency_key = Column(String, unique=True, index=True, nullable=False)
    request_type = Column(String)
    record_type = Column(String, index=True)
    record_id = Column(String)
    request_hash = Column(String)
    response_data = Column(JSON, nullable=True)
    first_request_time = Column(DateTime)
    last_request_time = Column(DateTime)
    request_count = Column(Integer, default=1)
    process_status = Column(String, default="completed")
    error_message = Column(String, nullable=True)
