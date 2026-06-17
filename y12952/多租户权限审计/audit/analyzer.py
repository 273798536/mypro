from typing import Dict, List, Any, Optional
from collections import defaultdict
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.database import Database
from core.models import FINDING_TYPES, RISK_LEVELS, REVIEW_STATUSES


class AuditAnalyzer:
    def __init__(self, db: Database):
        self.db = db

    def summary(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        findings = self.db.list_audit_findings(tenant_id=tenant_id)
        by_type = defaultdict(int)
        by_risk = defaultdict(int)
        by_status = defaultdict(int)
        for f in findings:
            by_type[f["finding_type"]] += 1
            by_risk[f["risk_level"]] += 1
            by_status[f["review_status"]] += 1

        processing_records = self.db.list_processing_records(tenant_id=tenant_id)
        batches = defaultdict(lambda: {"total": 0, "success": 0, "failed": 0, "skipped": 0})
        for r in processing_records:
            b = batches[r["batch_no"]]
            b["total"] += 1
            if r["status"] == "SUCCESS":
                b["success"] += 1
            elif r["status"] in ("FAILED", "FK_MISSING"):
                b["failed"] += 1
            elif r["status"] in ("SKIPPED", "AUDIT_FLAG"):
                b["skipped"] += 1

        return {
            "total_findings": len(findings),
            "by_type": dict(by_type),
            "by_type_labeled": {FINDING_TYPES.get(k, k): v for k, v in by_type.items()},
            "by_risk": dict(by_risk),
            "by_risk_labeled": {RISK_LEVELS.get(k, k): v for k, v in by_risk.items()},
            "by_status": dict(by_status),
            "by_status_labeled": {REVIEW_STATUSES.get(k, k): v for k, v in by_status.items()},
            "total_processing": len(processing_records),
            "batches": dict(batches),
            "pending_review": by_status.get("PENDING", 0),
            "needs_attention": (by_risk.get("CRITICAL", 0) + by_risk.get("HIGH", 0)),
        }

    def migration_status(self, batch_no: Optional[str] = None) -> List[Dict[str, Any]]:
        records = self.db.list_processing_records(batch_no=batch_no)
        result = []
        for r in records:
            status_label = {
                "SUCCESS": "成功",
                "FAILED": "失败",
                "SKIPPED": "跳过",
                "FK_MISSING": "外键缺失",
                "AUDIT_FLAG": "审计标记",
                "PENDING": "待处理",
            }.get(r["status"], r["status"])
            r["status_label"] = status_label
            r["record_type_label"] = {
                "MIGRATION": "迁移",
                "FK_CHECK": "外键检查",
                "PERMISSION_AUDIT": "权限审计",
            }.get(r["record_type"], r["record_type"])
            result.append(r)
        return result

    def compare_migration_vs_permission(self, batch_no: Optional[str] = None) -> Dict[str, Any]:
        proc = self.db.list_processing_records(batch_no=batch_no)
        findings = self.db.list_audit_findings()
        finding_by_record = {f["processing_record_id"]: f for f in findings if f["processing_record_id"]}

        shared_records = []
        for r in proc:
            finding = finding_by_record.get(r["record_id"])
            shared_records.append({
                "record_id": r["record_id"],
                "batch_no": r["batch_no"],
                "tenant_id": r["tenant_id"],
                "record_type": r["record_type"],
                "migrate_status": r["status"],
                "finding_id": finding["finding_id"] if finding else None,
                "finding_type": finding["finding_type"] if finding else None,
                "risk_level": finding["risk_level"] if finding else None,
                "review_status": finding["review_status"] if finding else None,
            })

        return {
            "total_shared_records": len(shared_records),
            "records_with_findings": sum(1 for s in shared_records if s["finding_id"]),
            "records_without_findings": sum(1 for s in shared_records if not s["finding_id"]),
            "shared_records": shared_records,
        }
