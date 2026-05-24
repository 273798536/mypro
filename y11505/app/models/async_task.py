from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, JSON
from datetime import datetime

from app.core.database import Base
from app.core.constants import TaskStatus


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(String, primary_key=True, index=True)
    task_name = Column(String, nullable=False, index=True)
    task_type = Column(String, nullable=False)
    
    batch_id = Column(String, nullable=True, index=True)
    record_id = Column(String, nullable=True)
    
    status = Column(String, default=TaskStatus.PENDING, index=True)
    
    payload = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    
    error_message = Column(Text, nullable=True)
    error_trace = Column(Text, nullable=True)
    
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    last_run_time = Column(DateTime, nullable=True)
    next_run_time = Column(DateTime, nullable=True)
    
    operator = Column(String, nullable=True)
    
    is_cancelled = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
