from typing import List, Dict, Optional, Tuple, Any
from collections import defaultdict
import copy
from datetime import datetime
from .models import (
    SampleRecord,
    VersionEntry,
    AuditLogEntry,
    RecordStatus,
    ReviewAction,
    SourceMaterial,
)
from .utils import generate_id


class VersionControl:
    def __init__(self):
        self.version_history: Dict[str, List[VersionEntry]] = defaultdict(list)
        self.audit_log: List[AuditLogEntry] = []
        self.source_tracking: Dict[str, List[str]] = defaultdict(list)

    def create_version(
        self,
        record: SampleRecord,
        change_reason: str,
        changed_by: str,
    ) -> VersionEntry:
        snapshot = copy.deepcopy(record.to_dict())
        entry = VersionEntry(
            record_id=record.record_id,
            version=record.version,
            content_snapshot=snapshot,
            change_reason=change_reason,
            changed_by=changed_by,
            content_hash=record.content_hash,
        )
        self.version_history[record.record_id].append(entry)
        self.audit_log.append(AuditLogEntry(
            operation="create_version",
            record_id=record.record_id,
            user=changed_by,
            details={"version": record.version, "reason": change_reason}
        ))
        return entry

    def update_record(
        self,
        record: SampleRecord,
        prompt: Optional[str] = None,
        response: Optional[str] = None,
        label: Optional[str] = None,
        change_reason: str = "",
        changed_by: str = "system",
    ) -> SampleRecord:
        self.create_version(record, change_reason, changed_by)

        if prompt is not None:
            record.prompt = prompt
        if response is not None:
            record.response = response
        if label is not None:
            record.label = label

        record.version += 1
        record.recompute_hashes()
        record.modified_at = datetime.now()
        record.modified_by = changed_by

        self.audit_log.append(AuditLogEntry(
            operation="update_record",
            record_id=record.record_id,
            user=changed_by,
            details={"new_version": record.version, "fields_updated": [
                k for k, v in {"prompt": prompt, "response": response, "label": label}.items()
                if v is not None
            ]}
        ))
        return record

    def apply_review_action(
        self,
        record: SampleRecord,
        reviewer: str,
        action: ReviewAction,
        note: str,
    ) -> SampleRecord:
        self.create_version(record, f"复核操作: {action.value}", reviewer)

        record.add_review_note(reviewer, action, note)

        if action == ReviewAction.APPROVE:
            if record.status == RecordStatus.PENDING:
                record.status = RecordStatus.CLEAN
        elif action == ReviewAction.REJECT:
            record.status = RecordStatus.DIRTY
        elif action == ReviewAction.FIX_LABEL:
            record.status = RecordStatus.PENDING
        elif action == ReviewAction.FLAG_AS_LEAK:
            record.status = RecordStatus.LEAKED
            record.tags.append("train_val_leak")

        record.recompute_hashes()
        self.audit_log.append(AuditLogEntry(
            operation="review_action",
            record_id=record.record_id,
            user=reviewer,
            details={"action": action.value, "note": note}
        ))
        return record

    def get_version_history(self, record_id: str) -> List[VersionEntry]:
        return sorted(
            self.version_history.get(record_id, []),
            key=lambda v: v.version
        )

    def compare_versions(
        self, record_id: str, v1: int, v2: int
    ) -> Dict[str, Tuple[Any, Any]]:
        history = self.get_version_history(record_id)
        v1_entry = next((e for e in history if e.version == v1), None)
        v2_entry = next((e for e in history if e.version == v2), None)
        if not v1_entry or not v2_entry:
            return {}

        diffs = {}
        for key in ["prompt", "response", "label", "status"]:
            val1 = v1_entry.content_snapshot.get(key)
            val2 = v2_entry.content_snapshot.get(key)
            if val1 != val2:
                diffs[key] = (val1, val2)
        return diffs


