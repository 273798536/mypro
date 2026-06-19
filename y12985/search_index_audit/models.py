"""数据模型定义"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class AuditStatus(str, Enum):
    """审计状态"""
    PASSED = "passed"
    FAILED = "failed"
    PENDING = "pending"
    NEEDS_REVIEW = "needs_review"


class IndexType(str, Enum):
    """索引类型"""
    B_TREE = "b_tree"
    HASH = "hash"
    FULLTEXT = "fulltext"
    GIN = "gin"
    GIST = "gist"


class PermissionLevel(str, Enum):
    """权限级别"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    OWNER = "owner"


class RecordSource(str, Enum):
    """记录来源 - 用于追溯"""
    MIGRATION_SCRIPT = "migration_script"
    SLOW_QUERY_LOG = "slow_query_log"
    BACKUP_SNAPSHOT = "backup_snapshot"
    MANUAL_INPUT = "manual_input"
    INDEX_SCAN = "index_scan"
    PERMISSION_SCAN = "permission_scan"


@dataclass
class SourceReference:
    """来源引用 - 用于结论溯源"""
    source_type: RecordSource
    source_id: str
    source_path: str
    line_number: Optional[int] = None
    details: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type.value,
            "source_id": self.source_id,
            "source_path": self.source_path,
            "line_number": self.line_number,
            "details": self.details,
        }


@dataclass
class IndexSuggestion:
    """索引建议"""
    id: str
    table_name: str
    column_names: List[str]
    index_type: IndexType
    suggestion_reason: str
    expected_improvement: float
    current_index_count: int
    status: AuditStatus = AuditStatus.PENDING
    sources: List[SourceReference] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    reviewed_by: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "table_name": self.table_name,
            "column_names": self.column_names,
            "index_type": self.index_type.value,
            "suggestion_reason": self.suggestion_reason,
            "expected_improvement": self.expected_improvement,
            "current_index_count": self.current_index_count,
            "status": self.status.value,
            "sources": [s.to_dict() for s in self.sources],
            "created_at": self.created_at.isoformat(),
            "reviewed_by": self.reviewed_by,
        }


@dataclass
class PermissionAuditRecord:
    """权限审计记录"""
    id: str
    user_id: str
    user_name: str
    table_name: str
    permission_level: PermissionLevel
    granted_at: datetime
    grantor: Optional[str] = None
    status: AuditStatus = AuditStatus.PENDING
    risk_level: str = "medium"
    risk_reason: Optional[str] = None
    sources: List[SourceReference] = field(default_factory=list)
    reviewed_by: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "table_name": self.table_name,
            "permission_level": self.permission_level.value,
            "granted_at": self.granted_at.isoformat(),
            "grantor": self.grantor,
            "status": self.status.value,
            "risk_level": self.risk_level,
            "risk_reason": self.risk_reason,
            "sources": [s.to_dict() for s in self.sources],
            "reviewed_by": self.reviewed_by,
        }


@dataclass
class SlowQueryRecord:
    """慢查询记录 - 用于归因"""
    id: str
    query_sql: str
    execution_time_ms: float
    rows_examined: int
    rows_sent: int
    timestamp: datetime
    table_name: Optional[str] = None
    attribution: Optional[str] = None
    attribution_details: Optional[str] = None
    sources: List[SourceReference] = field(default_factory=list)
    related_index_suggestion_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "query_sql": self.query_sql,
            "execution_time_ms": self.execution_time_ms,
            "rows_examined": self.rows_examined,
            "rows_sent": self.rows_sent,
            "timestamp": self.timestamp.isoformat(),
            "table_name": self.table_name,
            "attribution": self.attribution,
            "attribution_details": self.attribution_details,
            "sources": [s.to_dict() for s in self.sources],
            "related_index_suggestion_id": self.related_index_suggestion_id,
        }


@dataclass
class MigrationScript:
    """迁移脚本"""
    id: str
    version: str
    file_path: str
    page_number: int
    total_pages: int
    applied_at: Optional[datetime] = None
    is_applied: bool = False
    checksum: Optional[str] = None
    has_field_drift: bool = False
    drift_details: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "version": self.version,
            "file_path": self.file_path,
            "page_number": self.page_number,
            "total_pages": self.total_pages,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "is_applied": self.is_applied,
            "checksum": self.checksum,
            "has_field_drift": self.has_field_drift,
            "drift_details": self.drift_details,
        }


@dataclass
class BackupRecord:
    """备份记录"""
    id: str
    backup_name: str
    backup_time: datetime
    backup_size_bytes: int
    source_db: str
    status: AuditStatus = AuditStatus.PENDING
    can_use_directly: bool = False
    review_reason: Optional[str] = None
    integrity_verified: bool = False
    sources: List[SourceReference] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "backup_name": self.backup_name,
            "backup_time": self.backup_time.isoformat(),
            "backup_size_bytes": self.backup_size_bytes,
            "source_db": self.source_db,
            "status": self.status.value,
            "can_use_directly": self.can_use_directly,
            "review_reason": self.review_reason,
            "integrity_verified": self.integrity_verified,
            "sources": [s.to_dict() for s in self.sources],
        }


@dataclass
class AuditReport:
    """审计报告 - 统一数据源"""
    id: str
    name: str
    generated_at: datetime
    data_batch_id: str
    index_suggestion_count: int = 0
    index_suggestion_passed: int = 0
    permission_audit_count: int = 0
    permission_audit_needs_review: int = 0
    slow_query_count: int = 0
    backup_count: int = 0
    backup_can_use_directly: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "generated_at": self.generated_at.isoformat(),
            "data_batch_id": self.data_batch_id,
            "index_suggestion_count": self.index_suggestion_count,
            "index_suggestion_passed": self.index_suggestion_passed,
            "permission_audit_count": self.permission_audit_count,
            "permission_audit_needs_review": self.permission_audit_needs_review,
            "slow_query_count": self.slow_query_count,
            "backup_count": self.backup_count,
            "backup_can_use_directly": self.backup_can_use_directly,
        }
