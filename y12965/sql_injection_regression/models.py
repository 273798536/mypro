from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from .config import SourceRef


class MaterialType(str, Enum):
    SLOW_QUERY_LOG = "slow_query_log"
    ROLLBACK_LOG = "rollback_log"
    MIGRATION_SCRIPT = "migration_script"
    INDEX_SUGGESTION = "index_suggestion"
    SQL_AUDIT_REPORT = "sql_audit_report"
    CHAT_HISTORY = "chat_history"


class MaterialVersion(BaseModel):
    version_id: str
    material_hash: str
    file_name: str
    imported_at: datetime
    material_type: MaterialType
    source_ref: SourceRef
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SlowQueryFinding(BaseModel):
    finding_id: str
    query: str
    execution_time_ms: float
    rows_examined: int
    root_cause: str
    severity: str
    source_ref: SourceRef
    related_migration: Optional[str] = None
    confidence: float = 0.0
    sre_review_required: bool = False


class RollbackRecord(BaseModel):
    record_id: str
    migration_script_id: str
    rollback_reason: str
    rollback_time: datetime
    affected_queries: List[str]
    source_ref: SourceRef
    sre_review_required: bool = False


class IndexSuggestion(BaseModel):
    suggestion_id: str
    table_name: str
    suggested_index: str
    benefit_description: str
    source_ref: SourceRef
    evidence_source_refs: List[SourceRef] = Field(default_factory=list)
    sre_review_required: bool = False


class MigrationScript(BaseModel):
    script_id: str
    file_name: str
    version: str
    sql_content: str
    source_ref: SourceRef
    linked_findings: List[str] = Field(default_factory=list)
    linked_rollbacks: List[str] = Field(default_factory=list)


class RegressionReport(BaseModel):
    report_id: str
    generated_at: datetime
    case_id: str
    material_versions: List[MaterialVersion]
    slow_query_findings: List[SlowQueryFinding]
    rollback_records: List[RollbackRecord]
    index_suggestions: List[IndexSuggestion]
    migration_scripts: List[MigrationScript]
    summary: "ReportSummary"


class ReportSummary(BaseModel):
    total_findings: int
    safe_to_use_count: int
    needs_sre_review_count: int
    slow_queries_analyzed: int
    rollbacks_found: int
    index_suggestions_count: int
    migrations_reviewed: int
