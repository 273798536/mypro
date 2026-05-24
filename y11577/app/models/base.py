from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class BaseModel(Base):
    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class IdempotentModel(BaseModel):
    __abstract__ = True

    idempotent_key = Column(String(255), unique=True, index=True, nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    remark = Column(Text, nullable=True)
    metadata_ = Column(JSONB, default=dict)

    __mapper_args__ = {
        'eager_defaults': True
    }
