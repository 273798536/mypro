from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.models.base import TimestampMixin


class WaveOrder(Base, TimestampMixin):
    __tablename__ = "wave_orders"

    wave_no = Column(String(50), unique=True, index=True, nullable=False)
    wave_date = Column(DateTime, nullable=False, index=True)
    warehouse_code = Column(String(20))
    picker_id = Column(String(50))
    picker_name = Column(String(100))
    pick_zone = Column(String(50))
    total_orders = Column(Integer, default=0)
    total_skus = Column(Integer, default=0)
    total_qty = Column(Integer, default=0)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String(20), default="created")
    performance_score = Column(Numeric(5, 2))
    inventory_occupied = Column(Numeric(15, 2))
    is_split = Column(Boolean, default=False)
    parent_wave_no = Column(String(50))
    split_reason = Column(String(200))
    remarks = Column(Text)

    pick_diffs = relationship("PickDifference", back_populates="wave_order")
    review_scans = relationship("ReviewScan", back_populates="wave_order")
    ledger_records = relationship("LedgerRecord", back_populates="wave_order")


class PickDifference(Base, TimestampMixin):
    __tablename__ = "pick_differences"

    diff_no = Column(String(50), unique=True, index=True, nullable=False)
    wave_id = Column(Integer, ForeignKey("wave_orders.id"))
    wave_no = Column(String(50), index=True)
    order_no = Column(String(50))
    sku_code = Column(String(50), index=True)
    sku_name = Column(String(200))
    pick_qty = Column(Integer, default=0)
    actual_pick_qty = Column(Integer, default=0)
    diff_qty = Column(Integer, default=0)
    diff_type = Column(String(30))
    diff_reason = Column(String(500))
    found_location = Column(String(100))
    handler = Column(String(100))
    handle_time = Column(DateTime)
    handle_result = Column(String(100))
    source_system = Column(String(50))
    is_resolved = Column(Boolean, default=False)

    wave_order = relationship("WaveOrder", back_populates="pick_diffs")
    ledger_records = relationship("LedgerRecord", back_populates="pick_diff")


class ReviewScan(Base, TimestampMixin):
    __tablename__ = "review_scans"

    scan_no = Column(String(50), unique=True, index=True, nullable=False)
    wave_id = Column(Integer, ForeignKey("wave_orders.id"))
    wave_no = Column(String(50), index=True)
    order_no = Column(String(50))
    sku_code = Column(String(50), index=True)
    sku_name = Column(String(200))
    reviewer_id = Column(String(50))
    reviewer_name = Column(String(100))
    scan_time = Column(DateTime)
    review_qty = Column(Integer, default=0)
    is_pass = Column(Boolean, default=True)
    reject_reason = Column(String(500))
    recheck_count = Column(Integer, default=0)
    package_no = Column(String(50))

    wave_order = relationship("WaveOrder", back_populates="review_scans")
    ledger_records = relationship("LedgerRecord", back_populates="review_scan")


class RefundFlow(Base, TimestampMixin):
    __tablename__ = "refund_flows"

    refund_no = Column(String(50), unique=True, index=True, nullable=False)
    order_no = Column(String(50), index=True)
    wave_no = Column(String(50), index=True)
    sku_code = Column(String(50))
    sku_name = Column(String(200))
    refund_qty = Column(Integer, default=0)
    refund_amount = Column(Numeric(15, 2))
    refund_type = Column(String(30))
    refund_reason = Column(String(500))
    apply_time = Column(DateTime)
    complete_time = Column(DateTime)
    operator = Column(String(100))
    is_related_pick_diff = Column(Boolean, default=False)
    related_diff_no = Column(String(50))


class StockSplitRecord(Base, TimestampMixin):
    __tablename__ = "stock_split_records"

    split_no = Column(String(50), unique=True, index=True, nullable=False)
    original_wave_no = Column(String(50), index=True)
    new_wave_no = Column(String(50), index=True)
    sku_code = Column(String(50))
    sku_name = Column(String(200))
    split_qty = Column(Integer, default=0)
    split_reason = Column(String(200))
    stock_shortage_qty = Column(Integer, default=0)
    original_performance = Column(Numeric(5, 2))
    new_performance = Column(Numeric(5, 2))
    performance_deviation = Column(Numeric(5, 2))
    original_inventory_occupied = Column(Numeric(15, 2))
    new_inventory_occupied = Column(Numeric(15, 2))
    inventory_deviation = Column(Numeric(15, 2))
    operator = Column(String(100))
    operate_time = Column(DateTime)
    remarks = Column(Text)


class InventoryDifference(Base, TimestampMixin):
    __tablename__ = "inventory_differences"

    check_no = Column(String(50), unique=True, index=True, nullable=False)
    check_date = Column(DateTime, index=True)
    warehouse_code = Column(String(20))
    sku_code = Column(String(50), index=True)
    sku_name = Column(String(200))
    location = Column(String(100))
    system_qty = Column(Integer, default=0)
    actual_qty = Column(Integer, default=0)
    diff_qty = Column(Integer, default=0)
    diff_type = Column(String(30))
    diff_reason = Column(String(500))
    related_wave_no = Column(String(50), index=True)
    check_person = Column(String(100))
    is_adjusted = Column(Boolean, default=False)
    adjust_time = Column(DateTime)
