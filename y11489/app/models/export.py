from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    export_no = Column(String, unique=True, index=True, nullable=False)
    export_type = Column(String, nullable=False)
    
    criteria = Column(JSON)
    record_count = Column(Integer, default=0)
    
    is_sensitive_masked = Column(Integer, default=1)
    include_raw_data = Column(Integer, default=0)
    include_change_history = Column(Integer, default=0)
    
    file_path = Column(String)
    file_hash = Column(String)
    file_size = Column(Integer)
    
    exported_by = Column(Integer, ForeignKey("users.id"))
    exported_at = Column(DateTime(timezone=True), server_default=func.now())
    
    frozen_at = Column(DateTime(timezone=True))
    frozen_by = Column(Integer, ForeignKey("users.id"))
    
    status = Column(String, default="completed")
    error_message = Column(Text)

    exporter = relationship("User", foreign_keys=[exported_by])
    freezer = relationship("User", foreign_keys=[frozen_by])
