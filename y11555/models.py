from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from config import Base

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    source_file = Column(String(255))
    source_type = Column(String(50))
    total_records = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    status = Column(String(50), default="processing")
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    remark = Column(Text)

    receipts = relationship("AbnormalReceipt", back_populates="batch")
    import_details = relationship("ImportDetail", back_populates="batch")

class ImportDetail(Base):
    __tablename__ = "import_details"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    original_row_number = Column(Integer)
    original_data = Column(JSON)
    parsed_data = Column(JSON)
    import_status = Column(String(50))
    error_message = Column(Text)
    receipt_id = Column(Integer, ForeignKey("abnormal_receipts.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="import_details")

class StoreOrder(Base):
    __tablename__ = "store_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    store_name = Column(String(100))
    store_code = Column(String(50))
    product_name = Column(String(200))
    product_code = Column(String(50))
    quantity = Column(Float)
    unit = Column(String(20))
    price = Column(Float)
    order_date = Column(DateTime)
    delivery_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    receipts = relationship("AbnormalReceipt", back_populates="store_order")

class DriverTrack(Base):
    __tablename__ = "driver_tracks"

    id = Column(Integer, primary_key=True, index=True)
    track_no = Column(String(50), unique=True, index=True, nullable=False)
    driver_name = Column(String(50))
    driver_phone = Column(String(20))
    vehicle_no = Column(String(30))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    actual_delivery_time = Column(DateTime)
    location = Column(String(200))
    latitude = Column(Float)
    longitude = Column(Float)
    distance = Column(Float)
    status = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    receipts = relationship("AbnormalReceipt", back_populates="driver_track")

class SignReceipt(Base):
    __tablename__ = "sign_receipts"

    id = Column(Integer, primary_key=True, index=True)
    sign_no = Column(String(50), unique=True, index=True, nullable=False)
    signer_name = Column(String(50))
    signer_phone = Column(String(20))
    sign_time = Column(DateTime)
    sign_type = Column(String(50))
    is_iou = Column(Boolean, default=False)
    iou_amount = Column(Float, default=0)
    sign_remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    receipts = relationship("AbnormalReceipt", back_populates="sign_receipt")

class AbnormalReceipt(Base):
    __tablename__ = "abnormal_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(50), unique=True, index=True, nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    order_id = Column(Integer, ForeignKey("store_orders.id"))
    track_id = Column(Integer, ForeignKey("driver_tracks.id"))
    sign_id = Column(Integer, ForeignKey("sign_receipts.id"))

    area = Column(String(100))
    store_name = Column(String(100))
    product_name = Column(String(200))
    abnormal_type = Column(String(50))
    abnormal_description = Column(Text)
    abnormal_quantity = Column(Float)
    abnormal_amount = Column(Float)

    current_status = Column(String(50))
    previous_status = Column(String(50))
    status_before_freeze = Column(String(50))

    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime)
    frozen_by = Column(String(50))
    frozen_reason = Column(Text)

    review_result = Column(String(50))
    review_reason = Column(Text)
    reviewed_by = Column(String(50))
    reviewed_at = Column(DateTime)

    service_remark = Column(Text)
    manual_reason = Column(Text)

    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="receipts")
    store_order = relationship("StoreOrder", back_populates="receipts")
    driver_track = relationship("DriverTrack", back_populates="receipts")
    sign_receipt = relationship("SignReceipt", back_populates="receipts")
    status_history = relationship("StatusHistory", back_populates="receipt", order_by="StatusHistory.changed_at.desc()")
    attachments = relationship("Attachment", back_populates="receipt")
    operation_logs = relationship("OperationLog", back_populates="receipt")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("abnormal_receipts.id"))
    from_status = Column(String(50))
    to_status = Column(String(50))
    changed_by = Column(String(50))
    changed_at = Column(DateTime, default=datetime.utcnow)
    change_reason = Column(Text)
    operator_role = Column(String(50))

    receipt = relationship("AbnormalReceipt", back_populates="status_history")

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("abnormal_receipts.id"))
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_type = Column(String(50))
    file_size = Column(Integer)
    uploaded_by = Column(String(50))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    description = Column(Text)

    receipt = relationship("AbnormalReceipt", back_populates="attachments")

class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("abnormal_receipts.id"))
    operation_type = Column(String(50))
    operation_content = Column(Text)
    operated_by = Column(String(50))
    operator_role = Column(String(50))
    operated_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50))

    receipt = relationship("AbnormalReceipt", back_populates="operation_logs")

class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    export_no = Column(String(50), unique=True, index=True)
    export_type = Column(String(50))
    filters = Column(JSON)
    record_count = Column(Integer)
    exported_by = Column(String(50))
    exported_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String(500))
    status = Column(String(50), default="completed")
