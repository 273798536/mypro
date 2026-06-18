"""核心数据模型定义"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class RecordType(str, Enum):
    """处理记录类型"""
    MIGRATION_DUPLICATE = "migration_duplicate"
    ROLLBACK = "rollback"
    SCHEMA_DIFF = "schema_diff"
    PAGINATION_ORDER = "pagination_order"
    ANOMALY_TRACE = "anomaly_trace"


class RecordStatus(str, Enum):
    """记录状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    REVIEW_PASSED = "review_passed"
    REJECTED = "rejected"
    RESOLVED = "resolved"


class ColumnType(BaseModel):
    """列类型定义"""
    name: str
    data_type: str
    is_nullable: bool = True
    default: Optional[str] = None
    comment: Optional[str] = None
    extra: Optional[str] = None


class IndexDefinition(BaseModel):
    """索引定义"""
    name: str
    columns: List[str]
    is_unique: bool = False
    index_type: str = "BTREE"


class TableSchema(BaseModel):
    """表结构定义"""
    table_name: str
    columns: List[ColumnType] = Field(default_factory=list)
    primary_key: List[str] = Field(default_factory=list)
    indexes: List[IndexDefinition] = Field(default_factory=list)
    engine: Optional[str] = None
    charset: Optional[str] = None
    comment: Optional[str] = None

    def to_hash(self) -> str:
        """生成表结构哈希，用于快速对比"""
        data = self.model_dump()
        return hashlib.sha256(json.dumps(data, default=str).encode()).hexdigest()


class SchemaSnapshot(BaseModel):
    """表结构快照"""
    snapshot_id: Optional[str] = None
    batch_id: str
    table_schema: TableSchema
    snapshot_time: datetime = Field(default_factory=datetime.now)
    source: str = Field(..., description="快照来源: cache/db/manual等")
    operator: Optional[str] = None
    remark: Optional[str] = None

    @model_validator(mode="after")
    def generate_snapshot_id(self) -> "SchemaSnapshot":
        if self.snapshot_id:
            return self
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
        raw = f"{self.batch_id}:{self.table_schema.table_name}:{ts}"
        self.snapshot_id = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return self


class DiffConclusion(str, Enum):
    """差异结论类型"""
    MATCH = "match"
    TYPE_MISMATCH = "type_mismatch"
    COLUMN_MISSING = "column_missing"
    COLUMN_EXTRA = "column_extra"
    INDEX_MISMATCH = "index_mismatch"
    PK_MISMATCH = "pk_mismatch"
    MULTIPLE_DIFFS = "multiple_diffs"


class SchemaDiffItem(BaseModel):
    """单条结构差异项"""
    diff_type: DiffConclusion
    column_name: Optional[str] = None
    field: Optional[str] = None
    cache_value: Optional[Any] = None
    db_value: Optional[Any] = None
    description: Optional[str] = None


class SchemaDiffResult(BaseModel):
    """Schema对比结果，回滚和schema对比共用"""
    cache_snapshot_id: str
    db_snapshot_id: str
    table_name: str
    conclusion: DiffConclusion
    diffs: List[SchemaDiffItem] = Field(default_factory=list)
    compare_time: datetime = Field(default_factory=datetime.now)

    def has_diff(self) -> bool:
        return self.conclusion != DiffConclusion.MATCH


class MigrationExecutionRecord(BaseModel):
    """迁移执行记录"""
    migration_name: str
    execution_time: datetime
    checksum: Optional[str] = None
    execution_order: int
    success: bool = True
    error_message: Optional[str] = None


class DuplicateMigrationInfo(BaseModel):
    """重复迁移信息"""
    migration_name: str
    executions: List[MigrationExecutionRecord] = Field(default_factory=list)
    first_execution: datetime
    last_execution: datetime
    execution_count: int

    @property
    def is_duplicate(self) -> bool:
        return self.execution_count > 1


