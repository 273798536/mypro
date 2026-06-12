import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship

from .database import Base


class ScreenshotStatus(str, enum.Enum):
    PROCESSED = "已处理"
    PENDING_MATERIAL = "待补材料"
    MANUAL_JUDGMENT = "人工改判"


class ResultStatus(str, enum.Enum):
    NORMAL = "正常"
    SUSPENDED = "挂起"
    ABNORMAL = "异常"


class ChangeCause(str, enum.Enum):
    THRESHOLD = "阈值变更"
    UNIT = "单位变更"
    REMARK = "备注变更"
    DATA = "样本数据变更"
    OTHER = "其他"


class Parameter(Base):
    __tablename__ = "parameters"

    id = Column(Integer, primary_key=True, index=True)
    param_key = Column(String(100), unique=True, index=True, nullable=False)
    param_name = Column(String(200), nullable=False)
    current_value = Column(Float)
    unit = Column(String(50))
    threshold_low = Column(Float)
    threshold_high = Column(Float)
    segment_count = Column(Integer, default=2)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    history = relationship("ParameterHistory", back_populates="parameter", order_by="desc(ParameterHistory.version)")
    remarks = relationship("Remark", back_populates="parameter")
    screenshots = relationship("Screenshot", back_populates="parameter")
    results = relationship("CalculationResult", back_populates="parameter")


class ParameterHistory(Base):
    __tablename__ = "parameter_history"

    id = Column(Integer, primary_key=True, index=True)
    parameter_id = Column(Integer, ForeignKey("parameters.id"), nullable=False)
    version = Column(Integer, nullable=False)
    value = Column(Float)
    unit = Column(String(50))
    threshold_low = Column(Float)
    threshold_high = Column(Float)
    segment_count = Column(Integer)
    change_reason = Column(String(500))
    changed_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    parameter = relationship("Parameter", back_populates="history")


class Remark(Base):
    __tablename__ = "remarks"

    id = Column(Integer, primary_key=True, index=True)
    parameter_id = Column(Integer, ForeignKey("parameters.id"), nullable=False)
    idempotency_key = Column(String(200), unique=True, index=True, nullable=False)
    content = Column(Text, nullable=False)
    remark_type = Column(String(50), default="后补备注")
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    parameter = relationship("Parameter", back_populates="remarks")


class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(Integer, primary_key=True, index=True)
    parameter_id = Column(Integer, ForeignKey("parameters.id"), nullable=False)
    parameter_history_id = Column(Integer, ForeignKey("parameter_history.id"))
    file_path = Column(String(500), nullable=False)
    description = Column(String(500))
    status = Column(Enum(ScreenshotStatus), default=ScreenshotStatus.PENDING_MATERIAL)
    version_tag = Column(String(50))
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    parameter = relationship("Parameter", back_populates="screenshots")
    history = relationship("ParameterHistory")


class CalculationRequest(Base):
    __tablename__ = "calculation_requests"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(200), unique=True, index=True, nullable=False)
    parameter_id = Column(Integer, ForeignKey("parameters.id"))
    request_hash = Column(String(200), nullable=False)
    request_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class CalculationResult(Base):
    __tablename__ = "calculation_results"

    id = Column(Integer, primary_key=True, index=True)
    parameter_id = Column(Integer, ForeignKey("parameters.id"), nullable=False)
    calculation_request_id = Column(Integer, ForeignKey("calculation_requests.id"))
    version = Column(Integer, nullable=False)
    result_value = Column(Float)
    result_status = Column(Enum(ResultStatus), default=ResultStatus.NORMAL)
    suspend_reason = Column(String(500))
    segments = Column(Text)
    coefficients = Column(Text)
    r_squared = Column(Float)
    is_jump = Column(Boolean, default=False)
    jump_cause = Column(Enum(ChangeCause))
    jump_description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    parameter = relationship("Parameter", back_populates="results")
    request = relationship("CalculationRequest")


class ChangeTrace(Base):
    __tablename__ = "change_traces"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("calculation_results.id"), nullable=False)
    change_cause = Column(Enum(ChangeCause), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
