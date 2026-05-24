from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./outsourcing.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String, index=True)
    batch_no = Column(String, index=True)
    product_name = Column(String)
    product_code = Column(String)
    quantity = Column(Float)
    unit = Column(String)
    delivery_date = Column(String)
    supplier = Column(String)
    workshop = Column(String)
    receiver = Column(String)
    remark = Column(Text)
    raw_data = Column(Text)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    dirty_reason = Column(String)
    fix_suggestion = Column(String)
    is_fixed = Column(Boolean, default=False)
    fixed_by = Column(String)
    fixed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RepairRecord(Base):
    __tablename__ = "repair_records"
    
    id = Column(Integer, primary_key=True, index=True)
    repair_no = Column(String, index=True)
    batch_no = Column(String, index=True)
    product_name = Column(String)
    product_code = Column(String)
    repair_type = Column(String)
    repair_quantity = Column(Float)
    return_quantity = Column(Float)
    unit = Column(String)
    repair_date = Column(String)
    return_date = Column(String)
    supplier = Column(String)
    defect_reason = Column(String)
    responsible_party = Column(String)
    raw_data = Column(Text)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    dirty_reason = Column(String)
    fix_suggestion = Column(String)
    is_fixed = Column(Boolean, default=False)
    fixed_by = Column(String)
    fixed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DeductionDetail(Base):
    __tablename__ = "deduction_details"
    
    id = Column(Integer, primary_key=True, index=True)
    deduction_no = Column(String, index=True)
    batch_no = Column(String, index=True)
    product_name = Column(String)
    product_code = Column(String)
    deduction_type = Column(String)
    quantity = Column(Float)
    unit_price = Column(Float)
    amount = Column(Float)
    deduction_date = Column(String)
    supplier = Column(String)
    reason = Column(String)
    related_order = Column(String)
    raw_data = Column(Text)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    dirty_reason = Column(String)
    fix_suggestion = Column(String)
    is_fixed = Column(Boolean, default=False)
    fixed_by = Column(String)
    fixed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RefundFlow(Base):
    __tablename__ = "refund_flows"
    
    id = Column(Integer, primary_key=True, index=True)
    refund_no = Column(String, index=True)
    batch_no = Column(String, index=True)
    related_deduction = Column(String)
    amount = Column(Float)
    refund_date = Column(String)
    supplier = Column(String)
    reason = Column(String)
    payment_method = Column(String)
    raw_data = Column(Text)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    dirty_reason = Column(String)
    fix_suggestion = Column(String)
    is_fixed = Column(Boolean, default=False)
    fixed_by = Column(String)
    fixed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ReconciliationResult(Base):
    __tablename__ = "reconciliation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    recon_no = Column(String, index=True)
    batch_no = Column(String, index=True)
    product_name = Column(String)
    product_code = Column(String)
    supplier = Column(String)
    total_delivery_qty = Column(Float)
    total_repair_qty = Column(Float)
    total_return_qty = Column(Float)
    total_deduction_amount = Column(Float)
    total_refund_amount = Column(Float)
    net_settlement = Column(Float)
    has_discrepancy = Column(Boolean, default=False)
    discrepancy_type = Column(String)
    discrepancy_desc = Column(Text)
    discrepancy_amount = Column(Float)
    status = Column(String)
    recon_date = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ReconciliationDetail(Base):
    __tablename__ = "reconciliation_details"
    
    id = Column(Integer, primary_key=True, index=True)
    recon_id = Column(Integer, ForeignKey('reconciliation_results.id'))
    source_type = Column(String)
    source_id = Column(Integer)
    source_no = Column(String)
    quantity = Column(Float)
    amount = Column(Float)
    date = Column(String)
    remark = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class OperationLog(Base):
    __tablename__ = "operation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String)
    table_name = Column(String)
    record_id = Column(Integer)
    old_value = Column(Text)
    new_value = Column(Text)
    operator = Column(String)
    operation_time = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
