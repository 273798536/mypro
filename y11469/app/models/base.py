from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from datetime import datetime
from app.core.database import Base


class ImportEvidenceMixin:
    source_file = Column(String(500), nullable=False, comment="来源文件名")
    source_row_number = Column(Integer, nullable=False, comment="原始行号")
    original_raw_data = Column(Text, nullable=False, comment="原始数据JSON")
    import_batch_id = Column(String(100), nullable=False, comment="导入批次ID")
    imported_at = Column(DateTime, default=datetime.utcnow, comment="导入时间")
    imported_by = Column(String(100), nullable=False, comment="导入人")


class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