class PaginationOrderConfig(BaseModel):
    """分页顺序配置 - 用于处理分页顺序不稳定问题"""
    table_name: str
    order_by_columns: List[str] = Field(default_factory=list)
    is_stable: bool = False
    review_status: RecordStatus = RecordStatus.PENDING
    reviewer: Optional[str] = None
    review_time: Optional[datetime] = None
    review_comment: Optional[str] = None
    change_reason: Optional[str] = None


class AuditAction(str, Enum):
    """审计动作类型"""
    SNAPSHOT_MODIFIED = "snapshot_modified"
    CONCLUSION_CHANGED = "conclusion_changed"
    PAGINATION_REVIEWED = "pagination_reviewed"
    RECORD_CONFIRMED = "record_confirmed"
    ROLLBACK_PERFORMED = "rollback_performed"
    REVIEW_PASSED = "review_passed"


class AuditLog(BaseModel):
    """审计日志 - 记录谁改的、什么时候改的、为什么改"""
    log_id: Optional[str] = None
    batch_id: str
    action: AuditAction
    operator: str
    action_time: datetime = Field(default_factory=datetime.now)
    target_type: str
    target_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    reason: Optional[str] = None
    comment: Optional[str] = None

    @model_validator(mode="after")
    def generate_log_id(self) -> "AuditLog":
        if self.log_id:
            return self
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
        raw = f"{self.batch_id}:{self.action.value}:{ts}"
        self.log_id = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return self


class ProcessingOpinion(BaseModel):
    """处理意见"""
    handler: str
    opinion: str
    handle_time: datetime = Field(default_factory=datetime.now)
    suggestion: Optional[str] = None


class ProcessingRecord(BaseModel):
    """统一处理记录 - 回滚记录和schema对比共用同一批处理记录"""
    record_id: Optional[str] = None
    batch_id: str
    record_type: RecordType
    status: RecordStatus = RecordStatus.PENDING
    table_name: Optional[str] = None
    migration_name: Optional[str] = None
    schema_diff: Optional[SchemaDiffResult] = None
    duplicate_info: Optional[DuplicateMigrationInfo] = None
    pagination_config: Optional[PaginationOrderConfig] = None
    snapshot_refs: List[str] = Field(default_factory=list, description="关联的快照ID")
    related_record_ids: List[str] = Field(default_factory=list, description="关联的其他处理记录ID")
    opinions: List[ProcessingOpinion] = Field(default_factory=list)
    create_time: datetime = Field(default_factory=datetime.now)
    update_time: datetime = Field(default_factory=datetime.now)
    creator: Optional[str] = None

    @model_validator(mode="after")
    def generate_record_id(self) -> "ProcessingRecord":
        if self.record_id:
            return self
        table = self.table_name or self.migration_name or ""
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
        raw = f"{self.batch_id}:{self.record_type.value}:{table}:{ts}"
        self.record_id = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return self


class AnomalyTrace(BaseModel):
    """异常追溯链 - 顺着异常能查到表结构快照和处理意见"""
    anomaly_id: Optional[str] = None
    batch_id: str
    anomaly_description: str
    anomaly_type: str
    root_record_id: str
    snapshot_chain: List[str] = Field(default_factory=list, description="按时间顺序的快照ID链")
    record_chain: List[str] = Field(default_factory=list, description="按时间顺序的处理记录ID链")
    discovered_time: datetime = Field(default_factory=datetime.now)
    is_resolved: bool = False
    resolution_summary: Optional[str] = None
    resolver: Optional[str] = None

    @model_validator(mode="after")
    def generate_anomaly_id(self) -> "AnomalyTrace":
        if self.anomaly_id:
            return self
        ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
        raw = f"{self.batch_id}:{self.anomaly_description}:{ts}"
        self.anomaly_id = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return self


class BatchInfo(BaseModel):
    """批次信息 - 保证同一批材料重复跑不乱"""
    batch_id: str
    input_dir: str
    output_dir: str
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    record_count: int = 0
    is_rerun: bool = False
    rerun_of_batch: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None
