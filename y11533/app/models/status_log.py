from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Index

from app.database import Base

class StatusLog(Base):
    __tablename__ = "status_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(String(100), unique=True, index=True, comment="日志ID")
    entity_type = Column(String(50), nullable=False, comment="实体类型：schedule/leave/forecast/adjustment/record/task")
    entity_id = Column(String(100), nullable=False, comment="实体ID")
    old_status = Column(String(50), comment="旧状态")
    new_status = Column(String(50), nullable=False, comment="新状态")
    change_reason = Column(Text, comment="变更原因")
    operator = Column(String(100), nullable=False, comment="操作人")
    operator_role = Column(String(50), comment="操作人角色")
    change_time = Column(DateTime, default=datetime.now, nullable=False, comment="变更时间")
    extra_info = Column(Text, comment="附加信息(JSON)")
    
    __table_args__ = (
        Index('idx_entity_type_id', 'entity_type', 'entity_id'),
        Index('idx_change_time', 'change_time'),
    )
