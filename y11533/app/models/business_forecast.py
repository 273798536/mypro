from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Float

from app.database import Base
from app.models.base import ImportEvidenceMixin, StatusMixin

class BusinessForecast(Base, ImportEvidenceMixin, StatusMixin):
    __tablename__ = "business_forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(String(100), unique=True, index=True, comment="预测ID")
    branch_id = Column(String(50), nullable=False, comment="网点ID")
    branch_name = Column(String(200), comment="网点名称")
    forecast_date = Column(Date, nullable=False, comment="预测日期")
    time_slot = Column(String(50), comment="时间段：上午/下午/全天/整点")
    customer_count = Column(Integer, comment="预测客户数")
    transaction_count = Column(Integer, comment="预测业务笔数")
    window_demand = Column(Float, comment="窗口需求数")
    service_type = Column(String(100), comment="业务类型")
    confidence_level = Column(Float, comment="置信度")
    forecast_method = Column(String(100), comment="预测方法")
    remarks = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
