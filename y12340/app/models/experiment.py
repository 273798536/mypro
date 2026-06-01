from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True)
    description = Column(Text, nullable=True)
    mass = Column(Float, nullable=False)
    mass_unit = Column(String(20), default="kg")
    data_source = Column(String(200))
    created_by = Column(String(100))
    status = Column(String(50), default="draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    version = Column(Integer, default=1)

    data_points = relationship("DataPoint", back_populates="experiment", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="experiment", cascade="all, delete-orphan")
    fitting_results = relationship("FittingResult", back_populates="experiment", cascade="all, delete-orphan")
    versions = relationship("ExperimentVersion", back_populates="experiment", cascade="all, delete-orphan")


class DataPoint(Base):
    __tablename__ = "data_points"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    timestamp = Column(Float, nullable=False)
    timestamp_unit = Column(String(20), default="s")
    displacement = Column(Float, nullable=False)
    displacement_unit = Column(String(20), default="m")
    is_valid = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    experiment = relationship("Experiment", back_populates="data_points")


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    check_type = Column(String(100))
    passed = Column(Boolean, default=False)
    message = Column(Text)
    affected_points = Column(Text)
    severity = Column(String(20), default="warning")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="validation_results")


class FittingResult(Base):
    __tablename__ = "fitting_results"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    spring_constant = Column(Float)
    spring_constant_unit = Column(String(20), default="N/m")
    damping_coefficient = Column(Float)
    damping_coefficient_unit = Column(String(20), default="Ns/m")
    natural_frequency = Column(Float)
    damping_ratio = Column(Float)
    r_squared = Column(Float)
    fitted_equation = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="fitting_results")


class ExperimentVersion(Base):
    __tablename__ = "experiment_versions"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    version_number = Column(Integer)
    change_description = Column(Text)
    changed_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="versions")
