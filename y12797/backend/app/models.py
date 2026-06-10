from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base


class ProcessingRecord(Base):
    __tablename__ = "processing_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String(64), unique=True, index=True, nullable=False)
    batch_no = Column(String(128), index=True, comment="批号/批次号")
    material_name = Column(String(256), comment="物料名称")
    status = Column(String(32), default="imported", index=True, comment="imported/reviewing/reviewed/pending_export/exported")
    source_file_name = Column(String(256), comment="原始导入文件名")
    source_format = Column(String(32), comment="数据来源格式 old_excel/manual/json")

    reviewer = Column(String(128), comment="复核人")
    reviewed_at = Column(DateTime, comment="复核时间")
    exporter = Column(String(128), comment="导出人")
    exported_at = Column(DateTime, comment="导出时间")

    remark = Column(Text, comment="补录备注/综合备注")
    supplementary_note = Column(Text, comment="补录说明")
    safety_note = Column(Text, comment="安全备注")
    processing_opinion = Column(Text, comment="处理意见")

    # 温度单位混用相关
    has_temp_unit_mix = Column(Boolean, default=False, comment="是否存在温度单位混用")
    temp_unit_issue_detail = Column(JSON, comment="温度单位问题明细")

    # 谱峰重叠
    has_peak_overlap = Column(Boolean, default=False, comment="是否存在谱峰重叠")
    peak_overlap_detail = Column(JSON, comment="谱峰重叠明细")

    # 称量精度
    has_weighing_issue = Column(Boolean, default=False, comment="是否存在称量精度问题")
    weighing_issue_detail = Column(JSON, comment="称量精度问题明细")

    # 漏填单位
    missing_unit_fields = Column(JSON, comment="漏填单位字段列表")

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reaction_conditions = relationship("ReactionCondition", back_populates="record", cascade="all, delete-orphan")
    substrate_conversions = relationship("SubstrateConversion", back_populates="record", cascade="all, delete-orphan")
    spectrum_data = relationship("SpectrumData", back_populates="record", cascade="all, delete-orphan")
    status_logs = relationship("StatusLog", back_populates="record", cascade="all, delete-orphan")
    audit_trails = relationship("AuditTrail", back_populates="record", cascade="all, delete-orphan")


class ReactionCondition(Base):
    __tablename__ = "reaction_conditions"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)

    condition_name = Column(String(128), comment="条件名称，如温度、pH、反应时间等")
    condition_value = Column(String(128), comment="条件原始值")
    numeric_value = Column(Float, comment="数值")
    unit = Column(String(32), comment="单位")
    normalized_unit = Column(String(32), comment="归一化单位")
    normalized_value = Column(Float, comment="归一化数值")

    is_unit_missing = Column(Boolean, default=False, comment="是否漏填单位")
    is_unit_mismatch = Column(Boolean, default=False, comment="单位是否与标准不一致")
    is_abnormal = Column(Boolean, default=False, comment="是否异常")
    issue_description = Column(String(512), comment="问题描述")
    review_note = Column(Text, comment="复核备注")

    row_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ProcessingRecord", back_populates="reaction_conditions")


class SubstrateConversion(Base):
    __tablename__ = "substrate_conversions"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)

    substrate_name = Column(String(256), comment="底物名称")
    cas_no = Column(String(64), comment="CAS号")

    initial_concentration = Column(Float, comment="初始浓度数值")
    initial_concentration_unit = Column(String(32), comment="初始浓度单位")
    initial_mass = Column(Float, comment="初始称样量")
    initial_mass_unit = Column(String(32), comment="称样量单位")

    volume = Column(Float, comment="体积")
    volume_unit = Column(String(32), comment="体积单位")

    molecular_weight = Column(Float, comment="分子量")
    purity = Column(Float, comment="纯度(%)")

    final_concentration = Column(Float, comment="换算后终浓度")
    final_concentration_unit = Column(String(32), comment="终浓度单位")
    conversion_formula = Column(Text, comment="换算公式")
    conversion_note = Column(Text, comment="换算说明")

    is_weighing_insufficient = Column(Boolean, default=False, comment="称量精度是否不足")
    weighing_precision = Column(String(64), comment="称量精度等级")
    weighing_issue_explain = Column(Text, comment="称量精度不足原因（普通话）")

    row_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ProcessingRecord", back_populates="substrate_conversions")


class SpectrumData(Base):
    __tablename__ = "spectrum_data"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)

    spectrum_type = Column(String(64), comment="谱图类型 HPLC/GC/MS/NMR")
    detection_wavelength = Column(String(64), comment="检测波长")
    column_info = Column(String(256), comment="色谱柱信息")

    retention_time = Column(Float, comment="保留时间")
    peak_area = Column(Float, comment="峰面积")
    peak_height = Column(Float, comment="峰高")
    peak_name = Column(String(128), comment="峰名称/底物对应峰")

    is_overlap = Column(Boolean, default=False, comment="是否重叠峰")
    overlap_with = Column(String(256), comment="与哪个峰重叠")
    overlap_severity = Column(String(32), comment="重叠程度 mild/moderate/severe")
    overlap_note = Column(Text, comment="重叠说明")

    raw_data_json = Column(JSON, comment="原始谱图数据点 JSON")
    interpretation = Column(Text, comment="谱图判读结论")
    interpretation_linked = Column(Boolean, default=True, comment="判读是否与换算记录绑定")

    row_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ProcessingRecord", back_populates="spectrum_data")


class StatusLog(Base):
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)

    from_status = Column(String(32))
    to_status = Column(String(32))
    operator = Column(String(128))
    operation_note = Column(Text)
    operated_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ProcessingRecord", back_populates="status_logs")


class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)

    action_type = Column(String(64), comment="操作类型 import/review/edit/export/annotate")
    field_name = Column(String(128), comment="修改字段")
    old_value = Column(Text)
    new_value = Column(Text)
    operator = Column(String(128))
    trace_note = Column(Text, comment="追溯说明")
    operated_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ProcessingRecord", back_populates="audit_trails")
