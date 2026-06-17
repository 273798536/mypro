from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
import uuid

FINDING_TYPES = {
    "BACKUP_GAP": "备份缺口",
    "FK_CHAIN_BREAK": "外键断链",
    "PERMISSION_LEAK": "权限泄漏",
    "ORPHAN_TENANT": "孤立租户",
    "MIGRATION_FAILED": "迁移脚本执行失败",
    "UNREVIEWED_RECORD": "未复核记录",
    "ROLE_OVERPRIVILEGED": "角色超权",
    "CROSS_TENANT_ACCESS": "跨租户访问风险",
}

RISK_LEVELS = {
    "CRITICAL": "严重",
    "HIGH": "高危",
    "MEDIUM": "中危",
    "LOW": "低危",
}

REVIEW_STATUSES = {
    "PENDING": "待复核",
    "APPROVED": "复核通过",
    "REJECTED": "复核驳回",
    "NEEDS_FIX": "待修复",
    "FIXED": "已修复",
}


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


@dataclass
class Tenant:
    tenant_id: str
    tenant_name: str
    environment: str
    created_at: str = field(default_factory=_now_iso)
    description: Optional[str] = None


@dataclass
class MigrationScript:
    script_id: str
    version: str
    name: str
    filepath: str
    content: str
    applied_at: Optional[str] = None
    status: str = "PENDING"
    error_message: Optional[str] = None
    applied_by: Optional[str] = None


@dataclass
class PermissionRule:
    rule_id: str
    tenant_id: str
    role_name: str
    resource: str
    action: str
    granted_by: Optional[str] = None
    granted_at: str = field(default_factory=_now_iso)
    is_active: bool = True
    comment: Optional[str] = None


@dataclass
class ProcessingRecord:
    record_id: str
    batch_no: str
    record_type: str
    tenant_id: str
    migration_script_id: Optional[str] = None
    permission_rule_id: Optional[str] = None
    source_table: Optional[str] = None
    source_pk: Optional[str] = None
    target_table: Optional[str] = None
    target_pk: Optional[str] = None
    processed_at: str = field(default_factory=_now_iso)
    processed_by: Optional[str] = None
    status: str = "PENDING"
    raw_payload: Optional[str] = None
    comment: Optional[str] = None


@dataclass
class AuditFinding:
    finding_id: str = field(default_factory=_new_id)
    finding_type: str = ""
    risk_level: str = "MEDIUM"
    title: str = ""
    description: str = ""
    processing_record_id: Optional[str] = None
    tenant_id: Optional[str] = None
    migration_script_id: Optional[str] = None
    permission_rule_id: Optional[str] = None
    source_tables: List[str] = field(default_factory=list)
    affected_rows: int = 0
    evidence: Optional[str] = None
    detected_at: str = field(default_factory=_now_iso)
    review_status: str = "PENDING"
    handler_opinion: Optional[str] = None


@dataclass
class ReviewHistory:
    review_id: str = field(default_factory=_new_id)
    finding_id: str = ""
    action: str = ""
    reviewer: str = ""
    reviewed_at: str = field(default_factory=_now_iso)
    old_status: str = ""
    new_status: str = ""
    comment: str = ""
