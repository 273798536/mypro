from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from enum import Enum


class DataStatus(str, Enum):
    PENDING = "待确认"
    CONFIRMED = "已确认"
    REJECTED = "已驳回"
    CALCULATED = "已计算"


class AnomalyType(str, Enum):
    FLOW_MISSING = "流量缺采"
    TEMP_SENSOR_ERROR = "温度传感器错误"
    DEFROST_CYCLE = "除霜周期"
    EQUIPMENT_MISMATCH = "设备参数不匹配"
    OTHER = "其他异常"


class OperatingMode(str, Enum):
    HEATING = "制热"
    COOLING = "制冷"
    DEFROST = "除霜"
    STANDBY = "待机"


class FlowRecord(Base):
    __tablename__ = "flow_records"

    id = Column(Integer, primary_key=True, index=True)
    record_time = Column(DateTime, index=True, nullable=False)
    equipment_id = Column(String(50), index=True, nullable=False)
    flow_rate = Column(Float, nullable=True)
    is_missing = Column(Boolean, default=False)
    status = Column(String(20), default=DataStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    confirmed_by = Column(String(50), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)

    temperature_data = relationship("TemperatureData", back_populates="flow_record")
    cop_results = relationship("COPResult", back_populates="flow_record")
    anomaly_records = relationship("AnomalyRecord", back_populates="flow_record")


class TemperatureData(Base):
    __tablename__ = "temperature_data"

    id = Column(Integer, primary_key=True, index=True)
    flow_record_id = Column(Integer, ForeignKey("flow_records.id"), nullable=False)
    record_time = Column(DateTime, index=True, nullable=False)
    equipment_id = Column(String(50), index=True, nullable=False)
    inlet_water_temp = Column(Float, nullable=False)
    outlet_water_temp = Column(Float, nullable=False)
    outdoor_temp = Column(Float, nullable=False)
    refrigerant_temp = Column(Float, nullable=True)
    compressor_temp = Column(Float, nullable=True)
    has_sensor_error = Column(Boolean, default=False)
    status = Column(String(20), default=DataStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    flow_record = relationship("FlowRecord", back_populates="temperature_data")
    cop_results = relationship("COPResult", back_populates="temperature_data")
    anomaly_records = relationship("AnomalyRecord", back_populates="temperature_data")


class EquipmentProfile(Base):
    __tablename__ = "equipment_profiles"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(String(50), unique=True, index=True, nullable=False)
    equipment_name = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    rated_power = Column(Float, nullable=False)
    rated_heating_capacity = Column(Float, nullable=True)
    rated_cooling_capacity = Column(Float, nullable=True)
    rated_cop_heating = Column(Float, nullable=True)
    rated_cop_cooling = Column(Float, nullable=True)
    design_flow_rate = Column(Float, nullable=False)
    min_flow_rate = Column(Float, nullable=True)
    max_flow_rate = Column(Float, nullable=True)
    design_inlet_temp_heating = Column(Float, nullable=True)
    design_outlet_temp_heating = Column(Float, nullable=True)
    design_inlet_temp_cooling = Column(Float, nullable=True)
    design_outlet_temp_cooling = Column(Float, nullable=True)
    installation_date = Column(DateTime, nullable=True)
    last_maintenance_date = Column(DateTime, nullable=True)
    manufacturer = Column(String(100), nullable=True)
    contact_person = Column(String(50), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    version = Column(Integer, default=1)

    cop_results = relationship("COPResult", back_populates="equipment")
    history = relationship("EquipmentProfileHistory", back_populates="equipment")


class EquipmentProfileHistory(Base):
    __tablename__ = "equipment_profile_history"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(String(50), ForeignKey("equipment_profiles.equipment_id"), nullable=False)
    version = Column(Integer, nullable=False)
    changed_fields = Column(Text, nullable=False)
    old_values = Column(Text, nullable=False)
    new_values = Column(Text, nullable=False)
    changed_by = Column(String(50), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    remarks = Column(Text, nullable=True)

    equipment = relationship("EquipmentProfile", back_populates="history")


class COPResult(Base):
    __tablename__ = "cop_results"

    id = Column(Integer, primary_key=True, index=True)
    flow_record_id = Column(Integer, ForeignKey("flow_records.id"), nullable=False)
    temperature_data_id = Column(Integer, ForeignKey("temperature_data.id"), nullable=False)
    equipment_id = Column(String(50), ForeignKey("equipment_profiles.equipment_id"), nullable=False)
    record_time = Column(DateTime, index=True, nullable=False)
    operating_mode = Column(String(20), default=OperatingMode.HEATING.value)
    water_temp_diff = Column(Float, nullable=False)
    flow_rate = Column(Float, nullable=False)
    heating_capacity = Column(Float, nullable=False)
    power_consumption = Column(Float, nullable=False)
    cop = Column(Float, nullable=False)
    rated_cop = Column(Float, nullable=True)
    cop_deviation = Column(Float, nullable=True)
    operating_condition_group = Column(String(50), nullable=True)
    outdoor_temp = Column(Float, nullable=False)
    has_anomaly = Column(Boolean, default=False)
    is_estimated = Column(Boolean, default=False)
    calculation_method = Column(String(50), nullable=False)
    equipment_version = Column(Integer, nullable=False)
    status = Column(String(20), default=DataStatus.CALCULATED.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    recalculated_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)

    flow_record = relationship("FlowRecord", back_populates="cop_results")
    temperature_data = relationship("TemperatureData", back_populates="cop_results")
    equipment = relationship("EquipmentProfile", back_populates="cop_results")
    anomaly_records = relationship("AnomalyRecord", back_populates="cop_result")


class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, index=True)
    flow_record_id = Column(Integer, ForeignKey("flow_records.id"), nullable=True)
    temperature_data_id = Column(Integer, ForeignKey("temperature_data.id"), nullable=True)
    cop_result_id = Column(Integer, ForeignKey("cop_results.id"), nullable=True)
    equipment_id = Column(String(50), index=True, nullable=False)
    record_time = Column(DateTime, index=True, nullable=False)
    anomaly_type = Column(String(50), nullable=False)
    anomaly_description = Column(Text, nullable=False)
    severity = Column(String(20), default="warning")
    next_action = Column(Text, nullable=False)
    responsible_person = Column(String(50), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(50), nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    flow_record = relationship("FlowRecord", back_populates="anomaly_records")
    temperature_data = relationship("TemperatureData", back_populates="anomaly_records")
    cop_result = relationship("COPResult", back_populates="anomaly_records")
