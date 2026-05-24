from sqlalchemy import Column, String, Integer, DateTime, Boolean, JSON
from app.models.base import BaseModel


class ExportSnapshot(BaseModel):
    __tablename__ = "export_snapshots"

    snapshot_no = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True)
    export_type = Column(String)
    file_path = Column(String)
    file_name = Column(String)
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime, nullable=True)
    frozen_by = Column(String, nullable=True)
    record_count = Column(Integer, default=0)
    checksum = Column(String)
    exported_by = Column(String)
    exported_at = Column(DateTime)
    snapshot_data = Column(JSON, nullable=True)
    remarks = Column(String, nullable=True)
