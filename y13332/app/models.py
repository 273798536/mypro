from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    revisions = relationship("RevisionBatch", back_populates="model_version")


class RevisionBatch(Base):
    __tablename__ = "revision_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(200), nullable=False)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    source_file = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    remark = Column(Text, nullable=True)

    model_version = relationship("ModelVersion", back_populates="revisions")
    samples = relationship("Sample", back_populates="batch", cascade="all, delete-orphan")


class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("revision_batches.id"), nullable=False)
    sample_id = Column(String(200), nullable=False, index=True)
    product_id = Column(String(200), nullable=True, index=True)
    product_name = Column(String(500), nullable=True)

    ai_predicted_attr = Column(Text, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_threshold = Column(Float, nullable=True)

    manual_attr_old = Column(Text, nullable=True)
    manual_attr_new = Column(Text, nullable=True)
    manual_revision_source = Column(String(200), nullable=True)
    manual_process_status = Column(String(100), nullable=True)
    manual_operator = Column(String(100), nullable=True)
    manual_remark = Column(Text, nullable=True)

    is_threshold_drift = Column(Boolean, default=False, nullable=False, index=True)
    drift_reason = Column(String(500), nullable=True)

    final_status = Column(String(100), nullable=True, index=True)
    final_attr = Column(Text, nullable=True)

    raw_fields_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    batch = relationship("RevisionBatch", back_populates="samples")

    __table_args__ = (
        Index("ix_sample_batch_sampleid", "batch_id", "sample_id", unique=True),
    )


STATUS_DEFINITIONS = {
    "pending": "待处理",
    "confirmed": "已确认（人工改判有效）",
    "rejected": "已驳回（人工改判无效）",
    "drift": "阈值漂移（单独处理）",
    "merged": "已合并入最终结果",
}
