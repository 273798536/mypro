from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Boolean

from app.database import Base
from app.models.base import ImportEvidenceMixin, StatusMixin

class LeaveRequest(Base, ImportEvidenceMixin, StatusMixin):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    leave_id = Column(String(100), unique=True, index=True, comment="请假单ID")
    branch_id = Column(String(50), nullable=False, comment="网点ID")
    branch_name = Column(String(200), comment="网点名称")
    teller_id = Column(String(50), nullable=False, comment="柜员ID")
    teller_name = Column(String(100), comment="柜员姓名")
    leave_type = Column(String(50), comment="请假类型：年假/病假/事假/培训/外出")
    start_date = Column(Date, nullable=False, comment="开始日期")
    end_date = Column(Date, nullable=False, comment="结束日期")
    leave_days = Column(Integer, comment="请假天数")
    reason = Column(Text, comment="请假原因")
    is_training = Column(Boolean, default=False, comment="是否培训外出")
    training_location = Column(String(200), comment="培训地点")
    approver = Column(String(100), comment="审批人")
    approval_time = Column(DateTime, comment="审批时间")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
