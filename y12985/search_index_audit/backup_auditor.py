"""备份记录审计模块 - 区分可直接用 / 需复核"""

import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple

from .models import (
    BackupRecord,
    AuditStatus,
    SourceReference,
    RecordSource,
)
from .storage import AuditStorage
from .errors import BackupVerificationError


class BackupAuditor:
    """备份审计器"""

    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def audit_backups(
        self,
        backups: List[dict],
        source_path: str,
        batch_id: Optional[str] = None,
    ) -> List[BackupRecord]:
        """
        审计备份记录

        Args:
            backups: 备份列表，每项包含 backup_name, backup_time, backup_size_bytes, source_db
            source_path: 来源文件路径
            batch_id: 数据批次 ID

        Returns:
            审计后的备份记录列表
        """
        records: List[BackupRecord] = []

        for b in backups:
            record_id = str(uuid.uuid4())

            can_use, status, reason = self._assess_backup(b)

            sources = [
                SourceReference(
                    source_type=RecordSource.BACKUP_SNAPSHOT,
                    source_id=f"backup_{b.get('id', record_id)}",
                    source_path=source_path,
                    details=f"备份 {b['backup_name']} ({b['source_db']})",
                )
            ]

            record = BackupRecord(
                id=record_id,
                backup_name=b["backup_name"],
                backup_time=datetime.fromisoformat(b["backup_time"]) if isinstance(b.get("backup_time"), str) else b.get("backup_time", datetime.now()),
                backup_size_bytes=b["backup_size_bytes"],
                source_db=b["source_db"],
                status=status,
                can_use_directly=can_use,
                review_reason=reason,
                integrity_verified=b.get("integrity_verified", False),
                sources=sources,
            )

            self.storage.add_backup_record(record, batch_id)
            records.append(record)

        return records

    def _assess_backup(self, backup: dict) -> Tuple[bool, AuditStatus, Optional[str]]:
        """
        评估备份是否可直接使用

        Returns:
            (can_use_directly, status, review_reason)
        """
        reasons = []

        if not backup.get("integrity_verified", False):
            reasons.append("完整性未验证")

        backup_time = backup.get("backup_time")
        if isinstance(backup_time, str):
            backup_time = datetime.fromisoformat(backup_time)

        if backup_time:
            age_days = (datetime.now() - backup_time).days
            if age_days > 30:
                reasons.append(f"备份已超过 {age_days} 天，数据可能过时")

        size_bytes = backup.get("backup_size_bytes", 0)
        if size_bytes == 0:
            reasons.append("备份大小为 0，可能为空备份")
        elif size_bytes < 1024:
            reasons.append("备份文件过小，可能不完整")

        if not reasons:
            return True, AuditStatus.PASSED, None

        if "完整性未验证" in reasons and len(reasons) == 1:
            return False, AuditStatus.NEEDS_REVIEW, "；".join(reasons) + "，建议联系安全审计员复核"

        return False, AuditStatus.FAILED, "；".join(reasons) + "，需安全审计员处理"

    def get_direct_use_backups(
        self,
        batch_id: Optional[str] = None,
    ) -> List[BackupRecord]:
        """获取可直接使用的备份"""
        records = self.storage.get_backup_records(batch_id)
        return [r for r in records if r.can_use_directly]

    def get_backups_needing_review(
        self,
        batch_id: Optional[str] = None,
    ) -> List[BackupRecord]:
        """获取需要复核的备份"""
        records = self.storage.get_backup_records(batch_id)
        return [r for r in records if not r.can_use_directly and r.status == AuditStatus.NEEDS_REVIEW]

    def get_backup_summary(
        self,
        batch_id: Optional[str] = None,
    ) -> Dict[str, any]:
        """获取备份审计摘要"""
        records = self.storage.get_backup_records(batch_id)

        summary = {
            "total": len(records),
            "can_use_directly": 0,
            "needs_review": 0,
            "failed": 0,
            "by_db": {},
        }

        for r in records:
            if r.can_use_directly:
                summary["can_use_directly"] += 1
            elif r.status == AuditStatus.NEEDS_REVIEW:
                summary["needs_review"] += 1
            else:
                summary["failed"] += 1

            summary["by_db"][r.source_db] = summary["by_db"].get(r.source_db, 0) + 1

        return summary

    def verify_backup_integrity(
        self,
        backup_id: str,
        is_valid: bool,
        reviewer: Optional[str] = None,
    ) -> BackupRecord:
        """
        验证备份完整性

        Args:
            backup_id: 备份记录 ID
            is_valid: 是否通过验证
            reviewer: 复核人

        Returns:
            更新后的备份记录

        Raises:
            BackupVerificationError: 验证失败时
        """
        records = self.storage.get_backup_records()
        target = None

        for r in records:
            if r.id == backup_id:
                target = r
                break

        if not target:
            raise BackupVerificationError(
                backup_name=backup_id,
                reason="备份记录不存在",
            )

        if is_valid:
            target.integrity_verified = True
            target.status = AuditStatus.PASSED
            target.can_use_directly = True
            target.review_reason = None
        else:
            target.integrity_verified = False
            target.status = AuditStatus.FAILED
            target.review_reason = "完整性验证失败，存在数据损坏"
            raise BackupVerificationError(
                backup_name=target.backup_name,
                reason="完整性验证失败，存在数据损坏",
            )

        return target

    def trace_backup_sources(self, backup_id: str) -> List[SourceReference]:
        """追溯备份的来源材料"""
        records = self.storage.get_backup_records()
        for r in records:
            if r.id == backup_id:
                return r.sources
        return []
