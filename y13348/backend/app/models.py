from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum
from .database import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    REVIEWER = "reviewer"
    SCHEDULER = "scheduler"


class SessionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAITING_CONFIRM = "waiting_confirm"
    COMPLETED = "completed"
    ERROR = "error"


class CorrectionType(str, Enum):
    FALSE_POSITIVE = "false_positive"
    FALSE_NEGATIVE = "false_negative"
    THRESHOLD_ADJUST = "threshold_adjust"
    OTHER = "other"


class LeakStatus(str, Enum):
    DETECTED = "detected"
    CONFIRMED = "confirmed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ReportComponentType(str, Enum):
    SAMPLE_CHANGE = "sample_change"
    THRESHOLD_CHANGE = "threshold_change"
    MANUAL_CORRECTION = "manual_correction"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    created_sessions = relationship("ReviewSession", foreign_keys="ReviewSession.created_by", back_populates="creator")
    assigned_sessions = relationship("ReviewSession", foreign_keys="ReviewSession.assigned_to", back_populates="assignee")
    corrections = relationship("ManualCorrection", back_populates="operator")
    comments = relationship("SessionComment", back_populates="author")


class ReviewSession(Base):
    __tablename__ = "review_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.PENDING)
    batch_id = Column(String(100), index=True)
    
    original_result = Column(JSON)
    current_result = Column(JSON)
    
    page_snapshot = Column(JSON)
    summary = Column(Text)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_processed_at = Column(DateTime(timezone=True))
    
    has_sample_leak = Column(Boolean, default=False)
    
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_sessions")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_sessions")
    corrections = relationship("ManualCorrection", back_populates="session", cascade="all, delete-orphan")
    leak_alerts = relationship("SampleLeakAlert", back_populates="session", cascade="all, delete-orphan")
    reports = relationship("GrayReport", back_populates="session", cascade="all, delete-orphan")
    comments = relationship("SessionComment", back_populates="session", cascade="all, delete-orphan")
    snapshots = relationship("PageSnapshot", back_populates="session", cascade="all, delete-orphan")


class PageSnapshot(Base):
    __tablename__ = "page_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    snapshot_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    session = relationship("ReviewSession", back_populates="snapshots")


class ManualCorrection(Base):
    __tablename__ = "manual_corrections"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    correction_type = Column(SQLEnum(CorrectionType), nullable=False)
    target_item_id = Column(String(100), nullable=False)
    target_item_name = Column(String(200))
    
    original_judgment = Column(JSON, nullable=False)
    new_judgment = Column(JSON, nullable=False)
    changed_fields = Column(JSON, nullable=False)
    
    reason = Column(Text, nullable=False)
    impact_description = Column(Text)
    
    is_overridden = Column(Boolean, default=False)
    overridden_by_id = Column(Integer, ForeignKey("manual_corrections.id"))
    overridden_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    session = relationship("ReviewSession", back_populates="corrections")
    operator = relationship("User", back_populates="corrections")
    overrides = relationship("ManualCorrection", remote_side=[id])


class SampleLeakAlert(Base):
    __tablename__ = "sample_leak_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    
    leak_type = Column(String(100))
    suspected_cause = Column(Text)
    impact_scope = Column(JSON)
    affected_items = Column(JSON)
    affected_count = Column(Integer, default=0)
    
    status = Column(SQLEnum(LeakStatus), default=LeakStatus.DETECTED)
    confirmed_cause = Column(Text)
    confirmed_by = Column(Integer, ForeignKey("users.id"))
    confirmed_at = Column(DateTime(timezone=True))
    
    resolution_notes = Column(Text)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    
    session = relationship("ReviewSession", back_populates="leak_alerts")


class GrayReport(Base):
    __tablename__ = "gray_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    report_name = Column(String(200), nullable=False)
    report_version = Column(String(50), default="1.0")
    
    overall_summary = Column(Text)
    total_changed = Column(Integer, default=0)
    
    generated_by = Column(Integer, ForeignKey("users.id"))
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("ReviewSession", back_populates="reports")
    components = relationship("ReportComponent", back_populates="report", cascade="all, delete-orphan")


class ReportComponent(Base):
    __tablename__ = "report_components"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("gray_reports.id"), nullable=False)
    component_type = Column(SQLEnum(ReportComponentType), nullable=False)
    
    title = Column(String(200), nullable=False)
    summary = Column(Text)
    data = Column(JSON, nullable=False)
    changed_count = Column(Integer, default=0)
    
    report = relationship("GrayReport", back_populates="components")


class SessionComment(Base):
    __tablename__ = "session_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    comment_type = Column(String(50), default="note")
    content = Column(Text, nullable=False)
    metadata = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    session = relationship("ReviewSession", back_populates="comments")
    author = relationship("User", back_populates="comments")


class OperationGuide(Base):
    __tablename__ = "operation_guides"
    
    id = Column(Integer, primary_key=True, index=True)
    section_key = Column(String(100), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    position_hint = Column(String(100))
    icon = Column(String(50))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
