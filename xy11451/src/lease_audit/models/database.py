from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from pathlib import Path

Base = declarative_base()


class ImportBatch(Base):
    __tablename__ = "import_batches"
    
    id = Column(Integer, primary_key=True)
    batch_no = Column(String(50), unique=True, nullable=False)
    source_type = Column(String(30), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False)
    imported_by = Column(String(50), nullable=False)
    imported_at = Column(DateTime, default=datetime.now)
    total_records = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    status = Column(String(20), default="processing")
    remark = Column(Text)
    
    records = relationship("ImportRecord", back_populates="batch", cascade="all, delete-orphan")
    failures = relationship("ImportFailure", back_populates="batch", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_batch_no", "batch_no"),
        Index("idx_source_type", "source_type"),
        Index("idx_imported_at", "imported_at"),
    )


class ImportRecord(Base):
    __tablename__ = "import_records"
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    source_type = Column(String(30), nullable=False)
    original_row_no = Column(Integer)
    record_key = Column(String(100))
    data_json = Column(Text, nullable=False)
    data_hash = Column(String(64), nullable=False)
    is_valid = Column(Boolean, default=True)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    batch = relationship("ImportBatch", back_populates="records")
    equipment_lease = relationship("EquipmentLease", back_populates="import_record", uselist=False)
    return_record = relationship("ReturnRecord", back_populates="import_record", uselist=False)
    repair_estimate = relationship("RepairEstimate", back_populates="import_record", uselist=False)
    handover = relationship("StoreHandover", back_populates="import_record", uselist=False)
    photo = relationship("ReturnPhoto", back_populates="import_record", uselist=False)
    
    __table_args__ = (
        Index("idx_record_key", "record_key"),
        Index("idx_source_row", "source_type", "original_row_no"),
    )


class ImportFailure(Base):
    __tablename__ = "import_failures"
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    original_row_no = Column(Integer)
    error_type = Column(String(50))
    error_message = Column(Text)
    original_data = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(50))
    
    batch = relationship("ImportBatch", back_populates="failures")
    
    __table_args__ = (
        Index("idx_resolved", "resolved"),
        Index("idx_error_type", "error_type"),
    )


