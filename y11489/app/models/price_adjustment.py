from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.states import RecordStatus


class PriceAdjustment(Base):
    __tablename__ = "price_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    adjustment_no = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True)
    product_code = Column(String)
    product_name = Column(String)
    
    original_price = Column(Float)
    adjusted_price = Column(Float)
    price_difference = Column(Float)
    
    rework_order_id = Column(Integer, ForeignKey("rework_orders.id"))
    inspection_id = Column(Integer, ForeignKey("inspection_records.id"))
    
    adjustment_reason = Column(Text)
    adjustment_type = Column(String)
    
    handler = Column(Integer, ForeignKey("users.id"))
    approver = Column(Integer, ForeignKey("users.id"))
    
    status = Column(Enum(RecordStatus), default=RecordStatus.DRAFT, nullable=False)
    version = Column(Integer, default=1)
    
    import_source_id = Column(Integer, ForeignKey("import_sources.id"))
    original_row_number = Column(Integer)
    raw_data = Column(String)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    sensitive_fields_masked = Column(Integer, default=0)

    rework_order = relationship("ReworkOrder")
    inspection = relationship("InspectionRecord")
    handler_user = relationship("User", foreign_keys=[handler])
    approver_user = relationship("User", foreign_keys=[approver])
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    import_source = relationship("ImportSource")
