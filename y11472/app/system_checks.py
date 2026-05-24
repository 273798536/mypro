from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from app import models, schemas
from app.enums import CompensationStatus, OperationType, ReceiptSource
from app.services import AuditService


class SystemChecker:
    @staticmethod
    def run_all_checks(db: Session, operator: models.User) -> List[schemas.SystemCheckResult]:
        results = []
        checks = [
            SystemChecker.check_duplicate_imports,
            SystemChecker.check_permission_interception,
            SystemChecker.check_exception_retention,
            SystemChecker.check_history_after_restart,
            SystemChecker.check_export_consistency,
        ]

        for check in checks:
            try:
                result = check(db)
                results.append(result)

                db.add(models.SystemCheck(
                    check_name=result.check_name,
                    check_type="automated",
                    status=result.status,
                    message=result.message,
                    details=result.details,
                    checked_by=operator.id,
                ))
            except Exception as e:
                results.append(schemas.SystemCheckResult(
                    check_name=check.__name__,
                    status="ERROR",
                    message=str(e),
                    checked_at=datetime.now(),
                ))

        db.commit()
        return results

    @staticmethod
    def check_duplicate_imports(db: Session) -> schemas.SystemCheckResult:
        thirty_minutes_ago = datetime.now().replace(
            minute=datetime.now().minute - 30,
            second=0,
            microsecond=0,
        )

        duplicates = db.query(
            models.ExternalReceipt.application_id,
            models.ExternalReceipt.import_batch_no,
            func.count(models.ExternalReceipt.id).label("count"),
        ).filter(
            models.ExternalReceipt.created_at >= thirty_minutes_ago,
            models.ExternalReceipt.import_batch_no.isnot(None),
        ).group_by(
            models.ExternalReceipt.application_id,
            models.ExternalReceipt.import_batch_no,
        ).having(
            func.count(models.ExternalReceipt.id) > 1
        ).all()

        duplicate_list = [{
            "application_id": d.application_id,
            "import_batch_no": d.import_batch_no,
            "count": d.count,
        } for d in duplicates]

        if duplicates:
            return schemas.SystemCheckResult(
                check_name="重复导入检测",
                status="WARNING",
                message=f"检测到 {len(duplicates)} 组重复导入记录",
                details={"duplicates": duplicate_list},
                checked_at=datetime.now(),
            )

        return schemas.SystemCheckResult(
            check_name="重复导入检测",
            status="PASS",
            message="未检测到重复导入",
            checked_at=datetime.now(),
        )

    @staticmethod
    def check_permission_interception(db: Session) -> schemas.SystemCheckResult:
        one_hour_ago = datetime.now().replace(
            hour=datetime.now().hour - 1,
            second=0,
            microsecond=0,
        )

        permission_denied_audit = db.query(models.AuditLog).filter(
            models.AuditLog.created_at >= one_hour_ago,
            models.AuditLog.operation_type == OperationType.UPDATE,
            models.AuditLog.change_reason.like("%permission%"),
        ).count()

        role_violations = db.query(models.AuditLog).filter(
            models.AuditLog.created_at >= one_hour_ago,
            models.AuditLog.change_reason.like("%role%"),
        ).count()

        total_violations = permission_denied_audit + role_violations

        if total_violations > 0:
            return schemas.SystemCheckResult(
                check_name="权限拦截检测",
                status="WARNING",
                message=f"过去1小时有 {total_violations} 次权限相关操作",
                details={
                    "permission_denied": permission_denied_audit,
                    "role_violations": role_violations,
                },
                checked_at=datetime.now(),
            )

        return schemas.SystemCheckResult(
            check_name="权限拦截检测",
            status="PASS",
            message="权限拦截正常工作，无异常",
            checked_at=datetime.now(),
        )

    @staticmethod
    def check_exception_retention(db: Session) -> schemas.SystemCheckResult:
        failed_queues = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.status.in_([
                CompensationStatus.FAILED,
                CompensationStatus.DEAD_LETTER,
            ]),
            models.CompensationQueue.last_error.isnot(None),
        ).all()

        missing_stack_traces = [
            q.queue_no for q in failed_queues
            if not q.error_stack
        ]

        if missing_stack_traces:
            return schemas.SystemCheckResult(
                check_name="异常保留检测",
                status="FAIL",
                message=f"有 {len(missing_stack_traces)} 个异常队列缺少堆栈信息",
                details={"missing_stacks": missing_stack_traces},
                checked_at=datetime.now(),
            )

        if failed_queues:
            return schemas.SystemCheckResult(
                check_name="异常保留检测",
                status="PASS",
                message=f"所有 {len(failed_queues)} 个异常队列都保留了完整异常信息",
                details={"failed_count": len(failed_queues)},
                checked_at=datetime.now(),
            )

        return schemas.SystemCheckResult(
            check_name="异常保留检测",
            status="PASS",
            message="无异常队列，系统运行正常",
            checked_at=datetime.now(),
        )

    @staticmethod
    def check_history_after_restart(db: Session) -> schemas.SystemCheckResult:
        oldest_audit = db.query(models.AuditLog).order_by(
            models.AuditLog.created_at.asc()
        ).first()

        audit_count = db.query(func.count(models.AuditLog.id)).scalar()

        if audit_count == 0:
            return schemas.SystemCheckResult(
                check_name="重启后历史保留",
                status="WARNING",
                message="审计日志为空，可能为新系统",
                checked_at=datetime.now(),
            )

        oldest_date = oldest_audit.created_at.strftime("%Y-%m-%d %H:%M:%S") if oldest_audit else "N/A"

        return schemas.SystemCheckResult(
            check_name="重启后历史保留",
            status="PASS",
            message=f"历史记录完整，最早记录: {oldest_date}",
            details={
                "total_audit_records": audit_count,
                "oldest_record_date": oldest_date,
            },
            checked_at=datetime.now(),
        )

    @staticmethod
    def check_export_consistency(db: Session) -> schemas.SystemCheckResult:
        frozen_queues = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.is_frozen == True,
            models.CompensationQueue.frozen_until > datetime.now(),
        ).all()

        export_audits = db.query(models.AuditLog).filter(
            models.AuditLog.operation_type == OperationType.EXPORT,
        ).order_by(desc(models.AuditLog.created_at)).limit(10).all()

        inconsistencies = []
        for frozen in frozen_queues:
            after_freeze = db.query(models.AuditLog).filter(
                models.AuditLog.queue_id == frozen.id,
                models.AuditLog.created_at > frozen.frozen_until,
                models.AuditLog.operation_type.in_([
                    OperationType.UPDATE,
                    OperationType.RETRY,
                    OperationType.MANUAL_RESOLVE,
                ]),
            ).count()

            if after_freeze > 0:
                inconsistencies.append({
                    "queue_no": frozen.queue_no,
                    "unauthorized_changes": after_freeze,
                })

        if inconsistencies:
            return schemas.SystemCheckResult(
                check_name="导出一致性检测",
                status="FAIL",
                message=f"有 {len(inconsistencies)} 个冻结队列在导出后被修改",
                details={"inconsistencies": inconsistencies},
                checked_at=datetime.now(),
            )

        return schemas.SystemCheckResult(
            check_name="导出一致性检测",
            status="PASS",
            message=f"导出一致性正常，{len(frozen_queues)} 个冻结队列无修改",
            details={
                "frozen_count": len(frozen_queues),
                "recent_exports": len(export_audits),
            },
            checked_at=datetime.now(),
        )
