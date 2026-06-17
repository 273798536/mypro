from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class InspectionBatch(Base):
    """质检批次 - 一轮质检的容器"""
    __tablename__ = "inspection_batches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, default="")
    status = Column(String(50), default="draft", index=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = Column(String(100), default="知识库运营")

    materials = relationship("Material", back_populates="batch", cascade="all, delete-orphan")
    agent_traces = relationship("AgentTrace", back_populates="batch")
    review_records = relationship("ReviewRecord", back_populates="batch")
    rollback_records = relationship("RollbackRecord", back_populates="batch")
    reports = relationship("InspectionReport", back_populates="batch")


class Material(Base):
    """材料 - 训练样本 / 评测题统一建模，用 type 区分"""
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("inspection_batches.id"), nullable=False)
    material_type = Column(String(20), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    answer = Column(Text, default="")
    source = Column(String(200), default="")
    difficulty = Column(String(20), default="medium")
    knowledge_point = Column(String(200), default="")

    status = Column(String(50), default="pending", index=True)

    is_old_table = Column(Boolean, default=False)
    has_supplement_note = Column(Boolean, default=False)
    missing_unit = Column(Boolean, default=False)
    is_bias_sample = Column(Boolean, default=False)

    supplement_note = Column(Text, default="")
    old_table_version = Column(String(50), default="")

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batch = relationship("InspectionBatch", back_populates="materials")
    agent_traces = relationship("AgentTrace", back_populates="material", cascade="all, delete-orphan")
    review_records = relationship("ReviewRecord", back_populates="material", cascade="all, delete-orphan")
    label_conflicts = relationship("LabelConflict", back_populates="material", cascade="all, delete-orphan")
    safety_interceptions = relationship("SafetyInterception", back_populates="material", cascade="all, delete-orphan")


class AgentTrace(Base):
    """Agent 轨迹 - 多 Agent 处理链路的每一步"""
    __tablename__ = "agent_traces"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("inspection_batches.id"))
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    agent_role = Column(String(50), default="")
    step_order = Column(Integer, default=0)
    input_text = Column(Text, default="")
    output_text = Column(Text, default="")
    thought_process = Column(Text, default="")
    status = Column(String(50), default="completed")
    cost_time_ms = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)

    judgment_before = Column(String(50), default="")
    judgment_after = Column(String(50), default="")
    is_intercepted = Column(Boolean, default=False)
    interception_reason = Column(String(200), default="")

    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("InspectionBatch", back_populates="agent_traces")
    material = relationship("Material", back_populates="agent_traces")


class SafetyInterception(Base):
    """安全拦截记录 - 记录拦截前后的判断变化"""
    __tablename__ = "safety_interceptions"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    trace_id = Column(Integer, default=0)

    original_judgment = Column(String(50), default="")
    original_score = Column(Float, default=0.0)
    intercepted_judgment = Column(String(50), default="")
    intercepted_score = Column(Float, default=0.0)

    interception_type = Column(String(50), default="")
    interception_level = Column(String(20), default="")
    interception_detail = Column(Text, default="")

    is_rollback_applied = Column(Boolean, default=False)
    rollback_judgment = Column(String(50), default="")

    created_at = Column(DateTime, default=datetime.now)

    material = relationship("Material", back_populates="safety_interceptions")


class ReviewRecord(Base):
    """复核记录 - 人工反馈、标注记录整合在一张表"""
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("inspection_batches.id"))
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)

    reviewer = Column(String(100), default="")
    review_type = Column(String(50), default="manual")
    feedback = Column(Text, default="")
    label = Column(String(100), default="")
    score = Column(Float, default=0.0)

    annotation_source = Column(String(50), default="human")
    has_label_conflict = Column(Boolean, default=False)
    conflict_with = Column(String(100), default="")

    status = Column(String(50), default="pending")
    review_round = Column(Integer, default=1)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batch = relationship("InspectionBatch", back_populates="review_records")
    material = relationship("Material", back_populates="review_records")


class LabelConflict(Base):
    """标签冲突 - 标注不一致的记录"""
    __tablename__ = "label_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)

    original_label = Column(String(100), default="")
    original_source = Column(String(50), default="")
    new_label = Column(String(100), default="")
    new_source = Column(String(50), default="")

    conflict_reason = Column(Text, default="")
    is_resolved = Column(Boolean, default=False)
    final_label = Column(String(100), default="")
    resolved_by = Column(String(100), default="")
    resolved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.now)

    material = relationship("Material", back_populates="label_conflicts")


class RollbackRecord(Base):
    """版本回滚记录 - 追踪丢记录卡点"""
    __tablename__ = "rollback_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("inspection_batches.id"), nullable=False)

    rollback_from_version = Column(String(50), default="")
    rollback_to_version = Column(String(50), default="")
    reason = Column(Text, default="")

    total_materials_before = Column(Integer, default=0)
    total_materials_after = Column(Integer, default=0)
    lost_count = Column(Integer, default=0)

    lost_material_ids = Column(JSON, default=list)
    lost_material_titles = Column(JSON, default=list)

    stuck_material_id = Column(Integer, nullable=True)
    stuck_material_title = Column(String(500), default="")
    stuck_reason = Column(String(200), default="")

    operator = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("InspectionBatch", back_populates="rollback_records")


class InspectionReport(Base):
    """质检报告"""
    __tablename__ = "inspection_reports"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("inspection_batches.id"), nullable=False)

    title = Column(String(200), default="")
    summary = Column(Text, default="")

    total_materials = Column(Integer, default=0)
    training_count = Column(Integer, default=0)
    eval_count = Column(Integer, default=0)

    pass_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    pass_rate = Column(Float, default=0.0)

    issue_count = Column(Integer, default=0)
    interception_count = Column(Integer, default=0)
    rollback_affected_count = Column(Integer, default=0)
    label_conflict_count = Column(Integer, default=0)

    distribution_before = Column(JSON, default=dict)
    distribution_after = Column(JSON, default=dict)

    rollback_stuck_details = Column(JSON, default=dict)

    detail_data = Column(JSON, default=dict)

    export_time = Column(DateTime, default=datetime.now)
    exported_by = Column(String(100), default="")

    batch = relationship("InspectionBatch", back_populates="reports")
