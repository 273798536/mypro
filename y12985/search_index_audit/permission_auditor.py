"""权限审计模块 - 审计数据库权限配置"""

import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple

from .models import (
    PermissionAuditRecord,
    PermissionLevel,
    AuditStatus,
    SourceReference,
    RecordSource,
)
from .storage import AuditStorage
from .errors import PermissionRiskError


class PermissionAuditor:
    """权限审计器"""

    HIGH_RISK_TABLES = {"users", "accounts", "transactions", "payment", "secret", "config"}
    HIGH_RISK_PERMISSIONS = {PermissionLevel.ADMIN, PermissionLevel.OWNER}

    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def audit_permissions(
        self,
        permissions: List[dict],
        source_path: str,
        batch_id: Optional[str] = None,
    ) -> List[PermissionAuditRecord]:
        """
        审计权限列表

        Args:
            permissions: 权限列表，每项包含 user_id, user_name, table_name, permission_level, granted_at
            source_path: 来源文件路径
            batch_id: 数据批次 ID

        Returns:
            审计记录列表
        """
        records: List[PermissionAuditRecord] = []

        for perm in permissions:
            record_id = str(uuid.uuid4())
            level = PermissionLevel(perm["permission_level"])
            table_name = perm["table_name"].lower()

            risk_level, risk_reason = self._assess_risk(
                user_name=perm["user_name"],
                table_name=table_name,
                permission_level=level,
                granted_at=perm.get("granted_at"),
                grantor=perm.get("grantor"),
            )

            status = AuditStatus.NEEDS_REVIEW if risk_level in ("high", "critical") else AuditStatus.PASSED

            sources = [
                SourceReference(
                    source_type=RecordSource.PERMISSION_SCAN,
                    source_id=f"perm_{perm.get('id', record_id)}",
                    source_path=source_path,
                    details=f"用户 {perm['user_name']} 在 {table_name} 上的 {level.value} 权限",
                )
            ]

            record = PermissionAuditRecord(
                id=record_id,
                user_id=perm["user_id"],
                user_name=perm["user_name"],
                table_name=perm["table_name"],
                permission_level=level,
                granted_at=datetime.fromisoformat(perm["granted_at"]) if isinstance(perm.get("granted_at"), str) else perm.get("granted_at", datetime.now()),
                grantor=perm.get("grantor"),
                status=status,
                risk_level=risk_level,
                risk_reason=risk_reason,
                sources=sources,
            )

            self.storage.add_permission_audit(record, batch_id)
            records.append(record)

        return records

    def _assess_risk(
        self,
        user_name: str,
        table_name: str,
        permission_level: PermissionLevel,
        granted_at: Optional[datetime] = None,
        grantor: Optional[str] = None,
    ) -> Tuple[str, Optional[str]]:
        """
        评估权限风险等级

        Returns:
            (risk_level, risk_reason)
        """
        table_lower = table_name.lower()
        is_sensitive_table = any(t in table_lower for t in self.HIGH_RISK_TABLES)
        is_high_perm = permission_level in self.HIGH_RISK_PERMISSIONS

        if is_sensitive_table and is_high_perm:
            return (
                "critical",
                f"敏感表 {table_name} 被授予 {permission_level.value} 权限，存在数据泄露或篡改风险",
            )

        if is_high_perm:
            return (
                "high",
                f"用户被授予 {permission_level.value} 高权限，需确认是否为业务必需",
            )

        if is_sensitive_table:
            return (
                "medium",
                f"敏感表 {table_name} 的权限分配需定期复核",
            )

        return "low", None

    def get_high_risk_permissions(
        self,
        batch_id: Optional[str] = None,
    ) -> List[PermissionAuditRecord]:
        """获取高风险权限记录"""
        records = self.storage.get_permission_audits(batch_id)
        return [r for r in records if r.risk_level in ("high", "critical")]

    def get_permissions_needing_review(
        self,
        batch_id: Optional[str] = None,
    ) -> List[PermissionAuditRecord]:
        """获取需要复核的权限记录"""
        records = self.storage.get_permission_audits(batch_id)
        return [r for r in records if r.status == AuditStatus.NEEDS_REVIEW]

    def validate_import(
        self,
        records: List[PermissionAuditRecord],
        batch_id: Optional[str] = None,
        force: bool = False,
    ) -> Tuple[List[PermissionAuditRecord], List[str]]:
        """
        验证权限记录导入，检测重复

        Args:
            records: 待导入的权限记录
            batch_id: 数据批次 ID
            force: 是否强制覆盖

        Returns:
            (可导入的记录, 警告信息列表)
        """
        existing = self.storage.get_permission_audits(batch_id)
        existing_keys = {(r.user_id, r.table_name, r.permission_level.value) for r in existing}

        warnings: List[str] = []
        valid_records: List[PermissionAuditRecord] = []

        for r in records:
            key = (r.user_id, r.table_name, r.permission_level.value)
            if key in existing_keys:
                if force:
                    warnings.append(f"用户 {r.user_name} 在 {r.table_name} 的 {r.permission_level.value} 权限已存在，将被覆盖")
                    valid_records.append(r)
                else:
                    warnings.append(f"用户 {r.user_name} 在 {r.table_name} 的 {r.permission_level.value} 权限已存在，跳过")
            else:
                valid_records.append(r)

        return valid_records, warnings

    def trace_sources(self, record_id: str) -> List[SourceReference]:
        """追溯权限记录的来源"""
        records = self.storage.get_permission_audits()
        for r in records:
            if r.id == record_id:
                return r.sources
        return []
