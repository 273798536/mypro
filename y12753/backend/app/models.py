from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class RecordStatus:
    DRAFT = "draft"
    IMPORTED = "imported"
    REVIEWING = "reviewing"
    CONFIRMED = "confirmed"
    REPORTED = "reported"

    TRANSITIONS = {
        DRAFT: [IMPORTED],
        IMPORTED: [REVIEWING, DRAFT],
        REVIEWING: [CONFIRMED, IMPORTED],
        CONFIRMED: [REPORTED, REVIEWING],
        REPORTED: [CONFIRMED],
    }


class BufferRecord(Base):
    __tablename__ = "buffer_records"
    __table_args__ = (
        UniqueConstraint("batch_no", "record_date", name="uix_batch_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), nullable=False, index=True, comment="批次号")
    record_date = Column(String(20), nullable=False, comment="记录日期 YYYY-MM-DD")
    buffer_name = Column(String(100), nullable=False, comment="缓冲液名称")
    target_ph = Column(Float, nullable=False, comment="目标pH")
    target_volume = Column(Float, nullable=False, comment="目标体积(L)")
    actual_ph = Column(Float, nullable=True, comment="实际pH")
    actual_volume = Column(Float, nullable=True, comment="实际体积(L)")
    operator = Column(String(50), nullable=True, comment="操作人员")
    reviewer = Column(String(50), nullable=True, comment="复核人员")
    status = Column(String(20), default=RecordStatus.DRAFT, nullable=False, comment="状态")
    remark = Column(Text, nullable=True, comment="备注")
    precision_pass = Column(Boolean, nullable=True, comment="称量精度是否通过")
    temp_curve_pass = Column(Boolean, nullable=True, comment="温度曲线是否通过")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reported_at = Column(DateTime, nullable=True, comment="报告导出时间")

    components = relationship("BufferComponent", back_populates="record", cascade="all, delete-orphan")
    temperature_points = relationship("TemperaturePoint", back_populates="record", cascade="all, delete-orphan")
    weighing_records = relationship("WeighingRecord", back_populates="record", cascade="all, delete-orphan")
    status_logs = relationship("StatusLog", back_populates="record", cascade="all, delete-orphan")


class BufferComponent(Base):
    __tablename__ = "buffer_components"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("buffer_records.id"), nullable=False)
    reagent_name = Column(String(100), nullable=False, comment="试剂名称")
    formula = Column(String(50), nullable=True, comment="分子式")
    molar_mass = Column(Float, nullable=False, comment="摩尔质量(g/mol)")
    target_concentration = Column(Float, nullable=False, comment="目标浓度(mol/L)")
    actual_concentration = Column(Float, nullable=True, comment="实际浓度(mol/L)")
    theoretical_mass = Column(Float, nullable=True, comment="理论质量(g)")
    actual_mass = Column(Float, nullable=True, comment="实际称量质量(g)")
    purity = Column(Float, default=1.0, comment="纯度")

    record = relationship("BufferRecord", back_populates="components")


class TemperaturePoint(Base):
    __tablename__ = "temperature_points"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("buffer_records.id"), nullable=False)
    time_minute = Column(Float, nullable=False, comment="时间(分钟)")
    set_temp = Column(Float, nullable=False, comment="设定温度(℃)")
    actual_temp = Column(Float, nullable=False, comment="实际温度(℃)")

    record = relationship("BufferRecord", back_populates="temperature_points")


class WeighingRecord(Base):
    __tablename__ = "weighing_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("buffer_records.id"), nullable=False)
    reagent_name = Column(String(100), nullable=False, comment="试剂名称")
    theoretical_mass = Column(Float, nullable=False, comment="理论质量(g)")
    actual_mass = Column(Float, nullable=False, comment="实际称量质量(g)")
    tolerance_pct = Column(Float, default=0.5, comment="允许误差(%)")
    error_pct = Column(Float, nullable=True, comment="实际误差(%)")
    is_pass = Column(Boolean, nullable=True, comment="是否通过")

    record = relationship("BufferRecord", back_populates="weighing_records")


class StatusLog(Base):
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("buffer_records.id"), nullable=False)
    from_status = Column(String(20), nullable=False)
    to_status = Column(String(20), nullable=False)
    operator = Column(String(50), nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("BufferRecord", back_populates="status_logs")
