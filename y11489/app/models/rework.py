from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.states import RecordStatus


class ReworkOrder(Base):
    __tablename__ = "rework_orders"

    id = Column(Integer, primary_key=True, index=True)
    rework_no = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True)
    product_code = Column(String)
    product_name = Column(String)
    
    original_inspection_id = Column(Integer, ForeignKey("inspection_records.id"))
    rework_reason = Column(Text)
    defect_type = Column(String)
    
    rework_count = Column(Integer, default=0)
    rework_pass_count = Column(Integer, default=0)
    rework_fail_count = Column(Integer, default=0)
    
    responsible_shift_id = Column(Integer, ForeignKey("machine_shifts.id"))
    responsible_person = Column(Integer, ForeignKey("users.id"))
    handler = Column(Integer, ForeignKey("users.id"))
    
    status = Column(Enum(RecordStatus), default=RecordStatus.DRAFT, nullable=False)
    version = Column(Integer, default=1)
    is_manual_adjustment = Column(Integer, default=0)
    adjustment_reason = Column(Text)
    
    import_source_id = Column(Integer, ForeignKey("import_sources.id"))
    original_row_number = Column(Integer)
    raw_data = Column(Text)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    final_yield_rate = Column(String)
    rework_times = Column(Integer, default=1)

    original_inspection = relationship("InspectionRecord", foreign_keys=[original_inspection_id])
    responsible_shift = relationship("MachineShift", foreign_keys=[responsible_shift_id])
    responsible_user = relationship("User", foreign_keys=[responsible_person])
    handler_user = relationship("User", foreign_keys=[handler])
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    import_source = relationship("ImportSource")
