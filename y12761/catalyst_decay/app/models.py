from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class BatchStatus(str, enum.Enum):
    DRAFT = "draft"
    IMPORTED = "imported"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"


class TemperatureUnit(str, enum.Enum):
    CELSIUS = "C"
    FAHRENHEIT = "F"
    KELVIN = "K"
    UNKNOWN = "unknown"


class IssueSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class IssueType(str, enum.Enum):
    TEMPERATURE_UNIT_MIXED = "temperature_unit_mixed"
    WEIGHING_PRECISION_LOW = "weighing_precision_low"
    MISSING_FIELD = "missing_field"
    ABNORMAL_CURVE = "abnormal_curve"
    UNIT_AMBIGUOUS = "unit_ambiguous"


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(100), unique=True, nullable=False, index=True)
    catalyst_name = Column(String(200))
    status = Column(SQLEnum(BatchStatus), default=BatchStatus.DRAFT)
    operator = Column(String(100))
    reviewer = Column(String(100))
    import_remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime)

    experiment_records = relationship("ExperimentRecord", back_populates="batch", cascade="all, delete-orphan")
    temperature_curves = relationship("TemperatureCurve", back_populates="batch", cascade="all, delete-orphan")
    status_transitions = relationship("StatusTransition", back_populates="batch", cascade="all, delete-orphan")
    calculation_records = relationship("CalculationRecord", back_populates="batch", cascade="all, delete-orphan")
    import_files = relationship("ImportFile", back_populates="batch", cascade="all, delete-orphan")
    data_issues = relationship("DataIssue", back_populates="batch", cascade="all, delete-orphan")


class ExperimentRecord(Base):
    __tablename__ = "experiment_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    record_no = Column(String(100))
    experiment_date = Column(String(50))
    sample_weight = Column(Float)
    sample_weight_unit = Column(String(20), default="g")
    weighing_precision = Column(String(50))
    reaction_condition = Column(Text)
    reaction_temperature = Column(Float)
    temperature_unit = Column(SQLEnum(TemperatureUnit), default=TemperatureUnit.UNKNOWN)
    temperature_raw = Column(String(100))
    space_velocity = Column(String(100))
    initial_activity = Column(Float)
    final_activity = Column(Float)
    decay_rate = Column(Float)
    raw_remark = Column(Text)
    supplementary_note = Column(Text)
    source_sheet = Column(String(200))
    source_row = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="experiment_records")


class TemperatureCurve(Base):
    __tablename__ = "temperature_curves"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    time_point = Column(Float)
    time_unit = Column(String(20), default="h")
    temperature_value = Column(Float)
    temperature_unit = Column(SQLEnum(TemperatureUnit), default=TemperatureUnit.UNKNOWN)
    temperature_raw = Column(String(100))
    activity_value = Column(Float)
    is_abnormal = Column(Boolean, default=False)
    abnormal_reason = Column(Text)
    source_sheet = Column(String(200))
    source_row = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="temperature_curves")


class StatusTransition(Base):
    __tablename__ = "status_transitions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    from_status = Column(SQLEnum(BatchStatus))
    to_status = Column(SQLEnum(BatchStatus))
    operator = Column(String(100))
    remark = Column(Text)
    transition_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="status_transitions")


class CalculationRecord(Base):
    __tablename__ = "calculation_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    calculation_type = Column(String(100))
    before_value = Column(Text)
    after_value = Column(Text)
    difference = Column(Text)
    reason = Column(Text)
    operator = Column(String(100))
    calculated_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="calculation_records")


class ImportFile(Base):
    __tablename__ = "import_files"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    file_name = Column(String(300))
    file_path = Column(String(500))
    file_type = Column(String(20))
    sheet_names = Column(Text)
    import_remark = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="import_files")


class DataIssue(Base):
    __tablename__ = "data_issues"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    issue_type = Column(SQLEnum(IssueType))
    severity = Column(SQLEnum(IssueSeverity))
    location = Column(String(300))
    description = Column(Text)
    human_readable_desc = Column(Text)
    source_file = Column(String(300))
    source_sheet = Column(String(200))
    source_row = Column(Integer)
    is_resolved = Column(Boolean, default=False)
    resolved_remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="data_issues")
