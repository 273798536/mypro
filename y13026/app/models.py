from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class PlaybackStatus(str, enum.Enum):
    PENDING_MATERIAL = "待补材料"
    PROCESSED = "已处理"
    MANUAL_OVERRIDDEN = "人工改判"


class SourceType(str, enum.Enum):
    APPROVAL_EMAIL = "审批邮件"
    SUPPLEMENT_VOUCHER = "后补凭证"
    EXTERNAL_INTERFACE = "外部接口"


class PlaybackBatch(Base):
    __tablename__ = "playback_batches"
    __table_args__ = (
        UniqueConstraint("batch_no", "run_index", name="uq_batch_no_run_index"),
    )

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(64), index=True, nullable=False, comment="批次号，同一批材料跑两遍用同一个批次号")
    run_index = Column(Integer, default=1, comment="第几次跑，同一批次号递增")
    operator = Column(String(64), comment="操作人")
    remark = Column(Text, comment="批次备注")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    details = relationship("PlaybackDetail", back_populates="batch", cascade="all, delete-orphan")


class PlaybackDetail(Base):
    __tablename__ = "playback_details"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("playback_batches.id"), nullable=False)
    detail_no = Column(String(64), index=True, nullable=False, comment="明细编号，同一明细在不同run_index下保持一致")
    broker_name = Column(String(128), comment="券商名称")
    customer_name = Column(String(128), comment="客户名称")
    product_name = Column(String(256), comment="产品名称")
    risk_level = Column(String(32), comment="风险等级")
    transaction_amount = Column(String(64), comment="交易金额")
    previous_conclusion = Column(Text, comment="昨天的结论")
    current_conclusion = Column(Text, comment="当前回放结论")
    status = Column(String(32), default=PlaybackStatus.PENDING_MATERIAL.value, comment="当前状态")
    is_split_repayment = Column(Boolean, default=False, comment="是否存在回款拆行影响结果")
    repayment_split_hint = Column(Text, comment="回款拆行可操作提示")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("PlaybackBatch", back_populates="details")
    sources = relationship("SourceMaterial", back_populates="detail", cascade="all, delete-orphan")
    conclusion_history = relationship("ConclusionHistory", back_populates="detail", cascade="all, delete-orphan")
    remarks = relationship("DetailRemark", back_populates="detail", cascade="all, delete-orphan")


class SourceMaterial(Base):
    """原始来源材料，保留脏数据原貌，不做清洗"""
    __tablename__ = "source_materials"

    id = Column(Integer, primary_key=True, index=True)
    detail_id = Column(Integer, ForeignKey("playback_details.id"), nullable=False)
    source_type = Column(String(32), nullable=False, comment="来源类型")
    raw_content = Column(Text, nullable=False, comment="原始内容，保留原貌不做清洗")
    parsed_data = Column(JSON, comment="解析后的结构化数据（可选，解析失败则为空）")
    parse_status = Column(String(32), default="pending", comment="解析状态：pending/success/failed")
    parse_error = Column(Text, comment="解析失败原因")
    filename = Column(String(256), comment="原始文件名（如有）")
    uploaded_by = Column(String(64), comment="上传人")
    created_at = Column(DateTime, server_default=func.now())

    detail = relationship("PlaybackDetail", back_populates="sources")


class ConclusionHistory(Base):
    """结论历史链：审批邮件→后补凭证→改判结论的关系链"""
    __tablename__ = "conclusion_history"

    id = Column(Integer, primary_key=True, index=True)
    detail_id = Column(Integer, ForeignKey("playback_details.id"), nullable=False)
    conclusion = Column(Text, nullable=False, comment="该阶段的结论")
    change_reason = Column(Text, comment="变更原因")
    changed_by = Column(String(64), comment="变更人/来源")
    source_material_id = Column(Integer, ForeignKey("source_materials.id"), nullable=True, comment="关联的来源材料")
    sequence = Column(Integer, default=1, comment="顺序号，1为最早结论")
    created_at = Column(DateTime, server_default=func.now())

    detail = relationship("PlaybackDetail", back_populates="conclusion_history")
    source_material = relationship("SourceMaterial")


class DetailRemark(Base):
    """明细备注，同一批跑两遍时补充的备注"""
    __tablename__ = "detail_remarks"

    id = Column(Integer, primary_key=True, index=True)
    detail_id = Column(Integer, ForeignKey("playback_details.id"), nullable=False)
    content = Column(Text, nullable=False, comment="备注内容")
    remarked_by = Column(String(64), comment="备注人")
    created_at = Column(DateTime, server_default=func.now())

    detail = relationship("PlaybackDetail", back_populates="remarks")
