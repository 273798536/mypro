from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ImportSource(Base):
    __tablename__ = "import_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    source_file = Column(String, index=True)
    source_type = Column(String, index=True)
    import_time = Column(DateTime, default=datetime.utcnow)
    import_status = Column(String, default="completed")
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class WaveOrder(Base):
    __tablename__ = "wave_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    wave_no = Column(String, index=True)
    order_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    sku_name = Column(String)
    plan_qty = Column(Integer, default=0)
    pick_qty = Column(Integer, default=0)
    review_qty = Column(Integer, default=0)
    shortage_qty = Column(Integer, default=0)
    status = Column(String, default="pending")
    warehouse = Column(String)
    picker = Column(String)
    reviewer = Column(String)
    shift_code = Column(String, index=True)
    is_split = Column(Boolean, default=False)
    parent_wave_no = Column(String)
    split_reason = Column(String)
    source_file = Column(String)
    source_line = Column(Integer)
    raw_data = Column(JSON)
    unique_hash = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer)

class PickDifference(Base):
    __tablename__ = "pick_differences"
    
    id = Column(Integer, primary_key=True, index=True)
    diff_no = Column(String, index=True)
    wave_no = Column(String, index=True)
    order_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    plan_qty = Column(Integer, default=0)
    actual_pick_qty = Column(Integer, default=0)
    diff_qty = Column(Integer, default=0)
    diff_type = Column(String)
    reason_code = Column(String)
    reason_desc = Column(String)
    handler = Column(String)
    handle_time = Column(DateTime)
    handle_result = Column(String)
    source_file = Column(String)
    source_line = Column(Integer)
    raw_data = Column(JSON)
    unique_hash = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer)

class ReviewScan(Base):
    __tablename__ = "review_scans"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_no = Column(String, index=True)
    wave_no = Column(String, index=True)
    order_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    scan_qty = Column(Integer, default=0)
    scan_time = Column(DateTime)
    scanner = Column(String)
    review_result = Column(String)
    is_pass = Column(Boolean, default=True)
    fail_reason = Column(String)
    source_file = Column(String)
    source_line = Column(Integer)
    raw_data = Column(JSON)
    unique_hash = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer)

class TempSupplement(Base):
    __tablename__ = "temp_supplements"
    
    id = Column(Integer, primary_key=True, index=True)
    supplement_no = Column(String, index=True)
    wave_no = Column(String, index=True)
    order_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    supplement_qty = Column(Integer, default=0)
    supplement_type = Column(String)
    reason_code = Column(String)
    reason_desc = Column(String)
    operator = Column(String)
    operate_time = Column(DateTime)
    source_file = Column(String)
    source_line = Column(Integer)
    raw_data = Column(JSON)
    unique_hash = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer)

class ShiftRecord(Base):
    __tablename__ = "shift_records"
    
    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String, index=True)
    shift_date = Column(String, index=True)
    shift_type = Column(String)
    warehouse = Column(String)
    team_leader = Column(String)
    staff_count = Column(Integer, default=0)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    performance_target = Column(Float, default=0)
    actual_performance = Column(Float, default=0)
    source_file = Column(String)
    source_line = Column(Integer)
    raw_data = Column(JSON)
    unique_hash = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer)

class AsyncTask(Base):
    __tablename__ = "async_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    task_type = Column(String, index=True)
    task_name = Column(String)
    status = Column(String, default="pending")
    priority = Column(Integer, default=0)
    payload = Column(JSON)
    result = Column(JSON)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    fail_type = Column(String)
    next_retry_time = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ReplayRecord(Base):
    __tablename__ = "replay_records"
    
    id = Column(Integer, primary_key=True, index=True)
    replay_id = Column(String, unique=True, index=True)
    replay_type = Column(String, index=True)
    wave_no = Column(String, index=True)
    before_state = Column(JSON)
    after_state = Column(JSON)
    diff_summary = Column(JSON)
    operator = Column(String)
    operate_time = Column(DateTime, default=datetime.utcnow)
    reason = Column(String)
    remark = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExceptionRecord(Base):
    __tablename__ = "exception_records"
    
    id = Column(Integer, primary_key=True, index=True)
    exception_id = Column(String, unique=True, index=True)
    wave_no = Column(String, index=True)
    order_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    exception_type = Column(String, index=True)
    exception_level = Column(String, default="normal")
    description = Column(Text)
    source = Column(String)
    status = Column(String, default="pending")
    original_data = Column(JSON)
    corrected_data = Column(JSON)
    correction_reason = Column(String)
    corrected_by = Column(String)
    corrected_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PerformanceSnapshot(Base):
    __tablename__ = "performance_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(String, unique=True, index=True)
    wave_no = Column(String, index=True)
    snapshot_type = Column(String)
    before_split = Column(JSON)
    after_split = Column(JSON)
    split_reason = Column(String)
    operator = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(String, unique=True, index=True)
    wave_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    warehouse = Column(String, index=True)
    before_available_qty = Column(Integer, default=0)
    before_reserved_qty = Column(Integer, default=0)
    before_occupied_qty = Column(Integer, default=0)
    after_available_qty = Column(Integer, default=0)
    after_reserved_qty = Column(Integer, default=0)
    after_occupied_qty = Column(Integer, default=0)
    change_reason = Column(String)
    operator = Column(String)
    replay_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class StepDiffRecord(Base):
    __tablename__ = "step_diff_records"
    
    id = Column(Integer, primary_key=True, index=True)
    diff_id = Column(String, unique=True, index=True)
    wave_no = Column(String, index=True)
    step_name = Column(String, index=True)
    step_order = Column(Integer, default=0)
    before_state = Column(JSON)
    after_state = Column(JSON)
    diff_summary = Column(JSON)
    change_reason = Column(String)
    operator = Column(String)
    replay_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OperationLog(Base):
    __tablename__ = "operation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(String, unique=True, index=True)
    operation_type = Column(String, index=True)
    operator = Column(String)
    module = Column(String)
    action = Column(String)
    before_data = Column(JSON)
    after_data = Column(JSON)
    request_info = Column(JSON)
    response_info = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
