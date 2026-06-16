import enum
import hashlib
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Float, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class TaskStatus(str, enum.Enum):
    DRAFT = "draft"
    IMPORTED = "imported"
    CHECKING = "checking"
    CHECKED = "checked"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"
    REPORTED = "reported"


class CheckType(str, enum.Enum):
    LEAKAGE = "leakage"
    DISTRIBUTION = "distribution"
    DUPLICATE = "duplicate"
    DIFFICULTY = "difficulty"
    CATEGORY = "category"


class SeverityLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    BLOCKER = "blocker"


class SplitType(str, enum.Enum):
    TRAIN = "train"
    VAL = "val"
    TEST = "test"


class ActionType(str, enum.Enum):
    CREATE = "create"
    IMPORT = "import"
    CHECK = "check"
    REVIEW = "review"
    APPROVE = "approve"
    REJECT = "reject"
    EXPORT = "export"
    SPLIT_UPDATE = "split_update"
    DEDUP_UPDATE = "dedup_update"


class QuestionBank(Base):
    __tablename__ = "question_banks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    source = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship("Question", back_populates="bank", cascade="all, delete-orphan")
    tasks = relationship("CheckTask", back_populates="bank", cascade="all, delete-orphan")
    splits = relationship("DataSplit", back_populates="bank", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("question_banks.id"), nullable=False)
    question_id = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    answer = Column(Text, default="")
    category = Column(String(100), default="")
    difficulty = Column(String(50), default="")
    split_type = Column(Enum(SplitType), default=SplitType.TEST)
    human_note = Column(Text, default="")
    dedup_fingerprint = Column(String(64), index=True)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    bank = relationship("QuestionBank", back_populates="questions")

    @staticmethod
    def compute_fingerprint(content: str, answer: str = "") -> str:
        raw = (content.strip() + "|||" + answer.strip()).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()


class DataSplit(Base):
    __tablename__ = "data_splits"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("question_banks.id"), nullable=False)
    split_name = Column(String(100), nullable=False)
    split_type = Column(Enum(SplitType), nullable=False)
    question_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bank = relationship("QuestionBank", back_populates="splits")


class CheckTask(Base):
    __tablename__ = "check_tasks"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("question_banks.id"), nullable=False)
    task_name = Column(String(255), nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.DRAFT)
    check_types = Column(JSON, default=list)
    reviewer = Column(String(255), default="")
    review_comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bank = relationship("QuestionBank", back_populates="tasks")
    results = relationship("CheckResult", back_populates="task", cascade="all, delete-orphan")


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("check_tasks.id"), nullable=False)
    check_type = Column(Enum(CheckType), nullable=False)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.INFO)
    question_id = Column(String(255), nullable=True)
    detail = Column(Text, default="")
    plain_explanation = Column(Text, default="")
    action_hint = Column(String(255), default="")
    original_human_note = Column(Text, default="")
    is_blocking = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    resolution = Column(Text, default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("CheckTask", back_populates="results")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=True)
    bank_id = Column(Integer, nullable=True)
    action = Column(Enum(ActionType), nullable=False)
    actor = Column(String(255), default="system")
    detail = Column(Text, default="")
    snapshot = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
