from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    sample_no = Column(String(50), unique=True, index=True, nullable=False, comment="样本编号")
    customer_name = Column(String(100), comment="客户姓名")
    id_card = Column(String(50), comment="身份证号")
    original_score = Column(Float, comment="初始模型评分")
    current_score = Column(Float, comment="当前评分")
    status = Column(String(30), default="pending_review", comment="状态: pending_review-待评审, processed-已处理, material_missing-待补材料, manual_adjusted-人工改判")
    risk_level = Column(String(20), comment="风险等级")
    
    has_label_conflict = Column(Boolean, default=False, comment="是否有标签冲突")
    has_name_mismatch = Column(Boolean, default=False, comment="是否有名称不一致")
    has_material_mismatch = Column(Boolean, default=False, comment="是否有材料不一致")
    
    review_count = Column(Integer, default=0, comment="被评测次数")
    adjustment_count = Column(Integer, default=0, comment="人工改判次数")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    materials = relationship("SampleMaterial", back_populates="sample", cascade="all, delete-orphan")
    adjustments = relationship("ManualAdjustment", back_populates="sample", cascade="all, delete-orphan")
    label_conflicts = relationship("LabelConflict", back_populates="sample", cascade="all, delete-orphan")
    snapshots = relationship("SampleSnapshot", back_populates="sample", cascade="all, delete-orphan")


class SampleMaterial(Base):
    __tablename__ = "sample_materials"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    material_name = Column(String(100), comment="材料名称")
    material_type = Column(String(50), comment="材料类型")
    material_value = Column(Text, comment="材料内容/值")
    source = Column(String(50), comment="数据来源: 系统导入/人工录入/第三方接口")
    source_detail = Column(String(200), comment="来源详情")
    
    is_original = Column(Boolean, default=True, comment="是否原始数据")
    is_dirty = Column(Boolean, default=False, comment="是否脏数据（未清洗）")
    is_name_mismatch = Column(Boolean, default=False, comment="是否名称不一致")
    
    raw_value = Column(Text, comment="原始值（保留脏数据痕迹）")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sample = relationship("Sample", back_populates="materials")


class ManualAdjustment(Base):
    __tablename__ = "manual_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    adjuster = Column(String(50), comment="改判人")
    reason = Column(Text, comment="改判原因")
    
    score_before = Column(Float, comment="改判前评分")
    score_after = Column(Float, comment="改判后评分")
    status_before = Column(String(30), comment="改判前状态")
    status_after = Column(String(30), comment="改判后状态")
    risk_level_before = Column(String(20), comment="改判前风险等级")
    risk_level_after = Column(String(20), comment="改判后风险等级")
    
    source = Column(String(50), default="manual_review", comment="改判来源: manual_review-人工评审, batch_correction-批量修正, external_import-外部导入")
    source_ref = Column(String(100), comment="来源引用标识")
    
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="adjustments")
    snapshot = relationship("SampleSnapshot", back_populates="adjustment", uselist=False)


class SampleSnapshot(Base):
    __tablename__ = "sample_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    adjustment_id = Column(Integer, ForeignKey("manual_adjustments.id"), nullable=True)
    snapshot_type = Column(String(30), comment="快照类型: before_adjustment-改判前, import_snapshot-导入时")
    snapshot_data = Column(JSON, comment="快照数据（JSON格式）")
    created_by = Column(String(50), comment="创建人")
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="snapshots")
    adjustment = relationship("ManualAdjustment", back_populates="snapshot")


class LabelConflict(Base):
    __tablename__ = "label_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    field_name = Column(String(100), comment="冲突字段名")
    field_label = Column(String(100), comment="冲突字段显示名")
    
    source_a = Column(String(50), comment="来源A")
    value_a = Column(Text, comment="来源A的值")
    source_b = Column(String(50), comment="来源B")
    value_b = Column(Text, comment="来源B的值")
    
    conflict_type = Column(String(30), comment="冲突类型: value_mismatch-值不一致, label_mismatch-标签不一致, missing_source-来源缺失")
    
    is_resolved = Column(Boolean, default=False, comment="是否已解决")
    resolution = Column(String(50), comment="解决方案: adopt_a-采用A, adopt_b-采用B, manual-人工判定, pending-待补充")
    resolved_by = Column(String(50), comment="解决人")
    resolved_at = Column(DateTime, comment="解决时间")
    
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="label_conflicts")
