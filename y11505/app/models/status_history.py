from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class StatusHistory(Base):
    __tablename__ = "status_histories"

    id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), index=True)
    
    record_type = Column(String, nullable=False)
    record_id = Column(String, nullable=True)
    
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    
    change_reason = Column(Text, nullable=True)
    operator = Column(String, nullable=False)
    
    change_time = Column(DateTime, default=datetime.now)
    
    batch = relationship("Batch", back_populates="status_histories")
