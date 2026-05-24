from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import TimestampMixin
from app.models.enums import DataSourceType, ReviewType


class RawDataImport(TimestampMixin, Base):
    __tablename__ = "raw_data_imports"

    source_file = Column(String(500), nullable=False, index=True)
    source_type = Column(Enum(DataSourceType), nullable=False, index=True)
    total_rows = Column(Integer, default=0)
    imported_by = Column(String(100))


class RawDataRecord(TimestampMixin, Base):
    __tablename__ = "raw_data_records"

    import_id = Column(Integer, ForeignKey("raw_data_imports.id"), nullable=False)
    source_type = Column(Enum(DataSourceType), nullable=False, index=True)
    source_file = Column(String(500), nullable=False)
    original_row_number = Column(Integer, nullable=False)
    original_data = Column(JSON, nullable=False)
    parsed_data = Column(JSON, nullable=False)

    appointment_no = Column(String(100), index=True)
    order_no = Column(String(100), index=True)
    user_id = Column(String(100), index=True)
    technician_id = Column(String(100), index=True)
    region = Column(String(100), index=True)

    review_type = Column(Enum(ReviewType))
    review_content = Column(Text)
    refund_amount = Column(Integer)
    appointment_time = Column(DateTime)
    is_rescheduled = Column(Integer, default=0)
    is_second_visit = Column(Integer, default=0)

    import_record = relationship("RawDataImport", backref="records")
