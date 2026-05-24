from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Float, Boolean

from app.database import Base
from app.models.base import ImportEvidenceMixin, StatusMixin

class PriceAdjustment(Base, ImportEvidenceMixin, StatusMixin):
    __tablename__ = "price_adjustments"
    
    id = Column(Integer, primary_key=True, index=True)
    adjustment_id = Column(String(100), unique=True, index=True, comment="改价ID")
    branch_id = Column(String(50), nullable=False, comment="网点ID")
    branch_name = Column(String(200), comment="网点名称")
    effective_date = Column(Date, nullable=False, comment="生效日期")
    service_item = Column(String(200), comment="服务项目")
    original_price = Column(Float, comment="原价")
    adjusted_price = Column(Float, comment="调整后价格")
    adjustment_reason = Column(Text, comment="调整原因")
    is_manual = Column(Boolean, default=True, comment="是否手工改价")
    operator = Column(String(100), comment="操作人")
    approver = Column(String(100), comment="审批人")
    approval_status = Column(String(50), default="pending", comment="审批状态")
    remarks = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
