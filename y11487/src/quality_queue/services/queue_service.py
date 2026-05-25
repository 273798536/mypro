from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models import (
    CompensationQueue, QueueStatus, RetryCategory,
    Inspection, ReworkOrder, ExceptionRecord, MachineShift,
    AuditLog, DirtyRecord, DirtyType, RecordSource
)


def generate_queue_no() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    import random
    suffix = f"{random.randint(1000, 9999):04d}"
    return f"QQ{timestamp}{suffix}"


class QueueService:
    def __init__(self, db: Session, operator: str = "system", operator_role: str = "worker"):
        self.db = db
        self.operator = operator
        self.operator_role = operator_role

    def _audit_log(self, action: str, resource_type: str, resource_id: str,
                   is_allowed: bool = True, deny_reason: str = "",
                   old_value: Any = None, new_value: Any = None,
                   queue_item_id: Optional[int] = None):
        audit = AuditLog(
            action=action,
            operator=self.operator,
            operator_role=self.operator_role,
            resource_type=resource_type,
            resource_id=resource_id,
            is_allowed=is_allowed,
            deny_reason=deny_reason,
            old_value=old_value,
            new_value=new_value,
            queue_item_id=queue_item_id
        )
        self.db.add(audit)
        self.db.flush()

    def _determine_retry_category(self, context: Dict[str, Any]) -> RetryCategory:
        defect_type = context.get("defect_type", "")
        rework_count = context.get("rework_count", 0)
        has_exception = context.get("has_exception", False)

        if rework_count >= 5:
            return RetryCategory.NOT_RETRYABLE
        if has_exception or defect_type in ["色差", "破洞", "经纬错"]:
            return RetryCategory.MANUAL_REQUIRED
        return RetryCategory.AUTO_RETRYABLE

    def _find_original_shift(self, rework_order: ReworkOrder) -> Optional[str]:
        if rework_order.parent_rework_id:
            parent = self.db.query(ReworkOrder).filter(
                ReworkOrder.id == rework_order.parent_rework_id
            ).first()
            if parent:
                return self._find_original_shift(parent)
        return rework_order.responsible_shift_code or rework_order.shift_id

    def submit_from_inspection(self, inspection_id: int) -> CompensationQueue:
        inspection = self.db.query(Inspection).filter(
            Inspection.id == inspection_id
        ).first()
        if not inspection:
            raise ValueError(f"Inspection {inspection_id} not found")

        context = {
            "inspection_no": inspection.inspection_no,
            "batch_no": inspection.batch_no,
            "defect_rate": inspection.defect_rate,
            "has_exception": len(inspection.exception_records) > 0,
        }

        queue_item = CompensationQueue(
            queue_no=generate_queue_no(),
            status=QueueStatus.PENDING,
            retry_category=self._determine_retry_category(context),
            inspection_id=inspection.id,
            machine_no=inspection.machine_no,
            responsible_shift_code=inspection.shift.shift_code if inspection.shift else None,
            original_shift_code=inspection.shift.shift_code if inspection.shift else None,
            compensation_quantity=inspection.defect_count,
            raw_context=context
        )

        self.db.add(queue_item)
        self.db.flush()

        self._audit_log(
            "queue.submit",
            "inspection",
            str(inspection_id),
            new_value={"queue_no": queue_item.queue_no},
            queue_item_id=queue_item.id
        )

        return queue_item

    def submit_from_rework(self, rework_order_id: int) -> CompensationQueue:
        rework_order = self.db.query(ReworkOrder).filter(
            ReworkOrder.id == rework_order_id
        ).first()
        if not rework_order:
            raise ValueError(f"ReworkOrder {rework_order_id} not found")

        original_shift = self._find_original_shift(rework_order)

        context = {
            "rework_no": rework_order.rework_no,
            "defect_type": rework_order.defect_type,
            "rework_count": rework_order.rework_count,
            "has_exception": len(rework_order.exception_records) > 0,
            "parent_rework_id": rework_order.parent_rework_id,
        }

        queue_item = CompensationQueue(
            queue_no=generate_queue_no(),
            status=QueueStatus.PENDING,
            retry_category=self._determine_retry_category(context),
            rework_order_id=rework_order.id,
            defect_type=rework_order.defect_type,
            machine_no=rework_order.machine_no,
            responsible_shift_code=rework_order.responsible_shift_code,
            original_shift_code=original_shift,
            compensation_amount=rework_order.compensation_amount,
            compensation_quantity=rework_order.rework_quantity,
            raw_context=context
        )

        self.db.add(queue_item)
        self.db.flush()

        self._audit_log(
            "queue.submit",
            "rework_order",
            str(rework_order_id),
            new_value={"queue_no": queue_item.queue_no},
            queue_item_id=queue_item.id
        )

        return queue_item

    def submit_from_exception(self, exception_id: int) -> CompensationQueue:
        exception_record = self.db.query(ExceptionRecord).filter(
            ExceptionRecord.id == exception_id
        ).first()
        if not exception_record:
            raise ValueError(f"ExceptionRecord {exception_id} not found")

        context = {
            "record_no": exception_record.record_no,
            "source": exception_record.source.value,
            "defect_type": exception_record.defect_type,
            "description": exception_record.description,
            "has_photo": bool(exception_record.photo_path),
            "has_sms": bool(exception_record.sms_content),
        }

        queue_item = CompensationQueue(
            queue_no=generate_queue_no(),
            status=QueueStatus.PENDING,
            retry_category=RetryCategory.MANUAL_REQUIRED,
            exception_id=exception_record.id,
            defect_type=exception_record.defect_type,
            machine_no=exception_record.machine_no,
            responsible_shift_code=exception_record.shift.shift_code if exception_record.shift else None,
            original_shift_code=exception_record.shift.shift_code if exception_record.shift else None,
            raw_context=context
        )

        self.db.add(queue_item)
        self.db.flush()

        self._audit_log(
            "queue.submit",
            "exception",
            str(exception_id),
            new_value={"queue_no": queue_item.queue_no},
            queue_item_id=queue_item.id
        )

        return queue_item

    def process_queue(self, queue_id: int) -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if queue_item.status not in [QueueStatus.PENDING, QueueStatus.RETRYING]:
            return False, f"当前状态 {queue_item.status.value} 不允许处理"

        old_status = queue_item.status.value
        queue_item.status = QueueStatus.PROCESSING
        self.db.flush()

        self._audit_log(
            "queue.process",
            "compensation_queue",
            str(queue_id),
            old_value={"status": old_status},
            new_value={"status": QueueStatus.PROCESSING.value},
            queue_item_id=queue_item.id
        )

        return True, "处理中"

    def retry_queue(self, queue_id: int, error_msg: str = "") -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if queue_item.retry_count >= queue_item.max_retries:
            queue_item.status = QueueStatus.DEAD_LETTER
            self.db.flush()
            self._audit_log(
                "queue.dead_letter",
                "compensation_queue",
                str(queue_id),
                old_value={"status": queue_item.status.value, "retry_count": queue_item.retry_count},
                new_value={"status": QueueStatus.DEAD_LETTER.value},
                queue_item_id=queue_item.id
            )
            return False, "已达最大重试次数，移入死信队列"

        queue_item.retry_count += 1
        queue_item.last_retry_at = datetime.now()
        queue_item.next_retry_at = datetime.now() + timedelta(minutes=5 * queue_item.retry_count)
        queue_item.last_error = error_msg
        queue_item.status = QueueStatus.RETRYING

        self.db.flush()

        self._audit_log(
            "queue.retry",
            "compensation_queue",
            str(queue_id),
            old_value={"retry_count": queue_item.retry_count - 1},
            new_value={"retry_count": queue_item.retry_count, "next_retry_at": queue_item.next_retry_at.isoformat()},
            queue_item_id=queue_item.id
        )

        return True, f"第 {queue_item.retry_count} 次重试已安排"

    def take_manual(self, queue_id: int, note: str = "") -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if self.operator_role not in ["manager", "supervisor"]:
            self._audit_log(
                "queue.manual_take",
                "compensation_queue",
                str(queue_id),
                is_allowed=False,
                deny_reason="权限不足：需要 manager 或 supervisor 角色才能人工接管",
                queue_item_id=queue_item.id
            )
            return False, "权限不足：需要 manager 或 supervisor 角色才能人工接管"

        old_status = queue_item.status.value
        queue_item.status = QueueStatus.MANUAL
        queue_item.manual_handler = self.operator
        queue_item.manual_note = note

        self.db.flush()

        self._audit_log(
            "queue.manual_take",
            "compensation_queue",
            str(queue_id),
            old_value={"status": old_status},
            new_value={"status": QueueStatus.MANUAL.value, "handler": self.operator},
            queue_item_id=queue_item.id
        )

        return True, "已人工接管"

    def transfer_to_manual(self, queue_id: int, reason: str = "") -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if queue_item.status in [QueueStatus.MANUAL, QueueStatus.COMPENSATED, QueueStatus.CLOSED]:
            return False, f"当前状态 {queue_item.status.value} 不能转入人工处理"

        old_status = queue_item.status.value
        queue_item.status = QueueStatus.MANUAL
        queue_item.manual_handler = "system"
        queue_item.manual_note = f"系统自动转入人工处理: {reason}" if reason else "系统自动转入人工处理"

        self.db.flush()

        self._audit_log(
            "queue.transfer_to_manual",
            "compensation_queue",
            str(queue_id),
            old_value={"status": old_status},
            new_value={
                "status": QueueStatus.MANUAL.value,
                "handler": "system",
                "reason": reason
            },
            queue_item_id=queue_item.id
        )

        return True, "已转入人工处理队列"

    def compensate(self, queue_id: int, amount: Optional[float] = None,
                   quantity: Optional[int] = None) -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if queue_item.status == QueueStatus.COMPENSATED:
            return False, "已补偿，不能重复操作"

        old_values = {
            "status": queue_item.status.value,
            "compensation_amount": queue_item.compensation_amount,
            "compensation_quantity": queue_item.compensation_quantity,
        }

        if amount is not None:
            queue_item.compensation_amount = amount
        if quantity is not None:
            queue_item.compensation_quantity = quantity

        queue_item.status = QueueStatus.COMPENSATED
        queue_item.compensated_at = datetime.now()
        queue_item.compensated_by = self.operator

        self.db.flush()

        self._audit_log(
            "queue.compensate",
            "compensation_queue",
            str(queue_id),
            old_value=old_values,
            new_value={
                "status": QueueStatus.COMPENSATED.value,
                "compensation_amount": queue_item.compensation_amount,
                "compensation_quantity": queue_item.compensation_quantity,
                "compensated_by": self.operator,
            },
            queue_item_id=queue_item.id
        )

        return True, "补偿已入账"

    def close_queue(self, queue_id: int, reason: str) -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if self.operator_role != "manager":
            self._audit_log(
                "queue.close",
                "compensation_queue",
                str(queue_id),
                is_allowed=False,
                deny_reason="权限不足：只有 manager 角色才能关闭队列项",
                queue_item_id=queue_item.id
            )
            return False, "权限不足：只有 manager 角色才能关闭队列项"

        old_status = queue_item.status.value
        queue_item.status = QueueStatus.CLOSED
        queue_item.closed_at = datetime.now()
        queue_item.closed_by = self.operator
        queue_item.close_reason = reason

        self.db.flush()

        self._audit_log(
            "queue.close",
            "compensation_queue",
            str(queue_id),
            old_value={"status": old_status},
            new_value={"status": QueueStatus.CLOSED.value, "close_reason": reason},
            queue_item_id=queue_item.id
        )

        return True, "已关闭"

    def recover_dead_letter(self, queue_id: int) -> Tuple[bool, str]:
        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()
        if not queue_item:
            return False, "队列项不存在"

        if queue_item.status != QueueStatus.DEAD_LETTER:
            return False, "不是死信状态"

        if self.operator_role != "manager":
            self._audit_log(
                "queue.recover",
                "compensation_queue",
                str(queue_id),
                is_allowed=False,
                deny_reason="权限不足：只有 manager 角色才能恢复死信",
                queue_item_id=queue_item.id
            )
            return False, "权限不足：只有 manager 角色才能恢复死信"

        queue_item.status = QueueStatus.MANUAL
        queue_item.retry_count = 0
        queue_item.manual_handler = self.operator

        self.db.flush()

        self._audit_log(
            "queue.recover",
            "compensation_queue",
            str(queue_id),
            old_value={"status": QueueStatus.DEAD_LETTER.value},
            new_value={"status": QueueStatus.MANUAL.value},
            queue_item_id=queue_item.id
        )

        return True, "已从死信恢复，转入人工处理"

    def get_queue_item(self, queue_id: int) -> Optional[CompensationQueue]:
        return self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()

    def get_queue_by_no(self, queue_no: str) -> Optional[CompensationQueue]:
        return self.db.query(CompensationQueue).filter(
            CompensationQueue.queue_no == queue_no
        ).first()

    def get_queue_detail(self, queue_id: int) -> Optional[Dict[str, Any]]:
        from ..models import AuditLog

        queue_item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()

        if not queue_item:
            return None

        audit_logs = self.db.query(AuditLog).filter(
            AuditLog.queue_item_id == queue_id
        ).order_by(AuditLog.created_at.asc()).all()

        detail = {
            "id": queue_item.id,
            "queue_no": queue_item.queue_no,
            "status": queue_item.status.value if queue_item.status else None,
            "retry_category": queue_item.retry_category.value if queue_item.retry_category else None,
            "defect_type": queue_item.defect_type,
            "machine_no": queue_item.machine_no,
            "responsible_shift_code": queue_item.responsible_shift_code,
            "original_shift_code": queue_item.original_shift_code,
            "compensation_amount": queue_item.compensation_amount,
            "compensation_quantity": queue_item.compensation_quantity,
            "retry_count": queue_item.retry_count,
            "max_retries": queue_item.max_retries,
            "next_retry_at": queue_item.next_retry_at.isoformat() if queue_item.next_retry_at else None,
            "manual_handler": queue_item.manual_handler,
            "manual_note": queue_item.manual_note,
            "compensated_by": queue_item.compensated_by,
            "compensated_at": queue_item.compensated_at.isoformat() if queue_item.compensated_at else None,
            "closed_by": queue_item.closed_by,
            "closed_at": queue_item.closed_at.isoformat() if queue_item.closed_at else None,
            "close_reason": queue_item.close_reason,
            "created_at": queue_item.created_at.isoformat() if queue_item.created_at else None,
            "audit_logs": [
                {
                    "id": log.id,
                    "action": log.action,
                    "operator": log.operator,
                    "is_allowed": log.is_allowed,
                    "deny_reason": log.deny_reason,
                    "old_value": log.old_value,
                    "new_value": log.new_value,
                    "created_at": log.created_at.isoformat() if log.created_at else None
                }
                for log in audit_logs
            ]
        }

        return detail

    def list_queue(self, status: Optional[QueueStatus] = None,
                   category: Optional[RetryCategory] = None,
                   machine_no: Optional[str] = None,
                   shift_code: Optional[str] = None,
                   limit: int = 100, offset: int = 0) -> List[CompensationQueue]:
        query = self.db.query(CompensationQueue)

        if status:
            query = query.filter(CompensationQueue.status == status)
        if category:
            query = query.filter(CompensationQueue.retry_category == category)
        if machine_no:
            query = query.filter(CompensationQueue.machine_no == machine_no)
        if shift_code:
            query = query.filter(
                or_(
                    CompensationQueue.responsible_shift_code == shift_code,
                    CompensationQueue.original_shift_code == shift_code
                )
            )

        return query.order_by(CompensationQueue.created_at.desc()).offset(offset).limit(limit).all()

    def get_manager_summary(self) -> Dict[str, Any]:
        total = self.db.query(CompensationQueue).count()
        pending = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.PENDING
        ).count()
        retrying = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.RETRYING
        ).count()
        manual = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.MANUAL
        ).count()
        dead_letter = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.DEAD_LETTER
        ).count()
        compensated = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.COMPENSATED
        ).count()

        auto_retryable = self.db.query(CompensationQueue).filter(
            CompensationQueue.retry_category == RetryCategory.AUTO_RETRYABLE,
            CompensationQueue.status.in_([QueueStatus.PENDING, QueueStatus.RETRYING])
        ).count()

        manual_required = self.db.query(CompensationQueue).filter(
            CompensationQueue.retry_category == RetryCategory.MANUAL_REQUIRED,
            CompensationQueue.status.in_([QueueStatus.PENDING, QueueStatus.RETRYING, QueueStatus.MANUAL])
        ).count()

        not_retryable = self.db.query(CompensationQueue).filter(
            CompensationQueue.retry_category == RetryCategory.NOT_RETRYABLE
        ).count()

        total_amount = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.COMPENSATED
        ).with_entities(
            CompensationQueue.compensation_amount,
            CompensationQueue.compensation_quantity
        ).all()

        return {
            "total": total,
            "by_status": {
                "pending": pending,
                "retrying": retrying,
                "manual": manual,
                "dead_letter": dead_letter,
                "compensated": compensated,
            },
            "by_category": {
                "auto_retryable": auto_retryable,
                "manual_required": manual_required,
                "not_retryable": not_retryable,
            },
            "compensation_summary": {
                "total_amount": sum(a for a, q in total_amount),
                "total_quantity": sum(q for a, q in total_amount),
            }
        }
