from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.states import RecordStatus


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, index=True, nullable=False)
    product_code = Column(String, index=True)
    product_name = Column(String)
    machine_id = Column(String, index=True)
    shift_id = Column(Integer, ForeignKey("machine_shifts.id"))
    inspector = Column(Integer, ForeignKey("users.id"))
    
    sample_size = Column(Integer)
    defect_count = Column(Integer, default=0)
    pass_count = Column(Integer, default=0)
    yield_rate = Column(Float)
    
    defect_type = Column(String)
    defect_description = Column(Text)
    
    status = Column(Enum(RecordStatus), default=RecordStatus.DRAFT, nullable=False)
    version = Column(Integer, default=1)
    is_manual_adjustment = Column(Boolean, default=False)
    adjustment_reason = Column(Text)
    
    import_source_id = Column(Integer, ForeignKey("import_sources.id"))
    original_row_number = Column(Integer)
    raw_data = Column(Text)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    original_yield_rate = Column(Float)
    original_defect_count = Column(Integer)
    judge_result = Column(String)
    final_judge = Column(String)
    
    rework_count = Column(Integer, default=0)

    shift = relationship("MachineShift", foreign_keys=[shift_id])
    inspector_user = relationship("User", foreign_keys=[inspector])
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    import_source = relationship("ImportSource")
