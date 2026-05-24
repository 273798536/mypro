from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class MachineShift(Base):
    __tablename__ = "machine_shifts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True, nullable=False)
    shift_name = Column(String, nullable=False)
    shift_date = Column(Date, index=True, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    
    shift_leader = Column(Integer, ForeignKey("users.id"))
    operator = Column(Integer, ForeignKey("users.id"))
    
    total_output = Column(Integer, default=0)
    defect_output = Column(Integer, default=0)
    rework_count = Column(Integer, default=0)
    
    import_source_id = Column(Integer, ForeignKey("import_sources.id"))
    original_row_number = Column(Integer)
    raw_data = Column(String)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    shift_leader_user = relationship("User", foreign_keys=[shift_leader])
    operator_user = relationship("User", foreign_keys=[operator])
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    import_source = relationship("ImportSource")
