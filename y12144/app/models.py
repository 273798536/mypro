import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class DataStatus(str, enum.Enum):
    PENDING_CONFIRM = "pending_confirm"
    NORMAL = "normal"
    WRONG_VELOCITY = "wrong_velocity"
    DUPLICATE_STATION = "duplicate_station"
    MISSING_ARRIVAL = "missing_arrival"
    REJECTED = "rejected"
    CONFIRMED = "confirmed"


class NextVerifier(str, enum.Enum):
    DATA_COLLECTOR = "data_collector"
    VELOCITY_EXPERT = "velocity_expert"
    STATION_MANAGER = "station_manager"
    TEACHER = "teacher"


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    station_code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation = Column(Float, default=0.0)
    network = Column(String(20))
    status = Column(Enum(DataStatus), default=DataStatus.NORMAL)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    arrivals = relationship("Arrival", back_populates="station")
    inversion_stations = relationship("InversionStation", back_populates="station")


class Arrival(Base):
    __tablename__ = "arrivals"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    event_tag = Column(String(50), index=True, nullable=False)
    phase = Column(String(10), nullable=False)
    arrival_time = Column(Float)
    arrival_time_str = Column(String(50))
    uncertainty = Column(Float, default=0.1)
    status = Column(Enum(DataStatus), default=DataStatus.PENDING_CONFIRM)
    next_verifier = Column(Enum(NextVerifier))
    remark = Column(Text)
    magnitude_remark = Column(String(200))
    has_magnitude_update = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station", back_populates="arrivals")
    inversion_stations = relationship("InversionStation", back_populates="arrival")
    audit_logs = relationship("AuditLog", back_populates="arrival")


class VelocityModel(Base):
    __tablename__ = "velocity_models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), unique=True, nullable=False)
    version = Column(String(50), nullable=False)
    region = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    status = Column(Enum(DataStatus), default=DataStatus.NORMAL)
    created_at = Column(DateTime, default=datetime.utcnow)

    layers = relationship("VelocityLayer", back_populates="model", cascade="all, delete-orphan")


class VelocityLayer(Base):
    __tablename__ = "velocity_layers"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("velocity_models.id"), nullable=False)
    depth_top = Column(Float, nullable=False)
    depth_bottom = Column(Float, nullable=False)
    vp = Column(Float, nullable=False)
    vs = Column(Float, nullable=False)

    model = relationship("VelocityModel", back_populates="layers")


class InversionResult(Base):
    __tablename__ = "inversion_results"

    id = Column(Integer, primary_key=True, index=True)
    event_tag = Column(String(50), unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    depth = Column(Float, nullable=False)
    origin_time = Column(Float, nullable=False)
    origin_time_str = Column(String(100))
    magnitude = Column(Float)
    residual_mean = Column(Float)
    residual_std = Column(Float)
    num_stations_used = Column(Integer)
    num_stations_rejected = Column(Integer)
    iterations = Column(Integer)
    convergence = Column(Boolean)
    velocity_model_id = Column(Integer, ForeignKey("velocity_models.id"))
    status = Column(Enum(DataStatus), default=DataStatus.CONFIRMED)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    velocity_model = relationship("VelocityModel")
    stations_used = relationship("InversionStation", back_populates="inversion", cascade="all, delete-orphan")


class InversionStation(Base):
    __tablename__ = "inversion_stations"

    id = Column(Integer, primary_key=True, index=True)
    inversion_id = Column(Integer, ForeignKey("inversion_results.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    arrival_id = Column(Integer, ForeignKey("arrivals.id"), nullable=False)
    phase = Column(String(10))
    observed_time = Column(Float)
    calculated_time = Column(Float)
    residual = Column(Float)
    weight = Column(Float, default=1.0)
    is_rejected = Column(Boolean, default=False)
    reject_reason = Column(String(200))

    inversion = relationship("InversionResult", back_populates="stations_used")
    station = relationship("Station", back_populates="inversion_stations")
    arrival = relationship("Arrival", back_populates="inversion_stations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    arrival_id = Column(Integer, ForeignKey("arrivals.id"))
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    operator = Column(String(100), default="system")
    change_reason = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)

    arrival = relationship("Arrival", back_populates="audit_logs")
