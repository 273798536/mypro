from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean

from app.database import Base

class AutomationCheck(Base):
    __tablename__ = "automation_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    check_id = Column(String(100), unique=True, index=True, comment="检查ID")
    check_type = Column(String(50), nullable=False, comment="检查类型：duplicate_import/permission_intercept/exception_preserve/restart_history/export_consistency")
    check_name = Column(String(200), comment="检查名称")
    
    target_entity = Column(String(100), comment="目标实体")
    target_id = Column(String(100), comment="目标ID")
    
    is_passed = Column(Boolean, default=False, comment="是否通过")
    check_result = Column(Text, comment="检查结果(JSON)")
    check_details = Column(Text, comment="检查详情")
    
    check_time = Column(DateTime, default=datetime.now)
    checked_by = Column(String(100), comment="检查人/系统")
    
    before_restart_data = Column(Text, comment="重启前数据(JSON)")
    after_restart_data = Column(Text, comment="重启后数据(JSON)")
