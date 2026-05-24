from typing import Dict, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import hashlib
import json

from app.models.ledger import LedgerRecord, StatusHistory, DirtyRecord, ExportRecord
from app.models.user import User, ROLE_PERMISSIONS


class AutoChecker:
    def __init__(self, db: Session):
        self.db = db
        self.check_results = []

    def check_duplicate_import(self, wave_no: str, sku_code: str) -> Dict:
        existing = self.db.query(LedgerRecord).filter(
            LedgerRecord.wave_no == wave_no,
            LedgerRecord.sku_code == sku_code,
            LedgerRecord.is_deleted == False
        ).first()

        result = {
            "check_type": "duplicate_import",
            "passed": existing is None,
            "details": {}
        }

        if existing:
            result["details"] = {
                "existing_ledger_no": existing.ledger_no,
                "existing_status": existing.status,
                "existing_created_at": existing.created_at
            }

        return result

    def check_permission_interception(self, user: User, action: str, ledger: LedgerRecord = None) -> Dict:
        result = {
            "check_type": "permission_interception",
            "passed": True,
            "details": {
                "user_role": user.role,
                "action": action,
                "allowed": False
            }
        }

        if user.role not in ROLE_PERMISSIONS:
            result["passed"] = False
            result["details"]["reason"] = "无效的角色"
            return result

        allowed_actions = ROLE_PERMISSIONS[user.role]["actions"]
        result["details"]["allowed"] = action in allowed_actions
        result["passed"] = action in allowed_actions

        if ledger:
            result["details"]["ledger_status"] = ledger.status

            if user.role == "entry" and ledger.status not in ["draft", "rejected"]:
                result["passed"] = False
                result["details"]["reason"] = "录入员只能编辑草稿或驳回状态的记录"

        return result

    def check_exception_retention(self, ledger_id: int) -> Dict:
        ledger = self.db.query(LedgerRecord).filter(LedgerRecord.id == ledger_id).first()
        if not ledger:
            return {
                "check_type": "exception_retention",
                "passed": False,
                "details": {"reason": "台账记录不存在"}
            }

        dirty_records = self.db.query(DirtyRecord).filter(
            DirtyRecord.ledger_id == ledger_id
        ).all()

        status_histories = self.db.query(StatusHistory).filter(
            StatusHistory.ledger_id == ledger_id
        ).all()

        result = {
            "check_type": "exception_retention",
            "passed": True,
            "details": {
                "has_dirty_records": len(dirty_records) > 0,
                "dirty_record_count": len(dirty_records),
                "unresolved_dirty_count": sum(1 for d in dirty_records if not d.is_resolved),
                "has_status_history": len(status_histories) > 0,
                "status_history_count": len(status_histories),
                "original_data_preserved": ledger.data_sources is not None
            }
        }

        return result

    def check_restart_history_integrity(self) -> Dict:
        all_ledgers = self.db.query(LedgerRecord).filter(
            LedgerRecord.is_deleted == False
        ).all()

        issues = []
        for ledger in all_ledgers:
            histories = self.db.query(StatusHistory).filter(
                StatusHistory.ledger_id == ledger.id
            ).order_by(StatusHistory.operate_time).all()

            if histories:
                if histories[0].from_status and histories[0].from_status != "":
                    pass
                
                expected_status = histories[-1].to_status
                if ledger.status != expected_status:
                    issues.append({
                        "ledger_no": ledger.ledger_no,
                        "expected_status": expected_status,
                        "actual_status": ledger.status,
                        "issue": "台账状态与最后一次状态历史不一致"
                    })

        result = {
            "check_type": "restart_history_integrity",
            "passed": len(issues) == 0,
            "details": {
                "total_ledgers": len(all_ledgers),
                "issue_count": len(issues),
                "issues": issues
            }
        }

        return result

    def check_export_consistency(self, export_no: str = None) -> Dict:
        if export_no:
            export_records = self.db.query(ExportRecord).filter(
                ExportRecord.export_no == export_no
            ).all()
        else:
            export_records = self.db.query(ExportRecord).order_by(
                ExportRecord.export_time.desc()
            ).limit(10).all()

        issues = []
        for export in export_records:
            import os
            if os.path.exists(export.file_path):
                file_hash = hashlib.sha256()
                with open(export.file_path, "rb") as f:
                    for byte_block in iter(lambda: f.read(4096), b""):
                        file_hash.update(byte_block)
                current_hash = file_hash.hexdigest()

                if current_hash != export.file_hash:
                    issues.append({
                        "export_no": export.export_no,
                        "issue": "文件哈希不匹配，文件可能被篡改",
                        "original_hash": export.file_hash,
                        "current_hash": current_hash
                    })
            else:
                issues.append({
                    "export_no": export.export_no,
                    "issue": "导出文件不存在"
                })

        result = {
            "check_type": "export_consistency",
            "passed": len(issues) == 0,
            "details": {
                "checked_count": len(export_records),
                "issue_count": len(issues),
                "issues": issues
            }
        }

        return result

    def run_all_checks(self) -> Dict:
        self.check_results = []

        self.check_results.append(self.check_restart_history_integrity())
        self.check_results.append(self.check_export_consistency())

        passed = all(r["passed"] for r in self.check_results)

        return {
            "check_time": datetime.utcnow().isoformat(),
            "total_checks": len(self.check_results),
            "passed_checks": sum(1 for r in self.check_results if r["passed"]),
            "failed_checks": sum(1 for r in self.check_results if not r["passed"]),
            "overall_passed": passed,
            "results": self.check_results
        }


def run_system_health_check(db: Session) -> Dict:
    checker = AutoChecker(db)
    return checker.run_all_checks()
