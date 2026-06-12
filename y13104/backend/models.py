from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean,
    ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship

from database import Base


class ReviewStatus(str, Enum):
    PROCESSED = "processed"
    PENDING_MATERIAL = "pending_material"
    MANUAL_OVERRULE = "manual_overrule"


class ParameterSheet(Base):
    __tablename__ = "parameter_sheets"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    uploaded_by = Column(String, default="unknown")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    version = Column(String, nullable=False)
    column_mapping = Column(JSON, default={})
    raw_columns = Column(JSON, default=[])
    notes = Column(Text, default="")

    rows = relationship("ParameterRow", back_populates="sheet", cascade="all, delete-orphan")
    regression_results = relationship("RegressionResult", back_populates="sheet", cascade="all, delete-orphan")


class ParameterRow(Base):
    __tablename__ = "parameter_rows"

    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("parameter_sheets.id"), nullable=False)
    excel_row_number = Column(Integer, nullable=False)
    raw_data = Column(JSON, nullable=False)

    security_code = Column(String, index=True)
    security_name = Column(String)
    weight = Column(Float)
    x_value = Column(Float)
    y_value = Column(Float)
    unit = Column(String)
    unit_source = Column(String)
    breakpoint = Column(Float)

    row_status = Column(String, default="ok")
    warnings = Column(JSON, default=[])

    sheet = relationship("ParameterSheet", back_populates="rows")

    __table_args__ = (
        Index("ix_sheet_row", "sheet_id", "excel_row_number", unique=True),
    )


class RegressionResult(Base):
    __tablename__ = "regression_results"

    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("parameter_sheets.id"), nullable=False)
    run_at = Column(DateTime, default=datetime.utcnow)
    segment_count = Column(Integer, default=2)
    breakpoints = Column(JSON, default=[])
    coefficients = Column(JSON, default={})
    r_squared = Column(Float)
    total_points = Column(Integer, default=0)

    sheet = relationship("ParameterSheet", back_populates="regression_results")
    anomalies = relationship("AnomalyPoint", back_populates="result", cascade="all, delete-orphan")


class AnomalyPoint(Base):
    __tablename__ = "anomaly_points"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("regression_results.id"), nullable=False)
    param_row_id = Column(Integer, ForeignKey("parameter_rows.id"), nullable=False)

    security_code = Column(String, index=True)
    security_name = Column(String)
    x_value = Column(Float)
    y_value = Column(Float)
    predicted_y = Column(Float)
    residual = Column(Float)
    z_score = Column(Float)
    is_outlier = Column(Boolean, default=False)
    anomaly_reason = Column(String)

    review_status = Column(String, default=ReviewStatus.PROCESSED)
    reviewer_note = Column(Text, default="")
    overridden = Column(Boolean, default=False)

    result = relationship("RegressionResult", back_populates="anomalies")
    param_row = relationship("ParameterRow")


class ChangeLog(Base):
    __tablename__ = "change_logs"

    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("parameter_sheets.id"))
    param_row_id = Column(Integer, ForeignKey("parameter_rows.id"))
    changed_by = Column(String, default="unknown")
    changed_at = Column(DateTime, default=datetime.utcnow)
    field_name = Column(String)
    old_value = Column(Text)
    new_value = Column(Text)
    reason = Column(Text, default="")
