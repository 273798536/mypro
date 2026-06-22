from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question_no = Column(String(100), index=True, nullable=False)
    title = Column(String(500), nullable=False)
    formula = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    difficulty = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_active = Column(Boolean, default=True)

    parameters = relationship("ParameterVersion", back_populates="question", cascade="all, delete-orphan")
    supplements = relationship("SupplementRecord", back_populates="question", cascade="all, delete-orphan")


class ParameterVersion(Base):
    __tablename__ = "parameter_versions"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    version_no = Column(String(50), nullable=False)
    param_name = Column(String(200), nullable=False)
    param_value = Column(String(500), nullable=True)
    unit = Column(String(100), nullable=True)
    boundary_condition = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    data_type = Column(String(50), default="string")
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    remark = Column(Text, nullable=True)

    question = relationship("Question", back_populates="parameters")
    change_logs = relationship("ChangeLog", back_populates="parameter", cascade="all, delete-orphan")


class SupplementRecord(Base):
    __tablename__ = "supplement_records"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    batch_no = Column(String(100), nullable=True)
    supplement_type = Column(String(100), nullable=False)
    content = Column(Text, nullable=True)
    source = Column(String(200), nullable=True)
    recorded_by = Column(String(100), nullable=True)
    recorded_at = Column(DateTime, default=datetime.now)
    remark = Column(Text, nullable=True)

    question = relationship("Question", back_populates="supplements")


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(100), index=True, nullable=False)
    file_name = Column(String(500), nullable=False)
    file_hash = Column(String(128), index=True, nullable=False)
    file_size = Column(Integer, nullable=True)
    import_type = Column(String(100), nullable=False)
    total_count = Column(Integer, default=0)
    new_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    updated_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    sort_stable = Column(Boolean, default=True)
    status = Column(String(50), default="completed")
    error_message = Column(Text, nullable=True)
    missing_materials = Column(Text, nullable=True)
    imported_by = Column(String(100), nullable=True)
    imported_at = Column(DateTime, default=datetime.now)
    detail = Column(JSON, nullable=True)

    items = relationship("ImportItem", back_populates="import_record", cascade="all, delete-orphan")


class ImportItem(Base):
    __tablename__ = "import_items"

    id = Column(Integer, primary_key=True, index=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    row_no = Column(Integer, nullable=True)
    item_key = Column(String(200), nullable=True)
    status = Column(String(50), nullable=False)
    detail = Column(JSON, nullable=True)
    remark = Column(Text, nullable=True)

    import_record = relationship("ImportRecord", back_populates="items")


class ChangeLog(Base):
    __tablename__ = "change_logs"

    id = Column(Integer, primary_key=True, index=True)
    parameter_id = Column(Integer, ForeignKey("parameter_versions.id"), nullable=True)
    target_type = Column(String(100), nullable=False)
    target_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)
    field_name = Column(String(200), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(String(100), nullable=True)
    changed_at = Column(DateTime, default=datetime.now)
    batch_no = Column(String(100), nullable=True)
    remark = Column(Text, nullable=True)

    parameter = relationship("ParameterVersion", back_populates="change_logs")
