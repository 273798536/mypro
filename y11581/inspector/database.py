from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DB_PATH = os.environ.get('INSPECTOR_DB_PATH', 'inspector.db')
engine = create_engine(f'sqlite:///{DB_PATH}')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ImportBatch(Base):
    __tablename__ = "import_batches"
    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_hash = Column(String)
    imported_by = Column(String, nullable=False)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    dirty_rows = Column(Integer, default=0)
    status = Column(String, default="imported")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RawRecord(Base):
    __tablename__ = "raw_records"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey('import_batches.id'))
    source_type = Column(String, nullable=False)
    original_row = Column(Integer, nullable=False)
    raw_data = Column(Text, nullable=False)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    dirty_reason = Column(Text)
    fix_suggestion = Column(Text)
    is_fixed = Column(Boolean, default=False)
    fixed_data = Column(Text)
    fixed_by = Column(String)
    fixed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    batch = relationship("ImportBatch")


class MemberBalanceHistory(Base):
    __tablename__ = "member_balance_history"
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(String, nullable=False, index=True)
    member_name = Column(String)
    store_id = Column(String)
    store_name = Column(String)
    transaction_type = Column(String)
    transaction_id = Column(String)
    reference_id = Column(String)
    amount = Column(Float, default=0.0)
    balance_before = Column(Float, default=0.0)
    balance_after = Column(Float, default=0.0)
    transaction_time = Column(DateTime)
    is_cross_store = Column(Boolean, default=False)
    is_revoked = Column(Boolean, default=False)
    source_batch_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (
        Index('idx_member_time', 'member_id', 'transaction_time'),
    )


class BalanceGap(Base):
    __tablename__ = "balance_gaps"
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(String, nullable=False, index=True)
    gap_type = Column(String)
    expected_balance = Column(Float)
    actual_balance = Column(Float)
    difference = Column(Float)
    before_transaction_id = Column(String)
    after_transaction_id = Column(String)
    detected_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)


class ShiftRecord(Base):
    __tablename__ = "shift_records"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer)
    store_id = Column(String)
    shift_date = Column(DateTime)
    shift_no = Column(String)
    cashier = Column(String)
    start_balance = Column(Float)
    end_balance = Column(Float)
    cash_sales = Column(Float)
    card_sales = Column(Float)
    member_recharge = Column(Float)
    member_refund = Column(Float)
    original_row = Column(Integer)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class RechargeRecord(Base):
    __tablename__ = "recharge_records"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer)
    member_id = Column(String)
    member_name = Column(String)
    store_id = Column(String)
    store_name = Column(String)
    recharge_amount = Column(Float)
    bonus_amount = Column(Float)
    payment_method = Column(String)
    transaction_time = Column(DateTime)
    operator = Column(String)
    original_row = Column(Integer)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    is_fixed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RefundRecord(Base):
    __tablename__ = "refund_records"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer)
    member_id = Column(String)
    member_name = Column(String)
    store_id = Column(String)
    store_name = Column(String)
    refund_amount = Column(Float)
    refund_reason = Column(String)
    transaction_time = Column(DateTime)
    operator = Column(String)
    reviewer = Column(String)
    original_row = Column(Integer)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    is_fixed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class StoreHandover(Base):
    __tablename__ = "store_handovers"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer)
    store_id = Column(String)
    store_name = Column(String)
    handover_date = Column(DateTime)
    outgoing_manager = Column(String)
    incoming_manager = Column(String)
    member_count = Column(Integer)
    total_balance = Column(Float)
    cash_on_hand = Column(Float)
    original_row = Column(Integer)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String)
    is_fixed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
