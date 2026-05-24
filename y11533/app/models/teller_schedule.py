from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Text, Boolean

from app.database import Base
from app.models.base import ImportEvidenceMixin, StatusMixin

class TellerSchedule(Base, ImportEvidenceMixin, StatusMixin):
    __tablename__ = "teller_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(String(100), unique=True, index=True, comment="排班ID")
    branch_id = Column(String(50), nullable=False, comment="网点ID")
    branch_name = Column(String(200), comment="网点名称")
    teller_id = Column(String(50), nullable=False, comment="柜员ID")
    teller_name = Column(String(100), comment="柜员姓名")
    schedule_date = Column(Date, nullable=False, comment="排班日期")
    shift_type = Column(String(50), comment="班次类型：早班/中班/晚班/全天")
    window_number = Column(String(20), comment="窗口号")
    start_time = Column(Time, comment="开始时间")
    end_time = Column(Time, comment="结束时间")
    break_start = Column(Time, comment="午休开始时间")
    break_end = Column(Time, comment="午休结束时间")
    is_temporary = Column(Boolean, default=False, comment="是否临时排班")
    temporary_reason = Column(String(500), comment="临时排班原因：培训/外出/其他")
    remarks = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
