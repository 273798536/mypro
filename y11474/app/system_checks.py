import hashlib
import time
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    ReturnApplication, AuditLog, SystemCheckLog, DirtyRecord,
    RecordStatus, User, LedgerRecord
)
from app.schemas import SystemCheckResult


class SystemChecker:
    @staticmethod
    def check_duplicate_imports(db: Session) -> SystemCheckResult:
        start_time = time.time()
        
        all_apps = db.query(ReturnApplication.idempotency_key).all()
        key_counts: Dict[str, int] = {}
        for app in all_apps:
            key = app[0]
            if key:
                key_counts[key] = key_counts.get(key, 0) + 1
        
        duplicates = [(key, count) for key, count in key_counts.items() if count > 1]
        
        execution_time = int((time.time() - start_time) * 1000)
        
        check_log = SystemCheckLog(
            check_type="duplicate_imports",
            check_result="PASS" if not duplicates else "FAIL",
            details={"duplicate_count": len(duplicates), "keys": [d[0] for d in duplicates]},
            passed=len(duplicates) == 0,
            execution_time_ms=execution_time
        )
        db.add(check_log)
        db.commit()
        
        return SystemCheckResult(
            check_type="duplicate_imports",
            passed=len(duplicates) == 0,
            details={"duplicate_keys": [d[0] for d in duplicates]},
            execution_time_ms=execution_time
        )

    @staticmethod
    def check_permission_interception(db: Session) -> SystemCheckResult:
        start_time = time.time()
        
        suspicious_actions = []
        
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(1000).all()
        
        for log in logs:
            if log.action.startswith("status_change_"):
                user = db.query(User).filter(User.id == log.user_id).first()
                if user:
                    from app.workflow import WorkflowEngine
                    if not WorkflowEngine.can_perform_transition(
                        log.old_status, log.new_status, user.role
                    ):
                        suspicious_actions.append({
                            "log_id": log.id,
                            "user_id": log.user_id,
                            "user_role": user.role.value,
                            "action": log.action,
                            "old_status": log.old_status.value if log.old_status else None,
                            "new_status": log.new_status.value if log.new_status else None,
                            "created_at": log.created_at.isoformat()
                        })
        
        execution_time = int((time.time() - start_time) * 1000)
        
        check_log = SystemCheckLog(
            check_type="permission_interception",
            check_result="PASS" if not suspicious_actions else "FAIL",
            details={"suspicious_count": len(suspicious_actions), "actions": suspicious_actions},
            passed=len(suspicious_actions) == 0,
            execution_time_ms=execution_time
        )
        db.add(check_log)
        db.commit()
        
        return SystemCheckResult(
            check_type="permission_interception",
            passed=len(suspicious_actions) == 0,
            details={"suspicious_actions": suspicious_actions},
            execution_time_ms=execution_time
        )

    @staticmethod
    def check_exception_retention(db: Session) -> SystemCheckResult:
        start_time = time.time()
        
        unresolved_dirty = db.query(DirtyRecord).filter(
            DirtyRecord.is_resolved == False
        ).count()
        
        total_dirty = db.query(DirtyRecord).count()
        
        application_without_ledger = db.query(ReturnApplication).filter(
            ~ReturnApplication.id.in_(
                db.query(LedgerRecord.application_id)
            )
        ).count()
        
        execution_time = int((time.time() - start_time) * 1000)
        
        passed = application_without_ledger == 0
        
        check_log = SystemCheckLog(
            check_type="exception_retention",
            check_result="PASS" if passed else "FAIL",
            details={
                "unresolved_dirty_records": unresolved_dirty,
                "total_dirty_records": total_dirty,
                "applications_without_ledger": application_without_ledger
            },
            passed=passed,
            execution_time_ms=execution_time
        )
        db.add(check_log)
        db.commit()
        
        return SystemCheckResult(
            check_type="exception_retention",
            passed=passed,
            details={
                "unresolved_dirty_records": unresolved_dirty,
                "total_dirty_records": total_dirty,
                "applications_without_ledger": application_without_ledger
            },
            execution_time_ms=execution_time
        )

    @staticmethod
    def check_restart_history(db: Session) -> SystemCheckResult:
        start_time = time.time()
        
        earliest_log = db.query(AuditLog).order_by(AuditLog.created_at.asc()).first()
        latest_log = db.query(AuditLog).order_by(AuditLog.created_at.desc()).first()
        
        all_apps = db.query(ReturnApplication.status).all()
        status_distribution_dict: Dict[str, int] = {}
        for app in all_apps:
            status = app[0].value if app[0] else "unknown"
            status_distribution_dict[status] = status_distribution_dict.get(status, 0) + 1
        
        status_distribution = [(k, v) for k, v in status_distribution_dict.items()]
        
        execution_time = int((time.time() - start_time) * 1000)
        
        passed = earliest_log is not None
        
        check_log = SystemCheckLog(
            check_type="restart_history",
            check_result="PASS" if passed else "FAIL",
            details={
                "has_history": earliest_log is not None,
                "earliest_log": earliest_log.created_at.isoformat() if earliest_log else None,
                "latest_log": latest_log.created_at.isoformat() if latest_log else None,
                "status_distribution": {
                    s[0]: s[1] for s in status_distribution
                }
            },
            passed=passed,
            execution_time_ms=execution_time
        )
        db.add(check_log)
        db.commit()
        
        return SystemCheckResult(
            check_type="restart_history",
            passed=passed,
            details={
                "has_history": earliest_log is not None,
                "earliest_log": earliest_log.created_at.isoformat() if earliest_log else None,
                "latest_log": latest_log.created_at.isoformat() if latest_log else None,
                "status_distribution": {
                    s[0]: s[1] for s in status_distribution
                }
            },
            execution_time_ms=execution_time
        )

    @staticmethod
    def check_export_consistency(db: Session) -> SystemCheckResult:
        start_time = time.time()
        
        inconsistencies = []
        
        applications = db.query(ReturnApplication).all()
        
        for app in applications:
            if app.ledger:
                summary = app.ledger.summary or {}
                
                log_total = sum(r.actual_quantity for r in app.logistics_receipts)
                expected_log = summary.get("logistics_received_quantity", 0)
                
                if log_total != expected_log:
                    inconsistencies.append({
                        "application_id": app.id,
                        "application_no": app.application_no,
                        "field": "logistics_quantity",
                        "actual": log_total,
                        "expected": expected_log
                    })
        
        execution_time = int((time.time() - start_time) * 1000)
        
        passed = len(inconsistencies) == 0
        
        check_log = SystemCheckLog(
            check_type="export_consistency",
            check_result="PASS" if passed else "FAIL",
            details={"inconsistencies": inconsistencies},
            passed=passed,
            execution_time_ms=execution_time
        )
        db.add(check_log)
        db.commit()
        
        return SystemCheckResult(
            check_type="export_consistency",
            passed=passed,
            details={"inconsistencies": inconsistencies},
            execution_time_ms=execution_time
        )

    @classmethod
    def run_all_checks(cls, db: Session) -> List[SystemCheckResult]:
        results = []
        
        results.append(cls.check_duplicate_imports(db))
        results.append(cls.check_permission_interception(db))
        results.append(cls.check_exception_retention(db))
        results.append(cls.check_restart_history(db))
        results.append(cls.check_export_consistency(db))
        
        return results
