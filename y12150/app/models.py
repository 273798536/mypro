from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class Inverter(Base):
    __tablename__ = "inverters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    model = Column(String(100))
    rated_power = Column(Float, nullable=False, comment="额定功率 kW")
    dc_capacity = Column(Float, nullable=False, comment="直流侧容量 kWp")
    efficiency = Column(Float, default=0.96, comment="逆变器效率")
    temp_coefficient = Column(Float, default=-0.41, comment="温度系数 %/℃")
    nominal_temp = Column(Float, default=25.0, comment="额定工作温度 ℃")
    clipping_threshold = Column(Float, default=0.98, comment="削峰阈值(额定功率比例)")
    install_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)

    component_powers = relationship("ComponentPower", back_populates="inverter")
    irradiances = relationship("Irradiance", back_populates="inverter")
    curtailment_records = relationship("CurtailmentRecord", back_populates="inverter")
    analysis_results = relationship("AnalysisResult", back_populates="inverter")


class ComponentPower(Base):
    __tablename__ = "component_powers"

    id = Column(Integer, primary_key=True, index=True)
    inverter_id = Column(Integer, ForeignKey("inverters.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    dc_power = Column(Float, comment="直流侧功率 kW")
    ac_power = Column(Float, comment="交流侧功率 kW")
    module_temp = Column(Float, comment="组件温度 ℃")
    inverter_temp = Column(Float, comment="逆变器温度 ℃")

    inverter = relationship("Inverter", back_populates="component_powers")


class Irradiance(Base):
    __tablename__ = "irradiances"

    id = Column(Integer, primary_key=True, index=True)
    inverter_id = Column(Integer, ForeignKey("inverters.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    global_irradiance = Column(Float, comment="全局辐照度 W/m²")
    plane_irradiance = Column(Float, comment="组件平面辐照度 W/m²")
    ambient_temp = Column(Float, comment="环境温度 ℃")
    wind_speed = Column(Float, comment="风速 m/s")

    inverter = relationship("Inverter", back_populates="irradiances")


class CurtailmentRecord(Base):
    __tablename__ = "curtailment_records"

    id = Column(Integer, primary_key=True, index=True)
    inverter_id = Column(Integer, ForeignKey("inverters.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    curtailment_type = Column(String(50), comment="限发类型: 调度限发/故障限发/检修")
    reason = Column(Text, comment="限发原因")
    power_limit = Column(Float, comment="功率限制 kW")
    approved_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    inverter = relationship("Inverter", back_populates="curtailment_records")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    inverter_id = Column(Integer, ForeignKey("inverters.id"), nullable=False)
    analysis_date = Column(DateTime, nullable=False)
    scenario = Column(String(50), comment="分析场景")
    status = Column(String(20), default="pending", comment="状态: pending/processing/completed/confirmed")

    total_expected_energy = Column(Float, comment="理论发电量 kWh")
    total_actual_energy = Column(Float, comment="实际发电量 kWh")
    total_loss_energy = Column(Float, comment="总损失电量 kWh")
    loss_rate = Column(Float, comment="损失率 %")

    clipping_loss = Column(Float, comment="削峰损失 kWh")
    temperature_loss = Column(Float, comment="温度损失 kWh")
    curtailment_loss = Column(Float, comment="限发损失 kWh")
    irradiance_gap_loss = Column(Float, comment="辐照缺口损失 kWh")
    other_loss = Column(Float, comment="其他损失 kWh")

    peak_clipping_periods = Column(JSON, comment="削峰时段列表")
    clipping_details = Column(JSON, comment="削峰详细数据")
    power_curve_data = Column(JSON, comment="功率曲线数据")
    loss_analysis = Column(JSON, comment="损失分析详情")

    summary = Column(Text, comment="分析摘要")
    inverter_params = Column(JSON, comment="逆变器参数结论")

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    confirmed_by = Column(String(100))
    confirmed_at = Column(DateTime)

    inverter = relationship("Inverter", back_populates="analysis_results")
