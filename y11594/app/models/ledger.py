from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.models.base import TimestampMixin


LEDGER_STATUS_FLOW = {
    "draft": {"name": "草稿", "next": ["submitted"], "prev": []},
    "submitted": {"name": "已提交", "next": ["reviewing", "rejected"], "prev": ["draft"]},
    "reviewing": {"name": "复核中", "next": ["confirmed", "rejected"], "prev": ["submitted"]},
    "rejected": {"name": "已驳回", "next": ["draft", "second_confirming"], "prev": ["submitted", "reviewing"]},
    "second_confirming": {"name": "二次确认中", "next": ["audited", "rejected"], "prev": ["rejected"]},
    "audited": {"name": "已审计", "next": ["exported"], "prev": ["confirmed", "second_confirming"]},
    "exported": {"name": "已导出", "next": [], "prev": ["audited"]}
}


DIRTY_RECORD_TYPES = {
    "missing_field": "缺字段",
    "cross_day": "跨日数据",
    "name_changed": "人员改名",
    "amount_conflict": "金额冲突",
    "qty_conflict": "数量冲突",
    "duplicate": "重复记录"
}


class LedgerRecord(Base, TimestampMixin):
    __tablename__ = "ledger_records"

    ledger_no = Column(String(50), unique=True, index=True, nullable=False)
    wave_id = Column(Integer, ForeignKey("wave_orders.id"))
    wave_no = Column(String(50), index=True)
    pick_diff_id = Column(Integer, ForeignKey("pick_differences.id"))
    review_scan_id = Column(Integer, ForeignKey("review_scans.id"))

    order_no = Column(String(50))
    sku_code = Column(String(50), index=True)
    sku_name = Column(String(200))
    picker_name = Column(String(100), index=True)
    reviewer_name = Column(String(100))
    pick_zone = Column(String(50))

    wave_date = Column(DateTime, index=True)
    pick_qty = Column(Integer, default=0)
    actual_pick_qty = Column(Integer, default=0)
    review_qty = Column(Integer, default=0)
    diff_qty = Column(Integer, default=0)
    diff_type = Column(String(30))
    diff_reason = Column(String(500))

    related_refund_no = Column(String(50))
    related_inventory_check_no = Column(String(50))
    related_split_no = Column(String(50))

    performance_impact = Column(Numeric(5, 2))
    inventory_impact = Column(Numeric(15, 2))
    original_performance = Column(Numeric(5, 2))
    original_inventory = Column(Numeric(15, 2))

    status = Column(String(30), default="draft", index=True)
    submit_time = Column(DateTime)
    review_time = Column(DateTime)
    audit_time = Column(DateTime)
    export_time = Column(DateTime)

    handle_opinion = Column(Text)
    reviewer_opinion = Column(Text)
    supervisor_opinion = Column(Text)

    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String(50))
    dirty_note = Column(String(500))

    data_sources = Column(JSON)
    trace_info = Column(JSON)
    version = Column(Integer, default=1)

    wave_order = relationship("WaveOrder", back_populates="ledger_records")
    pick_diff = relationship("PickDifference", back_populates="ledger_records")
    review_scan = relationship("ReviewScan", back_populates="ledger_records")
    status_histories = relationship("StatusHistory", back_populates="ledger_record")
    dirty_records = relationship("DirtyRecord", back_populates="ledger_record")
    comments = relationship("LedgerComment", back_populates="ledger_record")


class StatusHistory(Base, TimestampMixin):
    __tablename__ = "status_histories"

    ledger_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_no = Column(String(50), index=True)
    from_status = Column(String(30))
    to_status = Column(String(30), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"))
    operator_name = Column(String(100))
    operate_time = Column(DateTime, default=datetime.utcnow)
    reason = Column(String(500))
    change_note = Column(Text)
    changed_fields = Column(JSON)

    ledger_record = relationship("LedgerRecord", back_populates="status_histories")
    operator_user = relationship("User", back_populates="status_histories")


class DirtyRecord(Base, TimestampMixin):
    __tablename__ = "dirty_records"

    ledger_id = Column(Integer, ForeignKey("ledger_records.id"))
    ledger_no = Column(String(50), index=True)
    dirty_type = Column(String(50), nullable=False)
    field_name = Column(String(100))
    original_value = Column(Text)
    current_value = Column(Text)
    expected_value = Column(Text)
    source_data = Column(JSON)
    error_message = Column(String(500))
    handle_opinion = Column(String(500))
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))
    resolved_time = Column(DateTime)
    resolver_note = Column(Text)

    ledger_record = relationship("LedgerRecord", back_populates="dirty_records")


class LedgerComment(Base, TimestampMixin):
    __tablename__ = "ledger_comments"

    ledger_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_no = Column(String(50), index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String(100))
    comment_type = Column(String(30))
    content = Column(Text, nullable=False)
    is_important = Column(Boolean, default=False)

    ledger_record = relationship("LedgerRecord", back_populates="comments")
    comment_user = relationship("User", back_populates="ledger_comments")


class ExportRecord(Base, TimestampMixin):
    __tablename__ = "export_records"

    export_no = Column(String(50), unique=True, index=True, nullable=False)
    export_type = Column(String(30))
    ledger_nos = Column(JSON)
    export_time = Column(DateTime, default=datetime.utcnow)
    operator_id = Column(Integer)
    operator_name = Column(String(100))
    file_path = Column(String(500))
    file_hash = Column(String(100))
    is_sensitive_masked = Column(Boolean, default=True)
    export_params = Column(JSON)
    record_count = Column(Integer, default=0)
