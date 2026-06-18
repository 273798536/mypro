from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class DataDictionary(Base):
    __tablename__ = "data_dictionary"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(255), index=True, nullable=False, comment="来源表名")
    column_name = Column(String(255), index=True, nullable=False, comment="字段名")
    data_type = Column(String(64), comment="字段类型")
    expected_timezone = Column(String(32), comment="期望时区,如 UTC/Asia/Shanghai")
    description = Column(Text, comment="字段备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    conclusions = relationship("AuditConclusion", back_populates="dictionary")


class SourceRecord(Base):
    __tablename__ = "source_record"

    id = Column(Integer, primary_key=True, index=True)
    source_table = Column(String(255), index=True, nullable=False, comment="来源表名")
    source_row_number = Column(Integer, comment="原始行号")
    source_file = Column(String(512), comment="原始文件名/图片名")
    source_remark = Column(Text, comment="来源备注")
    import_batch = Column(String(64), index=True, comment="导入批次号")
    column_name = Column(String(255), comment="字段名")
    column_value = Column(Text, comment="字段原始值")
    detected_timezone = Column(String(32), comment="检测到的时区")
    record_hash = Column(String(64), index=True, comment="记录去重哈希")
    is_supplement = Column(Boolean, default=False, comment="是否补录数据")
    created_at = Column(DateTime, default=datetime.now)

    process_logs = relationship("ProcessLog", back_populates="source_record")
    conclusions = relationship("AuditConclusion", back_populates="source_record")


class ProcessLog(Base):
    __tablename__ = "process_log"

    id = Column(Integer, primary_key=True, index=True)
    source_record_id = Column(Integer, ForeignKey("source_record.id"), index=True)
    process_type = Column(String(32), index=True, comment="处理类型: import/supplement/deduplicate")
    process_batch = Column(String(64), index=True, comment="处理批次")
    operator = Column(String(64), comment="操作人")
    before_value = Column(Text, comment="处理前值")
    after_value = Column(Text, comment="处理后值")
    timezone_before = Column(String(32), comment="处理前时区")
    timezone_after = Column(String(32), comment="处理后时区")
    remark = Column(Text, comment="处理备注")
    created_at = Column(DateTime, default=datetime.now)

    source_record = relationship("SourceRecord", back_populates="process_logs")


class AuditConclusion(Base):
    __tablename__ = "audit_conclusion"

    id = Column(Integer, primary_key=True, index=True)
    source_record_id = Column(Integer, ForeignKey("source_record.id"), index=True)
    dictionary_id = Column(Integer, ForeignKey("data_dictionary.id"), index=True)
    audit_type = Column(String(32), index=True, comment="审计类型: backup/permission/timezone")
    status = Column(String(32), index=True, comment="状态: pass/index_invalid/duplicate/timezone_mismatch/pending")
    conclusion = Column(Text, comment="审计结论")
    index_valid = Column(Boolean, default=True, comment="索引是否有效")
    is_duplicate = Column(Boolean, default=False, comment="是否重复结论")
    duplicate_of_id = Column(Integer, comment="重复的原始结论ID")
    auditor = Column(String(64), comment="审计人")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    source_record = relationship("SourceRecord", back_populates="conclusions")
    dictionary = relationship("DataDictionary", back_populates="conclusions")