class EquipmentLease(Base):
    __tablename__ = "equipment_leases"
    
    id = Column(Integer, primary_key=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    lease_no = Column(String(50), unique=True, nullable=False)
    customer_name = Column(String(100))
    customer_phone = Column(String(30))
    equipment_name = Column(String(100))
    equipment_model = Column(String(50))
    serial_no = Column(String(50))
    lease_start_date = Column(DateTime)
    expected_return_date = Column(DateTime)
    deposit_amount = Column(Float, default=0)
    monthly_rent = Column(Float, default=0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    import_record = relationship("ImportRecord", back_populates="equipment_lease")
    returns = relationship("ReturnRecord", back_populates="lease")
    repairs = relationship("RepairEstimate", back_populates="lease")
    
    __table_args__ = (
        Index("idx_lease_no", "lease_no"),
        Index("idx_customer", "customer_name"),
        Index("idx_status", "status"),
    )


class ReturnRecord(Base):
    __tablename__ = "return_records"
    
    id = Column(Integer, primary_key=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    lease_id = Column(Integer, ForeignKey("equipment_leases.id"))
    return_no = Column(String(50), unique=True, nullable=False)
    lease_no = Column(String(50))
    customer_name = Column(String(100))
    return_date = Column(DateTime)
    returned_by = Column(String(50))
    received_by = Column(String(50))
    store_location = Column(String(100))
    total_deposit_deduction = Column(Float, default=0)
    actual_refund = Column(Float, default=0)
    status = Column(String(20), default="pending")
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    import_record = relationship("ImportRecord", back_populates="return_record")
    lease = relationship("EquipmentLease", back_populates="returns")
    items = relationship("ReturnItem", back_populates="return_record", cascade="all, delete-orphan")
    photos = relationship("ReturnPhoto", back_populates="return_record")
    handovers = relationship("StoreHandover", back_populates="return_record")
    
    __table_args__ = (
        Index("idx_return_no", "return_no"),
        Index("idx_lease_return", "lease_no"),
        Index("idx_return_date", "return_date"),
    )


class ReturnItem(Base):
    __tablename__ = "return_items"
    
    id = Column(Integer, primary_key=True)
    return_record_id = Column(Integer, ForeignKey("return_records.id"), nullable=False)
    item_name = Column(String(100), nullable=False)
    item_type = Column(String(50))
    serial_no = Column(String(50))
    expected_quantity = Column(Integer, default=1)
    returned_quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0)
    deposit_deduction = Column(Float, default=0)
    deduction_reason = Column(String(255))
    condition = Column(String(50))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    
    return_record = relationship("ReturnRecord", back_populates="items")
    
    __table_args__ = (
        Index("idx_return_item", "return_record_id", "item_name"),
    )


class ReturnPhoto(Base):
    __tablename__ = "return_photos"
    
    id = Column(Integer, primary_key=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    return_record_id = Column(Integer, ForeignKey("return_records.id"))
    photo_no = Column(String(50), unique=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    file_hash = Column(String(64))
    photo_type = Column(String(50))
    taken_at = Column(DateTime)
    uploaded_by = Column(String(50))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    
    import_record = relationship("ImportRecord", back_populates="photo")
    return_record = relationship("ReturnRecord", back_populates="photos")
    
    __table_args__ = (
        Index("idx_photo_return", "return_record_id"),
        Index("idx_photo_type", "photo_type"),
    )


class RepairEstimate(Base):
    __tablename__ = "repair_estimates"
    
    id = Column(Integer, primary_key=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    lease_id = Column(Integer, ForeignKey("equipment_leases.id"))
    estimate_no = Column(String(50), unique=True, nullable=False)
    lease_no = Column(String(50))
    equipment_name = Column(String(100))
    serial_no = Column(String(50))
    customer_name = Column(String(100))
    damage_description = Column(Text)
    estimated_cost = Column(Float, default=0)
    labor_cost = Column(Float, default=0)
    parts_cost = Column(Float, default=0)
    total_cost = Column(Float, default=0)
    estimated_by = Column(String(50))
    estimated_at = Column(DateTime)
    status = Column(String(20), default="pending")
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    import_record = relationship("ImportRecord", back_populates="repair_estimate")
    lease = relationship("EquipmentLease", back_populates="repairs")
    
    __table_args__ = (
        Index("idx_estimate_no", "estimate_no"),
        Index("idx_lease_estimate", "lease_no"),
    )


class StoreHandover(Base):
    __tablename__ = "store_handovers"
    
    id = Column(Integer, primary_key=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    return_record_id = Column(Integer, ForeignKey("return_records.id"))
    handover_no = Column(String(50), unique=True, nullable=False)
    return_no = Column(String(50))
    lease_no = Column(String(50))
    customer_name = Column(String(100))
    handover_date = Column(DateTime)
    handed_over_by = Column(String(50))
    received_by = Column(String(50))
    store_location = Column(String(100))
    items_list = Column(Text)
    issues_found = Column(Text)
    signature_customer = Column(String(100))
    signature_store = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    
    import_record = relationship("ImportRecord", back_populates="handover")
    return_record = relationship("ReturnRecord", back_populates="handovers")
    
    __table_args__ = (
        Index("idx_handover_no", "handover_no"),
        Index("idx_return_handover", "return_no"),
    )


class OperationLog(Base):
    __tablename__ = "operation_logs"
    
    id = Column(Integer, primary_key=True)
    operation_type = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    old_value = Column(Text)
    new_value = Column(Text)
    operated_by = Column(String(50))
    operated_at = Column(DateTime, default=datetime.now)
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    remark = Column(Text)
    
    __table_args__ = (
        Index("idx_operation_type", "operation_type"),
        Index("idx_entity", "entity_type", "entity_id"),
        Index("idx_operated_at", "operated_at"),
    )


class SystemConfig(Base):
    __tablename__ = "system_configs"
    
    id = Column(Integer, primary_key=True)
    config_key = Column(String(100), unique=True, nullable=False)
    config_value = Column(Text)
    description = Column(String(255))
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    updated_by = Column(String(50))


def init_database(db_path: str) -> None:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(engine)


def get_session(db_path: str):
    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)
    return Session()
