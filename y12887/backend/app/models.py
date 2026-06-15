from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class BeachInfo(Base):
    __tablename__ = "beach_info"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="浴场名称")
    code = Column(String(50), unique=True, nullable=False, comment="浴场编码")
    latitude = Column(Float, nullable=False, comment="纬度")
    longitude = Column(Float, nullable=False, comment="经度")
    safe_zone_radius = Column(Float, default=500.0, comment="安全区域半径(米)")
    no_navigation_coords = Column(Text, comment="禁航区坐标(JSON数组)")
    description = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class InspectionRecord(Base):
    __tablename__ = "inspection_record"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String(50), unique=True, nullable=False, comment="记录编号")
    beach_id = Column(Integer, ForeignKey("beach_info.id"), comment="浴场ID")
    inspection_time = Column(DateTime, nullable=False, comment="巡检时间")
    inspector = Column(String(50), comment="巡检人员")
    weather = Column(String(50), comment="天气")
    temperature = Column(Float, comment="气温(℃)")
    wind_direction = Column(String(20), comment="风向")
    wind_level = Column(String(20), comment="风力等级")
    wave_height = Column(Float, comment="浪高(米)")
    tide_level = Column(String(20), comment="潮位")
    photo_path = Column(String(500), comment="巡检照片路径")
    photo_name = Column(String(200), comment="照片名称")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    beach = relationship("BeachInfo", backref="inspections")
    processing_records = relationship("ProcessingRecord", back_populates="inspection")


class BuoyData(Base):
    __tablename__ = "buoy_data"

    id = Column(Integer, primary_key=True, index=True)
    buoy_id = Column(String(50), nullable=False, comment="浮标编号")
    beach_id = Column(Integer, ForeignKey("beach_info.id"), comment="浴场ID")
    record_time = Column(DateTime, nullable=False, comment="记录时间")
    latitude = Column(Float, comment="纬度")
    longitude = Column(Float, comment="经度")
    water_temperature = Column(Float, comment="水温(℃)")
    ph_value = Column(Float, comment="pH值")
    dissolved_oxygen = Column(Float, comment="溶解氧(mg/L)")
    turbidity = Column(Float, comment="浊度(NTU)")
    salinity = Column(Float, comment="盐度(psu)")
    current_speed = Column(Float, comment="流速(m/s)")
    current_direction = Column(Float, comment="流向(°)")
    wave_height = Column(Float, comment="波高(m)")
    wave_period = Column(Float, comment="波周期(s)")
    is_missing = Column(Boolean, default=False, comment="是否缺失数据")
    missing_fields = Column(String(500), comment="缺失字段列表(JSON)")
    created_at = Column(DateTime, default=datetime.now)

    beach = relationship("BeachInfo", backref="buoy_data")


class ProcessingRecord(Base):
    __tablename__ = "processing_record"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), nullable=False, comment="批次号")
    inspection_id = Column(Integer, ForeignKey("inspection_record.id"), comment="巡检记录ID")
    buoy_data_id = Column(Integer, ForeignKey("buoy_data.id"), comment="浮标数据ID")
    beach_id = Column(Integer, ForeignKey("beach_info.id"), comment="浴场ID")
    process_time = Column(DateTime, default=datetime.now, comment="处理时间")
    trajectory_drift = Column(Float, comment="轨迹漂移量(米)")
    is_drift_abnormal = Column(Boolean, comment="漂移是否异常")
    drift_calculation_note = Column(Text, comment="漂移计算说明")
    water_quality_level = Column(String(20), comment="水质等级")
    water_quality_score = Column(Float, comment="水质评分")
    is_water_abnormal = Column(Boolean, comment="水质是否异常")
    water_calculation_note = Column(Text, comment="水质计算说明")
    risk_level = Column(String(20), default="正常", comment="风险等级")
    risk_score = Column(Float, comment="风险评分")
    has_processed = Column(Boolean, default=False, comment="是否已处理")
    processing_opinion = Column(Text, comment="处理意见")
    processed_by = Column(String(50), comment="处理人")
    processed_at = Column(DateTime, comment="处理时间")
    is_reviewed = Column(Boolean, default=False, comment="是否已复核")
    review_opinion = Column(Text, comment="复核意见")
    reviewed_by = Column(String(50), comment="复核人")
    reviewed_at = Column(DateTime, comment="复核时间")
    calculation_status = Column(String(20), default="success", comment="计算状态: success/partial/failed")
    failure_reason = Column(Text, comment="失败原因")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    inspection = relationship("InspectionRecord", back_populates="processing_records")
    buoy_data = relationship("BuoyData")
    beach = relationship("BeachInfo")
    anomalies = relationship("AnomalyRecord", back_populates="processing_record")


class AnomalyRecord(Base):
    __tablename__ = "anomaly_record"

    id = Column(Integer, primary_key=True, index=True)
    anomaly_no = Column(String(50), unique=True, nullable=False, comment="异常编号")
    processing_record_id = Column(Integer, ForeignKey("processing_record.id"), comment="处理记录ID")
    beach_id = Column(Integer, ForeignKey("beach_info.id"), comment="浴场ID")
    anomaly_type = Column(String(50), nullable=False, comment="异常类型: trajectory_drift/water_quality/no_navigation_violation")
    anomaly_level = Column(String(20), default="一般", comment="异常等级: 轻微/一般/严重")
    description = Column(Text, nullable=False, comment="异常描述")
    anomaly_value = Column(Float, comment="异常值")
    threshold = Column(Float, comment="阈值")
    unit = Column(String(20), comment="单位")
    formula = Column(String(200), comment="计算公式")
    occurrence_time = Column(DateTime, default=datetime.now, comment="发生时间")
    is_resolved = Column(Boolean, default=False, comment="是否已解决")
    resolution_note = Column(Text, comment="解决说明")
    resolved_at = Column(DateTime, comment="解决时间")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    processing_record = relationship("ProcessingRecord", back_populates="anomalies")
    beach = relationship("BeachInfo")


class DataGap(Base):
    __tablename__ = "data_gap"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), nullable=False, comment="批次号")
    beach_id = Column(Integer, ForeignKey("beach_info.id"), comment="浴场ID")
    gap_type = Column(String(50), comment="缺口类型: buoy_missing/inspection_missing/calc_failure")
    description = Column(Text, nullable=False, comment="缺口描述")
    missing_data_time = Column(DateTime, comment="缺失数据时间")
    missing_fields = Column(String(500), comment="缺失字段")
    is_filled = Column(Boolean, default=False, comment="是否已补全")
    filled_by = Column(String(50), comment="补全人")
    filled_at = Column(DateTime, comment="补全时间")
    fill_note = Column(Text, comment="补全说明")
    created_at = Column(DateTime, default=datetime.now)

    beach = relationship("BeachInfo")
