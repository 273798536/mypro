from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Boolean,
    Text, ForeignKey, Index, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.db import Base


class DataStatus:
    AVAILABLE = "available"
    PENDING = "pending"
    RECOLLECT = "recollect"
    CONFIRMED = "confirmed"


class TideRecord(Base):
    __tablename__ = "tide_records"

    id = Column(Integer, primary_key=True, index=True)
    port_code = Column(String(20), nullable=False, index=True, comment="港口代码")
    port_name = Column(String(100), comment="港口名称")
    record_date = Column(Date, nullable=False, index=True, comment="日期")
    record_time = Column(DateTime(timezone=True), nullable=False, index=True, comment="记录时间(带时区)")
    tide_height = Column(Float, nullable=False, comment="潮高(米)")
    tide_type = Column(String(10), comment="潮型: HIGH(高潮)/LOW(低潮)/MID")
    data_source = Column(String(50), comment="数据来源")
    batch_id = Column(String(64), index=True, comment="导入批次号(用于去重)")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("port_code", "record_time", "batch_id", name="uq_tide_port_time_batch"),
        Index("idx_tide_port_date", "port_code", "record_date"),
    )


class WaterQualityRecord(Base):
    __tablename__ = "water_quality_records"

    id = Column(Integer, primary_key=True, index=True)
    port_code = Column(String(20), nullable=False, index=True, comment="港口代码")
    station_code = Column(String(50), comment="监测站代码")
    record_date = Column(Date, nullable=False, index=True, comment="日期")
    record_time = Column(DateTime(timezone=True), nullable=False, index=True, comment="记录时间")
    water_depth = Column(Float, comment="实测水深(米)")
    water_level = Column(Float, comment="水位(米)")
    temperature = Column(Float, comment="水温(℃)")
    salinity = Column(Float, comment="盐度(‰)")
    turbidity = Column(Float, comment="浊度(NTU)")
    batch_id = Column(String(64), index=True, comment="导入批次号")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("port_code", "station_code", "record_time", "batch_id",
                         name="uq_water_port_station_time_batch"),
    )


class VesselTrajectory(Base):
    __tablename__ = "vessel_trajectories"

    id = Column(Integer, primary_key=True, index=True)
    mmsi = Column(String(20), nullable=False, index=True, comment="船舶MMSI")
    vessel_name = Column(String(100), comment="船名")
    port_code = Column(String(20), index=True, comment="目标港口")
    record_time = Column(DateTime(timezone=True), nullable=False, index=True)
    longitude = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    speed = Column(Float, comment="航速(节)")
    heading = Column(Float, comment="航向(度)")
    status = Column(String(20), default="raw", comment="raw/cleaned/verified")
    batch_id = Column(String(64), index=True, comment="导入批次号")
    is_cleaned = Column(Boolean, default=False, comment="是否已清洗")
    remark = Column(Text, comment="清洗备注")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TideWindowResult(Base):
    __tablename__ = "tide_window_results"

    id = Column(Integer, primary_key=True, index=True)
    result_no = Column(String(64), unique=True, nullable=False, index=True,
                       comment="结果编号(港口+日期+船名哈希，幂等用)")
    port_code = Column(String(20), nullable=False, index=True)
    port_name = Column(String(100))
    vessel_name = Column(String(100), comment="船名")
    mmsi = Column(String(20), index=True)
    work_date = Column(Date, nullable=False, index=True, comment="作业日期")
    window_start = Column(DateTime(timezone=True), comment="潮窗开始时间")
    window_end = Column(DateTime(timezone=True), comment="潮窗结束时间")
    window_duration_min = Column(Float, comment="潮窗时长(分钟)")
    min_depth = Column(Float, comment="最小水深(米)")
    max_depth = Column(Float, comment="最大水深(米)")
    avg_depth = Column(Float, comment="平均水深(米)")
    required_depth = Column(Float, default=8.0, comment="要求最小水深(米)")
    draft = Column(Float, comment="船舶吃水(米)")
    under_keel_clearance = Column(Float, comment="富余水深(米)")

    tide_height_at_start = Column(Float, comment="开始时潮高")
    tide_height_at_end = Column(Float, comment="结束时潮高")
    negative_depth_count = Column(Integer, default=0, comment="负深度样点数量")
    tide_water_match_score = Column(Float, comment="潮汐-水质匹配度(0-100)")

    data_status = Column(String(20), default=DataStatus.PENDING,
                         comment="available/pending/recollect/confirmed")
    available_flag = Column(Boolean, default=False, comment="是否可用")
    pending_reason = Column(Text, comment="暂缓原因")
    recollect_reason = Column(Text, comment="需重采原因")
    failure_reason = Column(Text, comment="计算失败原因")

    formula_used = Column(String(200), default="UKC = 实测水深 - 船舶吃水",
                          comment="使用的计算公式")
    formula_note = Column(Text, comment="公式说明/适用范围")

    calc_params = Column(JSON, comment="计算时参数快照")
    source_tide_ids = Column(JSON, comment="用到的潮汐记录ID列表")
    source_water_ids = Column(JSON, comment="用到的水质记录ID列表")
    source_trajectory_ids = Column(JSON, comment="用到的轨迹ID列表")

    batch_id = Column(String(64), index=True, comment="导入批次号")
    confirmed_by = Column(String(50), comment="确认人")
    confirmed_at = Column(DateTime(timezone=True), comment="确认时间")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_result_port_date", "port_code", "work_date"),
        Index("idx_result_status", "data_status"),
    )


class CorrectionAuditLog(Base):
    __tablename__ = "correction_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("tide_window_results.id"), nullable=False, index=True)
    operator = Column(String(50), nullable=False, comment="操作人")
    action = Column(String(30), nullable=False,
                    comment="操作类型: create/update/confirm/reject/status_change/manual_correct")
    field_name = Column(String(100), comment="修改的字段名")
    old_value = Column(JSON, comment="修改前值")
    new_value = Column(JSON, comment="修改后值")
    old_status = Column(String(20), comment="修改前状态")
    new_status = Column(String(20), comment="修改后状态")
    change_summary = Column(Text, comment="变化摘要")
    remark = Column(Text, comment="修改备注/原因")
    ip_address = Column(String(50), comment="操作IP")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    result = relationship("TideWindowResult", backref="audit_logs")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(64), unique=True, nullable=False, index=True, comment="批次号(UUID)")
    batch_type = Column(String(30), nullable=False,
                        comment="批次类型: tide/water/trajectory/calc/reimport")
    source_file = Column(String(255), comment="源文件名")
    source_hash = Column(String(128), index=True,
                         comment="文件内容hash(用于防止同一文件重复导入)")
    total_records = Column(Integer, default=0, comment="总记录数")
    inserted_count = Column(Integer, default=0, comment="新增数")
    updated_count = Column(Integer, default=0, comment="更新数")
    skipped_count = Column(Integer, default=0, comment="跳过重复数")
    operator = Column(String(50), comment="操作人")
    remark = Column(Text, comment="备注")
    is_reimport = Column(Boolean, default=False, comment="是否补录/重新导入")
    superseded_batch_id = Column(String(64), comment="被替代的批次号")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    status = Column(String(20), default="processing")
