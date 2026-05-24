from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Text, Boolean

from app.database import Base
from app.models.base import ImportEvidenceMixin, StatusMixin

class ShiftRecord(Base, ImportEvidenceMixin, StatusMixin):
    __tablename__ = "shift_records"
    
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(100), unique=True, index=True, comment="记录ID")
    branch_id = Column(String(50), nullable=False, comment="网点ID")
    branch_name = Column(String(200), comment="网点名称")
    teller_id = Column(String(50), nullable=False, comment="柜员ID")
    teller_name = Column(String(100), comment="柜员姓名")
    record_date = Column(Date, nullable=False, comment="记录日期")
    window_number = Column(String(20), comment="窗口号")
    actual_start_time = Column(Time, comment="实际签到时间")
    actual_end_time = Column(Time, comment="实际签退时间")
    actual_break_start = Column(Time, comment="实际午休开始")
    actual_break_end = Column(Time, comment="实际午休结束")
    is_late = Column(Boolean, default=False, comment="是否迟到")
    is_leave_early = Column(Boolean, default=False, comment="是否早退")
    transaction_count = Column(Integer, comment="办理业务笔数")
    remarks = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
