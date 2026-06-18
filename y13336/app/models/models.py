import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, Enum, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class BatchStatus(str, enum.Enum):
    draft = "draft"
    running = "running"
    completed = "completed"
    archived = "archived"


class RecallSide(str, enum.Enum):
    old = "old"
    new = "new"


class OverrideStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    superseded = "superseded"


class MaterialType(str, enum.Enum):
    ticket = "ticket"
    supplement_note = "supplement_note"
    supplement_desc = "supplement_desc"


class LeakStatus(str, enum.Enum):
    suspected = "suspected"
    confirmed = "confirmed"
    false_positive = "false_positive"


class GrayBatch(Base):
    __tablename__ = "gray_batch"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    old_model_version: Mapped[str] = mapped_column(String(100))
    new_model_version: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(Enum(BatchStatus), default=BatchStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    recalls: Mapped[list["RecallResult"]] = relationship(back_populates="batch")
    overrides: Mapped[list["OverrideRecord"]] = relationship(back_populates="batch")
    materials: Mapped[list["Material"]] = relationship(back_populates="batch")
    leaks: Mapped[list["LeakMark"]] = relationship(back_populates="batch")


class RecallResult(Base):
    __tablename__ = "recall_result"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(String(36), ForeignKey("gray_batch.id"))
    side: Mapped[str] = mapped_column(Enum(RecallSide))
    query_id: Mapped[str] = mapped_column(String(200))
    query_text: Mapped[str] = mapped_column(Text)
    doc_id: Mapped[str] = mapped_column(String(200))
    doc_title: Mapped[str] = mapped_column(String(500))
    rank: Mapped[int] = mapped_column(Integer)
    score: Mapped[float | None] = mapped_column(nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch: Mapped["GrayBatch"] = relationship(back_populates="recalls")


class OverrideRecord(Base):
    __tablename__ = "override_record"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(String(36), ForeignKey("gray_batch.id"))
    query_id: Mapped[str] = mapped_column(String(200))
    doc_id: Mapped[str] = mapped_column(String(200))
    original_side: Mapped[str] = mapped_column(Enum(RecallSide))
    original_judgment: Mapped[str] = mapped_column(String(50))
    override_judgment: Mapped[str] = mapped_column(String(50))
    reason: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(Enum(OverrideStatus), default=OverrideStatus.pending)
    superseded_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    operator: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch: Mapped["GrayBatch"] = relationship(back_populates="overrides")


class Material(Base):
    __tablename__ = "material"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(String(36), ForeignKey("gray_batch.id"))
    material_type: Mapped[str] = mapped_column(Enum(MaterialType))
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, default="")
    linked_query_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    linked_doc_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    operator: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch: Mapped["GrayBatch"] = relationship(back_populates="materials")


class LeakMark(Base):
    __tablename__ = "leak_mark"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(String(36), ForeignKey("gray_batch.id"))
    query_id: Mapped[str] = mapped_column(String(200))
    doc_id: Mapped[str] = mapped_column(String(200))
    impact_scope: Mapped[str] = mapped_column(Text, default="")
    source_line: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(Enum(LeakStatus), default=LeakStatus.suspected)
    operator: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch: Mapped["GrayBatch"] = relationship(back_populates="leaks")
