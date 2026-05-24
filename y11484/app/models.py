from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SampleLabel(Base):
    __tablename__ = "sample_labels"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, index=True, unique=True)
    product_name = Column(String)
    production_time = Column(DateTime)
    sample_time = Column(DateTime)
    sampler = Column(String)
    storage_location = Column(String)
    status = Column(String, default="draft")
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    temperature_records = relationship("TemperatureRecord", back_populates="sample_label")
    scan_records = relationship("ScanRecord", back_populates="sample_label")
    audit_logs = relationship("AuditLog", back_populates="sample_label")
    complaints = relationship("StoreComplaint", back_populates="sample_label")


class TemperatureRecord(Base):
    __tablename__ = "temperature_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_label_id = Column(Integer, ForeignKey("sample_labels.id"))
    record_time = Column(DateTime)
    temperature = Column(Float)
    recorder = Column(String)
    status = Column(String, default="draft")
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    sample_label = relationship("SampleLabel", back_populates="temperature_records")


class StoreComplaint(Base):
    __tablename__ = "store_complaints"

    id = Column(Integer, primary_key=True, index=True)
    sample_label_id = Column(Integer, ForeignKey("sample_labels.id"))
    store_id = Column(String)
    store_name = Column(String)
    complaint_type = Column(String)
    complaint_desc = Column(Text)
    complaint_time = Column(DateTime)
    handler = Column(String)
    status = Column(String, default="draft")
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    sample_label = relationship("SampleLabel", back_populates="complaints")


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_label_id = Column(Integer, ForeignKey("sample_labels.id"))
    store_id = Column(String)
    store_name = Column(String)
    scan_time = Column(DateTime)
    scanner = Column(String)
    quantity = Column(Integer)
    status = Column(String, default="draft")
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    sample_label = relationship("SampleLabel", back_populates="scan_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    sample_label_id = Column(Integer, ForeignKey("sample_labels.id"))
    action_type = Column(String)
    old_status = Column(String)
    new_status = Column(String)
    change_reason = Column(Text)
    operator = Column(String)
    operator_role = Column(String)
    sensitive_fields_changed = Column(Text)
    ip_address = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    sample_label = relationship("SampleLabel", back_populates="audit_logs")


class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String)
    source_data = Column(Text)
    error_message = Column(Text)
    failed_at = Column(DateTime, server_default=func.now())
    processed = Column(Boolean, default=False)