class SecurityInterceptor:
    def __init__(self):
        self.blocked_operations: List[AuditLogEntry] = []
        self.verification_failures: List[Dict] = []

    def verify_source_material(
        self, record: SampleRecord, original_source: SourceMaterial
    ) -> Tuple[bool, List[str]]:
        issues = []
        if record.source_material.source_id != original_source.source_id:
            issues.append("来源材料ID不匹配")
        if record.source_material.file_path != original_source.file_path:
            issues.append("来源文件路径不匹配")
        if original_source.row_number is not None:
            if record.source_material.row_number != original_source.row_number:
                issues.append("来源行号不匹配")

        if issues:
            entry = AuditLogEntry(
                operation="security_verify_source",
                record_id=record.record_id,
                user="system",
                security_blocked=True,
                block_reason="; ".join(issues),
                details={
                    "record_source": record.source_material.to_dict(),
                    "original_source": original_source.to_dict(),
                }
            )
            self.blocked_operations.append(entry)
            return False, issues
        return True, []

    def verify_content_integrity(
        self, record: SampleRecord, expected_hash: str
    ) -> Tuple[bool, str]:
        actual_hash = record.content_hash
        if actual_hash != expected_hash:
            entry = AuditLogEntry(
                operation="security_verify_content",
                record_id=record.record_id,
                user="system",
                security_blocked=True,
                block_reason=f"内容哈希不匹配: expected={expected_hash[:16]} actual={actual_hash[:16]}",
                details={"expected_hash": expected_hash, "actual_hash": actual_hash}
            )
            self.blocked_operations.append(entry)
            return False, f"内容被篡改，预期哈希 {expected_hash[:16]}，实际 {actual_hash[:16]}"
        return True, ""

    def verify_no_leakage(self, record: SampleRecord) -> Tuple[bool, List[str]]:
        if record.status == RecordStatus.LEAKED:
            issues = ["记录已标记为训练验证泄漏"]
            entry = AuditLogEntry(
                operation="security_check_leak",
                record_id=record.record_id,
                user="system",
                security_blocked=True,
                block_reason="训练验证泄漏记录",
            )
            self.blocked_operations.append(entry)
            return False, issues
        return True, []

    def can_export(self, record: SampleRecord) -> Tuple[bool, List[str]]:
        issues = []
        if record.status != RecordStatus.CLEAN and record.status != RecordStatus.EXPORTED:
            issues.append(f"记录状态为 {record.status.value}，不可导出")
        if not record.review_notes:
            issues.append("记录未经过人工复核")

        ok, integrity_msg = self.verify_content_integrity(record, record.content_hash)
        if not ok:
            issues.append(integrity_msg)

        ok, leak_issues = self.verify_no_leakage(record)
        if not ok:
            issues.extend(leak_issues)

        if issues:
            entry = AuditLogEntry(
                operation="security_export_check",
                record_id=record.record_id,
                user="system",
                security_blocked=True,
                block_reason="; ".join(issues),
            )
            self.blocked_operations.append(entry)
            return False, issues
        return True, []

    def trace_back_to_source(self, record: SampleRecord) -> Dict[str, Any]:
        return {
            "record_id": record.record_id,
            "source_id": record.source_material.source_id,
            "source_file": record.source_material.file_path,
            "source_row": record.source_material.row_number,
            "source_sheet": record.source_material.sheet_name,
            "raw_content_preview": record.source_material.raw_content[:200],
            "retrieved_at": record.source_material.retrieved_at.isoformat(),
            "content_hash": record.content_hash,
            "version": record.version,
        }

    def print_security_report(self) -> str:
        lines = ["=" * 60, "安全拦截报告", "=" * 60]
        lines.append(f"拦截操作总数: {len(self.blocked_operations)}")

        if self.blocked_operations:
            lines.append("\n拦截详情:")
            for entry in self.blocked_operations:
                lines.append(f"  [{entry.timestamp.isoformat()}] {entry.operation}")
                lines.append(f"    记录: {entry.record_id}")
                lines.append(f"    原因: {entry.block_reason}")

        return "\n".join(lines)
