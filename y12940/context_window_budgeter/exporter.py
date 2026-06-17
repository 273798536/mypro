from typing import List, Dict, Optional, Tuple, Any
from collections import defaultdict
from datetime import datetime
import json
import csv
import hashlib
import os
import io

from .models import (
    SampleRecord,
    RecordStatus,
    ExportPackage,
    AuditLogEntry,
)
from .version_control import SecurityInterceptor
from .utils import generate_id


class ExportValidationResult:
    def __init__(self):
        self.passed: List[str] = []
        self.failed: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.hash_mismatches: List[Dict[str, Any]] = []
        self.duplicate_check: Dict[str, Any] = {}
        self.label_consistency: Dict[str, Any] = {}
        self.source_traceability: Dict[str, Any] = {}

    @property
    def is_valid(self) -> bool:
        return len(self.failed) == 0 and len(self.hash_mismatches) == 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "passed_count": len(self.passed),
            "failed_count": len(self.failed),
            "warning_count": len(self.warnings),
            "passed": self.passed,
            "failed": self.failed,
            "warnings": self.warnings,
            "hash_mismatches": self.hash_mismatches,
            "duplicate_check": self.duplicate_check,
            "label_consistency": self.label_consistency,
            "source_traceability": self.source_traceability,
        }


class Exporter:
    def __init__(self, security: SecurityInterceptor, output_dir: str = "./exports"):
        self.security = security
        self.output_dir = output_dir
        self.audit_log: List[AuditLogEntry] = []
        os.makedirs(output_dir, exist_ok=True)

    def validate_export(
        self,
        records: List[SampleRecord],
        expected_hashes: Optional[Dict[str, str]] = None,
    ) -> ExportValidationResult:
        result = ExportValidationResult()

        seen_hashes: Dict[str, List[str]] = defaultdict(list)
        label_counts: Dict[str, int] = defaultdict(int)
        source_missing: List[str] = []

        for record in records:
            record_ok = True

            ok, issues = self.security.can_export(record)
            if not ok:
                record_ok = False
                result.failed.append({
                    "record_id": record.record_id,
                    "reason": "; ".join(issues),
                    "status": record.status.value,
                })

            if expected_hashes and record.record_id in expected_hashes:
                expected = expected_hashes[record.record_id]
                if record.content_hash != expected:
                    record_ok = False
                    result.hash_mismatches.append({
                        "record_id": record.record_id,
                        "expected_hash": expected,
                        "actual_hash": record.content_hash,
                    })

            if not record.source_material.source_id:
                source_missing.append(record.record_id)

            seen_hashes[record.deduplication_hash].append(record.record_id)
            label_counts[record.label] += 1

            if record_ok:
                result.passed.append(record.record_id)
            else:
                for issue in issues:
                    if "未经过人工复核" in issue:
                        result.warnings.append({
                            "record_id": record.record_id,
                            "warning": "建议先经过人工复核再导出",
                        })

        result.duplicate_check = {
            "total_unique": len(seen_hashes),
            "duplicate_groups": [
                {"hash": h, "record_ids": ids, "count": len(ids)}
                for h, ids in seen_hashes.items() if len(ids) > 1
            ],
        }

        result.label_consistency = {
            "distribution": dict(label_counts),
            "total_labels": len(label_counts),
            "min_count": min(label_counts.values()) if label_counts else 0,
            "max_count": max(label_counts.values()) if label_counts else 0,
        }

        result.source_traceability = {
            "total_records": len(records),
            "records_with_source": len(records) - len(source_missing),
            "records_missing_source": source_missing,
        }

        self.audit_log.append(AuditLogEntry(
            operation="validate_export",
            details={
                "total_records": len(records),
                "passed": len(result.passed),
                "failed": len(result.failed),
                "warnings": len(result.warnings),
            }
        ))

        return result

    def create_export_package(
        self,
        records: List[SampleRecord],
        exported_by: str,
        expected_hashes: Optional[Dict[str, str]] = None,
    ) -> Tuple[ExportPackage, ExportValidationResult]:
        validation = self.validate_export(records, expected_hashes)

        exportable = [r for r in records if r.record_id in validation.passed]

        package = ExportPackage(
            export_id=generate_id("exp"),
            records=exportable,
            exported_by=exported_by,
        )
        package.compute_manifest()
        package.validation_result = validation.to_dict()

        for record in exportable:
            record.status = RecordStatus.EXPORTED

        self.audit_log.append(AuditLogEntry(
            operation="create_export_package",
            details={
                "export_id": package.export_id,
                "exported_by": exported_by,
                "record_count": len(exportable),
                "manifest_hash": package.manifest_hash,
            }
        ))

        return package, validation

    def export_json(
        self,
        package: ExportPackage,
        filename: Optional[str] = None,
    ) -> str:
        if filename is None:
            filename = f"export_{package.export_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(self.output_dir, filename)

        export_data = {
            "manifest": package.to_dict(),
            "security_intercepted": len(self.security.blocked_operations),
            "records": [r.to_dict() for r in package.records],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        self.audit_log.append(AuditLogEntry(
            operation="export_json",
            details={"filepath": filepath, "record_count": len(package.records)}
        ))

        return filepath

    def export_jsonl(
        self,
        package: ExportPackage,
        filename: Optional[str] = None,
        include_labels: bool = True,
    ) -> str:
        if filename is None:
            filename = f"export_{package.export_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            for record in package.records:
                entry = {
                    "prompt": record.prompt,
                    "response": record.response,
                }
                if include_labels:
                    entry["label"] = record.label
                entry["record_id"] = record.record_id
                entry["content_hash"] = record.content_hash
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")

        self.audit_log.append(AuditLogEntry(
            operation="export_jsonl",
            details={"filepath": filepath, "record_count": len(package.records)}
        ))

        return filepath

    def export_csv(
        self,
        package: ExportPackage,
        filename: Optional[str] = None,
    ) -> str:
        if filename is None:
            filename = f"export_{package.export_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "record_id", "label", "prompt", "response",
                "tokens_prompt", "tokens_response", "total_tokens",
                "version", "content_hash", "source_id",
            ])
            for r in package.records:
                writer.writerow([
                    r.record_id, r.label, r.prompt, r.response,
                    r.tokens_prompt, r.tokens_response, r.estimate_tokens(),
                    r.version, r.content_hash, r.source_material.source_id,
                ])

        self.audit_log.append(AuditLogEntry(
            operation="export_csv",
            details={"filepath": filepath, "record_count": len(package.records)}
        ))

        return filepath

    def verify_export_integrity(
        self,
        filepath: str,
        expected_manifest_hash: str,
    ) -> Tuple[bool, Dict[str, Any]]:
        if not os.path.exists(filepath):
            return False, {"error": "文件不存在"}

        with open(filepath, "r", encoding="utf-8") as f:
            if filepath.endswith(".json"):
                data = json.load(f)
                records = data.get("records", [])
            elif filepath.endswith(".jsonl"):
                records = []
                for line in f:
                    line = line.strip()
                    if line:
                        records.append(json.loads(line))
            else:
                return False, {"error": "不支持的文件格式"}

        record_hashes = sorted(r.get("content_hash", "") for r in records)
        manifest_content = "|".join(record_hashes)
        actual_manifest = hashlib.sha256(manifest_content.encode("utf-8")).hexdigest()

        is_valid = actual_manifest == expected_manifest_hash

        details = {
            "filepath": filepath,
            "expected_manifest": expected_manifest_hash,
            "actual_manifest": actual_manifest,
            "record_count": len(records),
            "is_valid": is_valid,
        }

        self.audit_log.append(AuditLogEntry(
            operation="verify_export_integrity",
            details=details,
        ))

        return is_valid, details

    def print_export_report(
        self,
        package: ExportPackage,
        validation: ExportValidationResult,
    ) -> str:
        lines = ["=" * 70, "导出验证报告", "=" * 70]
        lines.append(f"导出ID: {package.export_id}")
        lines.append(f"导出人: {package.exported_by}")
        lines.append(f"导出时间: {package.exported_at.isoformat()}")
        lines.append(f"清单哈希: {package.manifest_hash}")
        lines.append(f"导出记录数: {len(package.records)} / {len(validation.passed) + len(validation.failed)}")

        lines.append("\n✅ 验证通过:")
        for rid in validation.passed:
            lines.append(f"  - {rid}")

        if validation.failed:
            lines.append("\n❌ 验证失败:")
            for item in validation.failed:
                lines.append(f"  - {item['record_id']}: {item['reason']}")

        if validation.warnings:
            lines.append("\n⚠️  警告:")
            for item in validation.warnings:
                lines.append(f"  - {item['record_id']}: {item['warning']}")

        if validation.hash_mismatches:
            lines.append("\n🔴 哈希不匹配（疑似篡改）:")
            for item in validation.hash_mismatches:
                lines.append(f"  - {item['record_id']}: 预期={item['expected_hash'][:16]} 实际={item['actual_hash'][:16]}")

        dup = validation.duplicate_check
        if dup.get("duplicate_groups"):
            lines.append(f"\n🔄 导出内重复检查: {len(dup['duplicate_groups'])} 组重复")

        labels = validation.label_consistency
        lines.append(f"\n🏷️  标签分布: {labels['distribution']}")

        source = validation.source_traceability
        lines.append(f"\n🔍 来源可追溯: {source['records_with_source']}/{source['total_records']}")

        lines.append(f"\n{'='*70}")
        lines.append(f"{'✅ 所有验证通过，可以安全导出' if validation.is_valid else '❌ 存在问题，请先修复再导出'}")
        lines.append(f"{'='*70}")

        return "\n".join(lines)
