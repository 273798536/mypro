from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    feedback_no = Column(String(50), unique=True, index=True, nullable=False)

    status = Column(String(20), default="pending", index=True)

    original_source = Column(String(100), nullable=True)
    original_location = Column(Text, nullable=True)
    original_content = Column(Text, nullable=True)
    original_reporter = Column(String(100), nullable=True)
    original_contact = Column(String(100), nullable=True)
    original_date = Column(String(50), nullable=True)
    original_raw_row = Column(JSON, nullable=True)

    normalized_location = Column(Text, nullable=True)
    bridge_name = Column(String(200), nullable=True, index=True)
    lng = Column(Float, nullable=True)
    lat = Column(Float, nullable=True)
    impact_scope = Column(String(200), nullable=True)
    review_remark = Column(Text, nullable=True)
    capacity_conclusion = Column(String(200), nullable=True)

    handler = Column(String(50), nullable=True)
    leader_inquiry = Column(Text, nullable=True)
    leader_inquiry_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    merge_relations = relationship(
        "MergeRelation",
        foreign_keys="MergeRelation.merged_from_id",
        back_populates="from_feedback",
        cascade="all, delete-orphan"
    )
    merged_to_relations = relationship(
        "MergeRelation",
        foreign_keys="MergeRelation.merged_to_id",
        back_populates="to_feedback",
        cascade="all, delete-orphan"
    )
    evidences = relationship("Evidence", back_populates="feedback", cascade="all, delete-orphan")
    operation_logs = relationship("OperationLog", back_populates="feedback", cascade="all, delete-orphan")


class MergeRelation(Base):
    __tablename__ = "merge_relations"

    id = Column(Integer, primary_key=True, index=True)
    merged_from_id = Column(Integer, ForeignKey("feedbacks.id"), nullable=False)
    merged_to_id = Column(Integer, ForeignKey("feedbacks.id"), nullable=False)
    merge_reason = Column(Text, nullable=True)
    merge_evidence = Column(Text, nullable=True)
    merged_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    from_feedback = relationship("Feedback", foreign_keys=[merged_from_id], back_populates="merge_relations")
    to_feedback = relationship("Feedback", foreign_keys=[merged_to_id], back_populates="merged_to_relations")


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(Integer, ForeignKey("feedbacks.id"), nullable=False)
    evidence_type = Column(String(50), nullable=True)
    evidence_desc = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    uploaded_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    feedback = relationship("Feedback", back_populates="evidences")


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(Integer, ForeignKey("feedbacks.id"), nullable=False)
    operator = Column(String(50), nullable=True)
    action = Column(String(50), nullable=False)
    field_changed = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    feedback = relationship("Feedback", back_populates="operation_logs")
