from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class ExperimentStatus(str, enum.Enum):
    IMPORTED = "imported"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    EXPORTED = "exported"


class BlockReason(str, enum.Enum):
    NEGATIVE_DEPTH = "negative_depth"
    ABNORMAL_PH = "abnormal_ph"
    TRAJECTORY_ANOMALY = "trajectory_anomaly"
    WEATHER_MISSING = "weather_missing"
    DATA_GAP = "data_gap"


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    experiment_no = Column(String, unique=True, index=True, nullable=False)
    vessel_name = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    status = Column(Enum(ExperimentStatus), default=ExperimentStatus.IMPORTED)
    area = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processed_by = Column(String)

    buoy_data = relationship("BuoyData", back_populates="experiment", cascade="all, delete-orphan")
    vessel_tracks = relationship("VesselTrack", back_populates="experiment", cascade="all, delete-orphan")
    weather_forecasts = relationship("WeatherForecast", back_populates="experiment", cascade="all, delete-orphan")
    risk_notifications = relationship("RiskNotification", back_populates="experiment", cascade="all, delete-orphan")
    processing_traces = relationship("ProcessingTrace", back_populates="experiment", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="experiment", cascade="all, delete-orphan")


class BuoyData(Base):
    __tablename__ = "buoy_data"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    buoy_id = Column(String, nullable=False)
    record_time = Column(DateTime, nullable=False)
    ph_value = Column(Float, nullable=False)
    temperature = Column(Float)
    salinity = Column(Float)
    depth = Column(Float, nullable=False)
    dissolved_oxygen = Column(Float)
    is_supplementary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    data_quality = Column(String, default="pending")

    experiment = relationship("Experiment", back_populates="buoy_data")


class VesselTrack(Base):
    __tablename__ = "vessel_tracks"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    record_time = Column(DateTime, nullable=False)
    longitude = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    speed = Column(Float)
    heading = Column(Float)
    is_cleaned = Column(Boolean, default=False)
    cleaning_version = Column(Integer, default=1)
    anomaly_flag = Column(Boolean, default=False)
    anomaly_reason = Column(String)

    experiment = relationship("Experiment", back_populates="vessel_tracks")


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    forecast_time = Column(DateTime, nullable=False)
    forecast_for_date = Column(DateTime, nullable=False)
    wind_speed = Column(Float)
    wind_direction = Column(String)
    wave_height = Column(Float)
    air_pressure = Column(Float)
    is_late = Column(Boolean, default=False)
    received_at = Column(DateTime, server_default=func.now())
    version = Column(Integer, default=1)

    experiment = relationship("Experiment", back_populates="weather_forecasts")


class RiskNotification(Base):
    __tablename__ = "risk_notifications"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    notification_no = Column(String, unique=True, nullable=False)
    block_reason = Column(Enum(BlockReason), nullable=False)
    severity = Column(String, default="high")
    description = Column(Text, nullable=False)
    related_data_id = Column(Integer)
    related_data_type = Column(String)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(String)
    resolution_note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="risk_notifications")


class ProcessingTrace(Base):
    __tablename__ = "processing_traces"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    operation = Column(String, nullable=False)
    old_status = Column(String)
    new_status = Column(String)
    operator = Column(String)
    operation_time = Column(DateTime(timezone=True), server_default=func.now())
    remark = Column(Text)
    affected_data = Column(Text)

    experiment = relationship("Experiment", back_populates="processing_traces")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    report_no = Column(String, unique=True, nullable=False)
    report_type = Column(String, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_by = Column(String)
    content_summary = Column(Text)
    has_blocked_records = Column(Boolean, default=False)
    blocked_count = Column(Integer, default=0)
    valid_count = Column(Integer, default=0)
    weather_impacted = Column(Boolean, default=False)
    weather_impact_details = Column(Text)

    experiment = relationship("Experiment", back_populates="reports")
