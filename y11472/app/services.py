from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app import models, schemas
from app.enums import (
    CompensationStatus,
    RetryStrategy,
    OperationType,
    ReturnApplicationStatus,
    DisputeCategory,
)
from app.config import get_settings
import uuid
import traceback

settings = get_settings()


def generate_no(prefix: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = str(uuid.uuid4())[:8].upper()
    return f"{prefix}{timestamp}{random_suffix}"


def enum_value(enum_obj) -> Optional[str]:
    if enum_obj is None:
        return None
    if hasattr(enum_obj, 'value'):
        return enum_obj.value
    return str(enum_obj)


class AuditService:
    @staticmethod
    def log_operation(
        db: Session,
        operation_type: OperationType,
        operator: models.User,
        *,
        application_id: Optional[int] = None,
        queue_id: Optional[int] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        change_reason: Optional[str] = None,
        field_changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> models.AuditLog:
        audit_log = models.AuditLog(
            application_id=application_id,
            queue_id=queue_id,
            operation_type=operation_type,
            operator_id=operator.id,
            operator_name=operator.full_name or operator.username,
            old_status=old_status,
            new_status=new_status,
            change_reason=change_reason,
            field_changes=field_changes,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(audit_log)
        db.flush()
        return audit_log


class CompensationQueueService:
    @staticmethod
    def create_queue(
        db: Session,
        application_id: int,
        source_receipt_id: Optional[int] = None,
        operator: Optional[models.User] = None,
    ) -> models.CompensationQueue:
        application = db.query(models.ReturnApplication).filter(
            models.ReturnApplication.id == application_id
        ).first()
        if not application:
            raise ValueError("Return application not found")

        disputed_items_summary = []
        total_compensation = 0.0

        for item in application.items:
            if item.disputed_qty > 0:
                disputed_items_summary.append({
                    "item_id": item.id,
                    "sku_code": item.sku_code,
                    "sku_name": item.sku_name,
                    "batch_no": item.batch_no,
                    "disputed_qty": item.disputed_qty,
                    "unit_price": item.unit_price,
                    "dispute_category": item.dispute_category.value if hasattr(item.dispute_category, 'value') else item.dispute_category,
                    "dispute_reason": item.dispute_reason,
                })
                total_compensation += item.disputed_qty * item.unit_price

        queue = models.CompensationQueue(
            application_id=application_id,
            queue_no=generate_no("CQ"),
            status=CompensationStatus.QUEUED,
            source_receipt_id=source_receipt_id,
            disputed_items_summary=disputed_items_summary,
            total_compensation_amount=total_compensation,
            max_retries=settings.MAX_RETRY_COUNT,
        )
        db.add(queue)
        db.flush()

        if operator:
            AuditService.log_operation(
                db,
                OperationType.CREATE,
                operator,
                application_id=application_id,
                queue_id=queue.id,
                new_status=enum_value(CompensationStatus.QUEUED),
                change_reason="创建补偿队列",
                field_changes={"queue_no": queue.queue_no},
            )

        return queue

    @staticmethod
    def process_queue_item(
        db: Session,
        queue_id: int,
        operator: Optional[models.User] = None,
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError("Queue item not found")

        if queue.is_frozen:
            raise ValueError("Queue item is frozen")

        old_status = enum_value(queue.status)
        queue.status = CompensationStatus.PROCESSING
        db.flush()

        retry_attempt = models.RetryHistory(
            queue_id=queue.id,
            attempt_no=queue.retry_count + 1,
            status="started",
            started_at=datetime.now(),
        )
        db.add(retry_attempt)
        db.flush()

        try:
            processed_items, failed_items = CompensationQueueService._execute_compensation(
                db, queue
            )

            retry_attempt.finished_at = datetime.now()
            retry_attempt.processed_items = processed_items
            retry_attempt.failed_items = failed_items

            queue.retry_count += 1
            queue.processed_items = processed_items
            queue.failed_items = failed_items

            if len(failed_items) == 0:
                queue.status = CompensationStatus.SUCCESS
                queue.completed_at = datetime.now()
                retry_attempt.status = "success"
                CompensationQueueService._update_application_items(db, queue, processed_items)
            elif len(processed_items) > 0:
                queue.status = CompensationStatus.PARTIAL_SUCCESS
                retry_attempt.status = "partial"
                CompensationQueueService._update_application_items(db, queue, processed_items)
            else:
                if queue.retry_count >= queue.max_retries:
                    queue.status = CompensationStatus.DEAD_LETTER
                    retry_attempt.status = "dead_letter"
                else:
                    queue.status = CompensationStatus.RETRYING
                    queue.next_retry_at = datetime.now() + timedelta(
                        minutes=settings.RETRY_BACKOFF_MINUTES * (2 ** queue.retry_count)
                    )
                    retry_attempt.status = "failed"

            db.flush()

            if operator:
                AuditService.log_operation(
                    db,
                    OperationType.RETRY,
                    operator,
                    application_id=queue.application_id,
                    queue_id=queue.id,
                    old_status=old_status,
                    new_status=queue.status.value,
                    change_reason=f"处理补偿队列 (第{queue.retry_count}次尝试)",
                    field_changes={
                        "processed_count": len(processed_items),
                        "failed_count": len(failed_items),
                    },
                )

            return queue

        except Exception as e:
            retry_attempt.finished_at = datetime.now()
            retry_attempt.status = "error"
            retry_attempt.error_message = str(e)

            queue.last_error = str(e)
            queue.error_stack = traceback.format_exc()

            if queue.retry_count >= queue.max_retries - 1:
                queue.status = CompensationStatus.DEAD_LETTER
            else:
                queue.status = CompensationStatus.RETRYING
                queue.next_retry_at = datetime.now() + timedelta(
                    minutes=settings.RETRY_BACKOFF_MINUTES * (2 ** (queue.retry_count + 1))
                )

            queue.retry_count += 1
            db.flush()

            if operator:
                AuditService.log_operation(
                    db,
                    OperationType.RETRY,
                    operator,
                    application_id=queue.application_id,
                    queue_id=queue.id,
                    old_status=old_status,
                    new_status=queue.status.value,
                    change_reason=f"处理失败: {str(e)}",
                )

            raise

    @staticmethod
    def _execute_compensation(
        db: Session,
        queue: models.CompensationQueue,
    ) -> tuple:
        processed_items = []
        failed_items = []

        if not queue.disputed_items_summary:
            return processed_items, failed_items

        for item_summary in queue.disputed_items_summary:
            item = db.query(models.ReturnItem).filter(
                models.ReturnItem.id == item_summary["item_id"]
            ).first()

            if not item:
                failed_items.append({
                    **item_summary,
                    "error": "Item not found",
                })
                continue

            try:
                item.compensation_status = "processed"
                processed_items.append({
                    "item_id": item.id,
                    "sku_code": item.sku_code,
                    "disputed_qty": item.disputed_qty,
                    "compensation_amount": item.disputed_qty * item.unit_price,
                })
            except Exception as e:
                failed_items.append({
                    **item_summary,
                    "error": str(e),
                })

        return processed_items, failed_items

    @staticmethod
    def _update_application_items(
        db: Session,
        queue: models.CompensationQueue,
        processed_items: List[Dict],
    ):
        for processed in processed_items:
            item = db.query(models.ReturnItem).filter(
                models.ReturnItem.id == processed["item_id"]
            ).first()
            if item:
                item.compensation_amount = processed.get("compensation_amount", 0)
                item.compensation_status = "completed"

    @staticmethod
    def manual_review(
        db: Session,
        queue_id: int,
        operator: models.User,
        change_reason: str,
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError("Queue item not found")

        old_status = enum_value(queue.status)
        queue.status = CompensationStatus.MANUAL_REVIEW
        queue.assigned_to = operator.id
        db.flush()

        AuditService.log_operation(
            db,
            OperationType.MANUAL_REVIEW,
            operator,
            application_id=queue.application_id,
            queue_id=queue.id,
            old_status=old_status,
            new_status=enum_value(CompensationStatus.MANUAL_REVIEW),
            change_reason=change_reason,
        )

        return queue

    @staticmethod
    def manual_resolve(
        db: Session,
        queue_id: int,
        operator: models.User,
        request: schemas.ManualResolveRequest,
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError("Queue item not found")

        old_status = enum_value(queue.status)
        queue.status = CompensationStatus.MANUAL_RESOLVED
        queue.total_compensation_amount = request.compensation_amount
        queue.processed_items = request.resolved_items
        queue.completed_at = datetime.now()
        db.flush()

        for resolved in request.resolved_items:
            item = db.query(models.ReturnItem).filter(
                models.ReturnItem.id == resolved.get("item_id")
            ).first()
            if item:
                item.compensation_amount = resolved.get("compensation_amount", 0)
                item.compensation_status = "manual_resolved"

        AuditService.log_operation(
            db,
            OperationType.MANUAL_RESOLVE,
            operator,
            application_id=queue.application_id,
            queue_id=queue.id,
            old_status=old_status,
            new_status=enum_value(CompensationStatus.MANUAL_RESOLVED),
            change_reason=request.change_reason,
            field_changes={
                "compensation_amount": request.compensation_amount,
                "resolved_items_count": len(request.resolved_items),
            },
        )

        return queue

    @staticmethod
    def freeze_queue(
        db: Session,
        queue_id: int,
        operator: models.User,
        hours: int,
        reason: str,
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError("Queue item not found")

        old_status = enum_value(queue.status)
        queue.is_frozen = True
        queue.frozen_until = datetime.now() + timedelta(hours=hours)
        queue.freeze_reason = reason
        queue.frozen_by = operator.id
        queue.status = CompensationStatus.FROZEN
        db.flush()

        AuditService.log_operation(
            db,
            OperationType.FREEZE,
            operator,
            application_id=queue.application_id,
            queue_id=queue.id,
            old_status=old_status,
            new_status=enum_value(CompensationStatus.FROZEN),
            change_reason=reason,
            field_changes={"frozen_hours": hours},
        )

        return queue

    @staticmethod
    def unfreeze_queue(
        db: Session,
        queue_id: int,
        operator: models.User,
        change_reason: str = "人工解冻",
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError("Queue item not found")

        old_status = enum_value(queue.status)
        queue.is_frozen = False
        queue.frozen_until = None
        queue.freeze_reason = None
        queue.frozen_by = None
        queue.status = CompensationStatus.QUEUED
        db.flush()

        AuditService.log_operation(
            db,
            OperationType.UNFREEZE,
            operator,
            application_id=queue.application_id,
            queue_id=queue.id,
            old_status=old_status,
            new_status=enum_value(CompensationStatus.QUEUED),
            change_reason=change_reason,
        )

        return queue

    @staticmethod
    def close_queue(
        db: Session,
        queue_id: int,
        operator: models.User,
        change_reason: str,
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError("Queue item not found")

        old_status = enum_value(queue.status)
        queue.status = CompensationStatus.CLOSED
        queue.completed_at = datetime.now()
        db.flush()

        AuditService.log_operation(
            db,
            OperationType.CLOSE,
            operator,
            application_id=queue.application_id,
            queue_id=queue.id,
            old_status=old_status,
            new_status=enum_value(CompensationStatus.CLOSED),
            change_reason=change_reason,
        )

        return queue

    @staticmethod
    def recover_dead_letter(
        db: Session,
        queue_id: int,
        operator: models.User,
        change_reason: str,
    ) -> models.CompensationQueue:
        queue = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.id == queue_id
        ).first()
        if not queue or queue.status != CompensationStatus.DEAD_LETTER:
            raise ValueError("Invalid queue item for recovery")

        old_status = enum_value(queue.status)
        queue.status = CompensationStatus.QUEUED
        queue.retry_count = 0
        queue.last_error = None
        queue.error_stack = None
        db.flush()

        AuditService.log_operation(
            db,
            OperationType.RETRY,
            operator,
            application_id=queue.application_id,
            queue_id=queue.id,
            old_status=old_status,
            new_status=enum_value(CompensationStatus.QUEUED),
            change_reason=change_reason,
        )

        return queue


class ExternalReceiptService:
    @staticmethod
    def create_receipt(
        db: Session,
        receipt_data: schemas.ExternalReceiptCreate,
        operator: models.User,
    ) -> models.ExternalReceipt:
        existing = db.query(models.ExternalReceipt).filter(
            and_(
                models.ExternalReceipt.application_id == receipt_data.application_id,
                models.ExternalReceipt.import_batch_no == receipt_data.import_batch_no,
            )
        ).first()

        if existing and receipt_data.retry_strategy == RetryStrategy.IGNORE:
            return existing

        application = db.query(models.ReturnApplication).filter(
            models.ReturnApplication.id == receipt_data.application_id
        ).first()
        if not application:
            raise ValueError("Return application not found")

        if existing and receipt_data.retry_strategy == RetryStrategy.OVERWRITE:
            db.delete(existing)
            db.flush()

        receipt = models.ExternalReceipt(
            application_id=receipt_data.application_id,
            receipt_no=generate_no("ER"),
            source=receipt_data.source,
            supplier_id=receipt_data.supplier_id,
            confirmed_items=receipt_data.confirmed_items,
            disputed_items=receipt_data.disputed_items,
            total_confirmed_qty=receipt_data.total_confirmed_qty,
            total_disputed_qty=receipt_data.total_disputed_qty,
            confirmation_date=receipt_data.confirmation_date,
            received_by=receipt_data.received_by,
            notes=receipt_data.notes,
            raw_data=receipt_data.raw_data,
            import_batch_no=receipt_data.import_batch_no,
            created_by=operator.id,
        )
        db.add(receipt)
        db.flush()

        ExternalReceiptService._update_application_from_receipt(
            db, application, receipt, receipt_data.retry_strategy
        )

        if receipt_data.total_disputed_qty > 0:
            CompensationQueueService.create_queue(
                db,
                application_id=receipt_data.application_id,
                source_receipt_id=receipt.id,
                operator=operator,
            )

        AuditService.log_operation(
            db,
            OperationType.IMPORT,
            operator,
            application_id=receipt_data.application_id,
            change_reason=f"导入外部回执 (策略: {enum_value(receipt_data.retry_strategy)})",
            field_changes={
                "receipt_no": receipt.receipt_no,
                "confirmed_qty": receipt_data.total_confirmed_qty,
                "disputed_qty": receipt_data.total_disputed_qty,
            },
        )

        return receipt

    @staticmethod
    def _update_application_from_receipt(
        db: Session,
        application: models.ReturnApplication,
        receipt: models.ExternalReceipt,
        strategy: RetryStrategy,
    ):
        if receipt.confirmed_items:
            for confirmed in receipt.confirmed_items:
                item = ExternalReceiptService._find_item_by_sku(
                    application.items, confirmed.get("sku_code"), confirmed.get("batch_no")
                )
                if item:
                    if strategy == RetryStrategy.APPEND:
                        item.supplier_accepted_qty = min(
                            item.supplier_accepted_qty + confirmed.get("quantity", 0),
                            item.quantity,
                        )
                    else:
                        item.supplier_accepted_qty = min(
                            confirmed.get("quantity", 0), item.quantity
                        )

        if receipt.disputed_items:
            for disputed in receipt.disputed_items:
                item = ExternalReceiptService._find_item_by_sku(
                    application.items, disputed.get("sku_code"), disputed.get("batch_no")
                )
                if item:
                    disputed_qty = disputed.get("quantity", 0)
                    item.disputed_qty = disputed_qty
                    item.supplier_rejected_qty = max(
                        item.quantity - item.supplier_accepted_qty, disputed_qty
                    )
                    item.dispute_category = disputed.get("dispute_category")
                    item.dispute_reason = disputed.get("dispute_reason")

        if receipt.total_disputed_qty > 0:
            application.status = ReturnApplicationStatus.SUPPLIER_PARTIAL
        elif receipt.total_confirmed_qty > 0:
            application.status = ReturnApplicationStatus.SUPPLIER_CONFIRMED

    @staticmethod
    def _find_item_by_sku(items: List[models.ReturnItem], sku_code: str, batch_no: Optional[str] = None):
        for item in items:
            if item.sku_code == sku_code:
                if batch_no is None or item.batch_no == batch_no:
                    return item
        return None


class ProcurementViewService:
    @staticmethod
    def get_queue_stats(db: Session) -> schemas.QueueStats:
        stats = db.query(
            models.CompensationQueue.status,
            func.count(models.CompensationQueue.id)
        ).group_by(models.CompensationQueue.status).all()

        status_counts = {status.value: 0 for status in CompensationStatus}
        for status, count in stats:
            status_counts[status.value] = count

        return schemas.QueueStats(
            total_count=sum(status_counts.values()),
            pending_count=status_counts.get(CompensationStatus.PENDING.value, 0),
            queued_count=status_counts.get(CompensationStatus.QUEUED.value, 0),
            processing_count=status_counts.get(CompensationStatus.PROCESSING.value, 0),
            retrying_count=status_counts.get(CompensationStatus.RETRYING.value, 0),
            partial_success_count=status_counts.get(CompensationStatus.PARTIAL_SUCCESS.value, 0),
            success_count=status_counts.get(CompensationStatus.SUCCESS.value, 0),
            failed_count=status_counts.get(CompensationStatus.FAILED.value, 0),
            dead_letter_count=status_counts.get(CompensationStatus.DEAD_LETTER.value, 0),
            manual_review_count=status_counts.get(CompensationStatus.MANUAL_REVIEW.value, 0),
            manual_resolved_count=status_counts.get(CompensationStatus.MANUAL_RESOLVED.value, 0),
            compensated_count=status_counts.get(CompensationStatus.COMPENSATED.value, 0),
            closed_count=status_counts.get(CompensationStatus.CLOSED.value, 0),
            frozen_count=status_counts.get(CompensationStatus.FROZEN.value, 0),
        )

    @staticmethod
    def get_retryable_categories(db: Session) -> List[schemas.RetryableCategory]:
        result = []

        retrying_items = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.status == CompensationStatus.RETRYING
        ).all()

        result.append(schemas.RetryableCategory(
            category="自动重试中",
            count=len(retrying_items),
            items=[{
                "queue_no": q.queue_no,
                "application_no": q.application.application_no,
                "supplier_name": q.application.supplier_name,
                "retry_count": q.retry_count,
                "next_retry_at": q.next_retry_at,
                "last_error": q.last_error,
            } for q in retrying_items]
        ))

        queued_items = db.query(models.CompensationQueue).filter(
            and_(
                models.CompensationQueue.status == CompensationStatus.QUEUED,
                models.CompensationQueue.is_frozen == False,
            )
        ).all()

        result.append(schemas.RetryableCategory(
            category="排队等待中",
            count=len(queued_items),
            items=[{
                "queue_no": q.queue_no,
                "application_no": q.application.application_no,
                "supplier_name": q.application.supplier_name,
                "created_at": q.created_at,
            } for q in queued_items]
        ))

        partial_items = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.status == CompensationStatus.PARTIAL_SUCCESS
        ).all()

        result.append(schemas.RetryableCategory(
            category="部分成功待处理",
            count=len(partial_items),
            items=[{
                "queue_no": q.queue_no,
                "application_no": q.application.application_no,
                "supplier_name": q.application.supplier_name,
                "processed_count": len(q.processed_items or []),
                "failed_count": len(q.failed_items or []),
            } for q in partial_items]
        ))

        return result

    @staticmethod
    def get_dead_letter_analysis(db: Session) -> schemas.DeadLetterAnalysis:
        dead_letters = db.query(models.CompensationQueue).filter(
            models.CompensationQueue.status == CompensationStatus.DEAD_LETTER
        ).all()

        by_error_type = {}
        by_supplier = {}
        eligible_for_recovery = 0

        for dl in dead_letters:
            error_type = dl.last_error or "Unknown"
            by_error_type[error_type] = by_error_type.get(error_type, 0) + 1

            supplier_name = dl.application.supplier_name or "Unknown"
            by_supplier[supplier_name] = by_supplier.get(supplier_name, 0) + 1

            if dl.retry_count < dl.max_retries * 2:
                eligible_for_recovery += 1

        return schemas.DeadLetterAnalysis(
            total_dead_letters=len(dead_letters),
            by_error_type=by_error_type,
            by_supplier=by_supplier,
            eligible_for_recovery=eligible_for_recovery,
        )
