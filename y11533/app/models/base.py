from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean

from app.database import Base

class ImportEvidenceMixin:
    source_file = Column(String(500), nullable=False, comment="来源文件名")
    source_row_number = Column(Integer, nullable=False, comment="原始行号")
    raw_value = Column(Text, comment="原始值(JSON)")
    parsed_value = Column(Text, comment="解析后标准值(JSON)")
    import_batch_id = Column(String(100), nullable=False, comment="导入批次号")
    import_time = Column(DateTime, default=datetime.now, comment="导入时间")
    is_manual_modified = Column(Boolean, default=False, comment="是否人工改判")
    modified_by = Column(String(100), comment="改判人")
    modified_time = Column(DateTime, comment="改判时间")
    modified_reason = Column(Text, comment="改判原因")

class StatusMixin:
    status = Column(String(50), default="pending", comment="状态")
    status_updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    status_updated_by = Column(String(100), comment="状态更新人")
    status_reason = Column(Text, comment="状态变更原因")
