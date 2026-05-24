from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class ImportBatch(Base):
    __tablename__ = "import_batches"
    
    id = Column(Integer, primary_key=True)
    batch_no = Column(String(50), unique=True, nullable=False, index=True)
    source_type = Column(String(20), nullable=False, index=True)
    source_file = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    imported_by = Column(String(100), default="system")
    imported_at = Column(DateTime, default=datetime.now)
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    status = Column(String(20), default="imported")
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime)
    frozen_by = Column(String(100))
    remark = Column(Text)
    parent_batch_id = Column(Integer, ForeignKey("import_batches.id"))
    
    parent_batch = relationship("ImportBatch", remote_side=[id])
    records = relationship("ImportRecord", back_populates="batch", cascade="all, delete-orphan")


class ImportRecord(Base):
    __tablename__ = "import_records"
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False, index=True)
    source_row = Column(Integer, nullable=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime)
    deleted_reason = Column(String(500))
    reimport_count = Column(Integer, default=0)
    last_reimport_at = Column(DateTime)
    
    batch = relationship("ImportBatch", back_populates="records")
    raw_data = relationship("RawData", uselist=False, back_populates="record", cascade="all, delete-orphan")
    std_data = relationship("StandardData", uselist=False, back_populates="record", cascade="all, delete-orphan")
    checks = relationship("CheckResult", back_populates="record", cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="record", cascade="all, delete-orphan")


class RawData(Base):
    __tablename__ = "raw_data"
    
    id = Column(Integer, primary_key=True)
    record_id = Column(Integer, ForeignKey("import_records.id"), unique=True, nullable=False, index=True)
    raw_json = Column(Text, nullable=False)
    source_file = Column(String(500), nullable=False)
    source_row = Column(Integer, nullable=False)
    
    record = relationship("ImportRecord", back_populates="raw_data")


class StandardData(Base):
    __tablename__ = "standard_data"
    
    id = Column(Integer, primary_key=True)
    record_id = Column(Integer, ForeignKey("import_records.id"), unique=True, nullable=False, index=True)
    data_type = Column(String(20), nullable=False, index=True)
    
    order_no = Column(String(100), index=True)
    store_code = Column(String(50), index=True)
    store_name = Column(String(200))
    product_code = Column(String(50), index=True)
    product_name = Column(String(200))
    quantity = Column(Float)
    unit = Column(String(20))
    price = Column(Float)
    amount = Column(Float)
    
    driver_name = Column(String(100))
    driver_phone = Column(String(20))
    vehicle_no = Column(String(50))
    
    delivery_date = Column(DateTime, index=True)
    sign_date = Column(DateTime)
    second_confirm_date = Column(DateTime)
    
    sign_person = Column(String(100))
    sign_remark = Column(Text)
    
    is_credit = Column(Boolean, default=False)
    credit_amount = Column(Float)
    credit_due_date = Column(DateTime)
    
    is_substitute = Column(Boolean, default=False)
    substitute_from = Column(String(200))
    substitute_to = Column(String(200))
    
    status = Column(String(20), default="pending")
    
    record = relationship("ImportRecord", back_populates="std_data")


class CheckResult(Base):
    __tablename__ = "check_results"
    
    id = Column(Integer, primary_key=True)
    record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False, index=True)
    check_type = Column(String(50), nullable=False)
    check_item = Column(String(100), nullable=False)
    is_passed = Column(Boolean, nullable=False)
    message = Column(String(500))
    severity = Column(String(20), default="error")
    checked_at = Column(DateTime, default=datetime.now)
    checked_by = Column(String(100), default="system")
    
    is_overridden = Column(Boolean, default=False)
    override_reason = Column(String(500))
    overridden_by = Column(String(100))
    overridden_at = Column(DateTime)
    
    record = relationship("ImportRecord", back_populates="checks")


class Correction(Base):
    __tablename__ = "corrections"
    
    id = Column(Integer, primary_key=True)
    record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    corrected_by = Column(String(100), default="manual")
    corrected_at = Column(DateTime, default=datetime.now)
    correction_reason = Column(String(500))
    is_applied = Column(Boolean, default=True)
    
    record = relationship("ImportRecord", back_populates="corrections")


class ExportLog(Base):
    __tablename__ = "export_logs"
    
    id = Column(Integer, primary_key=True)
    export_no = Column(String(50), unique=True, nullable=False)
    export_type = Column(String(50), nullable=False)
    batch_ids = Column(Text)
    exported_at = Column(DateTime, default=datetime.now)
    exported_by = Column(String(100), default="system")
    export_file = Column(String(500))
    record_count = Column(Integer, default=0)
    remark = Column(Text)


Index("idx_record_check", CheckResult.record_id, CheckResult.check_type)
Index("idx_std_order", StandardData.data_type, StandardData.order_no)
Index("idx_std_store_date", StandardData.data_type, StandardData.store_code, StandardData.delivery_date)
