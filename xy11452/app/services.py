import logging
import traceback
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.models import (
    ReturnCompensationQueue, OutboundOrder, ReturnPhoto, MaintenanceEstimate,
    ScanDetail, DepositReview, OperationHistory,
    QueueStatus, RetryCategory, OperationType, ConflictStrategy
)
from app.schemas import (
    QueueSubmitRequest, QueueRetryRequest, ManualDecisionRequest,
    FreezeRequest, CloseRequest, CancelRequest, DeadLetterRecoveryRequest
)

logger = logging.getLogger(__name__)


class QueueService:
    def __init__(self, db: Session):
        self.db = db

    def _create_operation_history(
        self,
        queue_id: int,
        operation_type: OperationType,
        operator: str,
        old_status: Optional[QueueStatus] = None,
        new_status: Optional[QueueStatus] = None,
        change_summary: Dict[str, Any] = None,
        detail: str = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        history = OperationHistory(
            queue_id=queue_id,
            operation_type=operation_type,
            operator=operator,
            old_status=old_status,
            new_status=new_status,
            change_summary=change_summary or {},
            detail=detail,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(history)

    def _check_frozen(self, queue: ReturnCompensationQueue) -> bool:
        if queue.is_frozen:
            raise ValueError(f"队列已被冻结，原因: {queue.frozen_reason}")
        return False

    def submit(self, request: QueueSubmitRequest) -> Tuple[ReturnCompensationQueue, bool]:
        existing_queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.idempotency_key == request.idempotency_key
        ).first()

        if existing_queue:
            self._check_frozen(existing_queue)
            return self._handle_existing_queue(existing_queue, request)

        return self._create_new_queue(request)

    def _handle_existing_queue(
        self, queue: ReturnCompensationQueue, request: QueueSubmitRequest
    ) -> Tuple[ReturnCompensationQueue, bool]:
        old_status = queue.status
        change_summary = {
            "conflict_strategy": request.conflict_strategy.value,
            "is_update": True
        }

        if request.conflict_strategy == ConflictStrategy.IGNORE:
            change_summary["action"] = "ignored"
            self._create_operation_history(
                queue.id,
                OperationType.UPDATE,
                request.operator,
                old_status=old_status,
                new_status=queue.status,
                change_summary=change_summary,
                detail="重复提交，策略为忽略",
                ip_address=request.operator_ip,
                user_agent=request.operator_ua
            )
            self.db.commit()
            return queue, False

        elif request.conflict_strategy == ConflictStrategy.OVERWRITE:
            change_summary["action"] = "overwritten"
            self._overwrite_queue_data(queue, request, change_summary)
            self._create_operation_history(
                queue.id,
                OperationType.UPDATE,
                request.operator,
                old_status=old_status,
                new_status=QueueStatus.PENDING,
                change_summary=change_summary,
                detail="重复提交，策略为覆盖",
                ip_address=request.operator_ip,
                user_agent=request.operator_ua
            )
            queue.status = QueueStatus.PENDING
            queue.retry_count = 0
            self.db.commit()
            return queue, True

        elif request.conflict_strategy == ConflictStrategy.APPEND:
            change_summary["action"] = "appended"
            self._append_queue_data(queue, request, change_summary)
            self._create_operation_history(
                queue.id,
                OperationType.UPDATE,
                request.operator,
                old_status=old_status,
                new_status=queue.status,
                change_summary=change_summary,
                detail="重复提交，策略为追加",
                ip_address=request.operator_ip,
                user_agent=request.operator_ua
            )
            self.db.commit()
            return queue, True

        return queue, False

    def _create_new_queue(self, request: QueueSubmitRequest) -> Tuple[ReturnCompensationQueue, bool]:
        queue = ReturnCompensationQueue(
            idempotency_key=request.idempotency_key,
            batch_no=request.batch_no,
            status=QueueStatus.PENDING,
            created_by=request.operator
        )
        self.db.add(queue)
        self.db.flush()

        change_summary = self._populate_queue_data(queue, request)

        self._create_operation_history(
            queue.id,
            OperationType.SUBMIT,
            request.operator,
            old_status=None,
            new_status=QueueStatus.PENDING,
            change_summary=change_summary,
            detail="新队列提交成功",
            ip_address=request.operator_ip,
            user_agent=request.operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue, True

    def _populate_queue_data(
        self, queue: ReturnCompensationQueue, request: QueueSubmitRequest
    ) -> Dict[str, Any]:
        change_summary = {}

        if request.outbound_order:
            self._add_outbound_order(queue, request.outbound_order)
            change_summary["outbound_order_added"] = True
            queue.has_outbound_order = True

        if request.return_photos:
            for photo in request.return_photos:
                self._add_return_photo(queue, photo)
            change_summary["return_photos_count"] = len(request.return_photos)
            queue.has_return_photos = True

        if request.maintenance_estimate:
            self._add_maintenance_estimate(queue, request.maintenance_estimate)
            change_summary["maintenance_estimate_added"] = True
            queue.has_maintenance_estimate = True

        if request.scan_details:
            for detail in request.scan_details:
                self._add_scan_detail(queue, detail)
            change_summary["scan_details_count"] = len(request.scan_details)
            queue.has_scan_details = True

        if request.deposit_reviews:
            for review in request.deposit_reviews:
                self._add_deposit_review(queue, review)
            change_summary["deposit_reviews_count"] = len(request.deposit_reviews)
            queue.has_deposit_review = True

        if request.outbound_order:
            queue.customer_id = request.outbound_order.customer_id
            queue.customer_name = request.outbound_order.customer_name
            queue.deposit_amount = request.outbound_order.deposit_amount
            queue.outbound_order_id = request.outbound_order.order_no

        return change_summary

    def _overwrite_queue_data(
        self, queue: ReturnCompensationQueue, request: QueueSubmitRequest,
        change_summary: Dict[str, Any]
    ):
        if request.outbound_order:
            self.db.query(OutboundOrder).filter(OutboundOrder.queue_id == queue.id).delete()
            self._add_outbound_order(queue, request.outbound_order)
            queue.has_outbound_order = True
            change_summary["outbound_order_overwritten"] = True

        if request.return_photos:
            self.db.query(ReturnPhoto).filter(ReturnPhoto.queue_id == queue.id).delete()
            for photo in request.return_photos:
                self._add_return_photo(queue, photo)
            queue.has_return_photos = True
            change_summary["return_photos_count"] = len(request.return_photos)

        if request.maintenance_estimate:
            self.db.query(MaintenanceEstimate).filter(MaintenanceEstimate.queue_id == queue.id).delete()
            self._add_maintenance_estimate(queue, request.maintenance_estimate)
            queue.has_maintenance_estimate = True
            change_summary["maintenance_estimate_overwritten"] = True

        if request.scan_details:
            self.db.query(ScanDetail).filter(ScanDetail.queue_id == queue.id).delete()
            for detail in request.scan_details:
                self._add_scan_detail(queue, detail)
            queue.has_scan_details = True
            change_summary["scan_details_count"] = len(request.scan_details)

        if request.deposit_reviews:
            self.db.query(DepositReview).filter(DepositReview.queue_id == queue.id).delete()
            for review in request.deposit_reviews:
                self._add_deposit_review(queue, review)
            queue.has_deposit_review = True
            change_summary["deposit_reviews_count"] = len(request.deposit_reviews)

        if request.outbound_order:
            queue.customer_id = request.outbound_order.customer_id
            queue.customer_name = request.outbound_order.customer_name
            queue.deposit_amount = request.outbound_order.deposit_amount

    def _append_queue_data(
        self, queue: ReturnCompensationQueue, request: QueueSubmitRequest,
        change_summary: Dict[str, Any]
    ):
        if request.outbound_order and not queue.has_outbound_order:
            self._add_outbound_order(queue, request.outbound_order)
            queue.has_outbound_order = True
            change_summary["outbound_order_added"] = True
            queue.customer_id = request.outbound_order.customer_id
            queue.customer_name = request.outbound_order.customer_name
            queue.deposit_amount = request.outbound_order.deposit_amount

        if request.return_photos:
            existing_photo_ids = {p.photo_id for p in queue.return_photos}
            added_count = 0
            for photo in request.return_photos:
                if photo.photo_id not in existing_photo_ids:
                    self._add_return_photo(queue, photo)
                    added_count += 1
            if added_count > 0:
                queue.has_return_photos = True
                change_summary["return_photos_added"] = added_count

        if request.maintenance_estimate and not queue.has_maintenance_estimate:
            self._add_maintenance_estimate(queue, request.maintenance_estimate)
            queue.has_maintenance_estimate = True
            change_summary["maintenance_estimate_added"] = True

        if request.scan_details:
            existing_scan_codes = {(s.item_code, s.scan_batch_no) for s in queue.scan_details}
            added_count = 0
            for detail in request.scan_details:
                key = (detail.item_code, detail.scan_batch_no)
                if key not in existing_scan_codes:
                    self._add_scan_detail(queue, detail)
                    added_count += 1
            if added_count > 0:
                queue.has_scan_details = True
                change_summary["scan_details_added"] = added_count

        if request.deposit_reviews:
            existing_review_nos = {r.review_no for r in queue.deposit_reviews}
            added_count = 0
            for review in request.deposit_reviews:
                if review.review_no not in existing_review_nos:
                    self._add_deposit_review(queue, review)
                    added_count += 1
            if added_count > 0:
                queue.has_deposit_review = True
                change_summary["deposit_reviews_added"] = added_count

    def _add_outbound_order(self, queue: ReturnCompensationQueue, data):
        order = OutboundOrder(
            queue_id=queue.id,
            order_no=data.order_no,
            customer_id=data.customer_id,
            customer_name=data.customer_name,
            rental_start_date=data.rental_start_date,
            rental_end_date=data.rental_end_date,
            total_amount=data.total_amount,
            deposit_amount=data.deposit_amount,
            items=data.items
        )
        self.db.add(order)

    def _add_return_photo(self, queue: ReturnCompensationQueue, data):
        photo = ReturnPhoto(
            queue_id=queue.id,
            photo_id=data.photo_id,
            photo_url=data.photo_url,
            photo_type=data.photo_type,
            upload_time=data.upload_time,
            uploader=data.uploader,
            description=data.description,
            photo_metadata=data.metadata
        )
        self.db.add(photo)

    def _add_maintenance_estimate(self, queue: ReturnCompensationQueue, data):
        estimate = MaintenanceEstimate(
            queue_id=queue.id,
            estimate_no=data.estimate_no,
            estimated_amount=data.estimated_amount,
            parts_cost=data.parts_cost,
            labor_cost=data.labor_cost,
            other_cost=data.other_cost,
            damage_description=data.damage_description,
            estimator=data.estimator,
            estimated_at=data.estimated_at,
            items=data.items
        )
        self.db.add(estimate)

    def _add_scan_detail(self, queue: ReturnCompensationQueue, data):
        detail = ScanDetail(
            queue_id=queue.id,
            scan_batch_no=data.scan_batch_no,
            item_code=data.item_code,
            item_name=data.item_name,
            scan_time=data.scan_time,
            scanner=data.scanner,
            scan_location=data.scan_location,
            condition=data.condition,
            quantity=data.quantity,
            is_damaged=data.is_damaged,
            damage_note=data.damage_note
        )
        self.db.add(detail)

    def _add_deposit_review(self, queue: ReturnCompensationQueue, data):
        review = DepositReview(
            queue_id=queue.id,
            review_no=data.review_no,
            batch_return_no=data.batch_return_no,
            deduction_amount=data.deduction_amount,
            deduction_reason=data.deduction_reason,
            reviewer=data.reviewer,
            reviewed_at=data.reviewed_at,
            review_status=data.review_status,
            evidence_chain_complete=data.evidence_chain_complete,
            review_note=data.review_note
        )
        self.db.add(review)

    def process_queue(self, queue_id: int) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        self._check_frozen(queue)

        if queue.status not in [QueueStatus.PENDING, QueueStatus.RETRYING]:
            raise ValueError(f"队列状态不允许处理: {queue.status}")

        old_status = queue.status
        queue.status = QueueStatus.PROCESSING
        self.db.flush()

        try:
            result = self._execute_compensation_logic(queue)
            queue.status = QueueStatus.SUCCESS
            queue.compensated_at = datetime.utcnow()
            queue.error_message = None
            queue.error_stack = None

            self._create_operation_history(
                queue.id,
                OperationType.COMPENSATE,
                "system",
                old_status=old_status,
                new_status=QueueStatus.SUCCESS,
                change_summary={"result": "success", **result},
                detail="补偿处理成功"
            )
            self.db.commit()

        except Exception as e:
            logger.exception(f"处理队列失败 {queue_id}: {str(e)}")
            queue.status = QueueStatus.FAILED
            queue.error_message = str(e)
            queue.error_stack = traceback.format_exc()

            queue.retry_count += 1

            if queue.retry_count >= queue.max_retries:
                queue.status = QueueStatus.DEAD_LETTER
                queue.retry_category = self._classify_error(e)
                detail = "重试次数超限，移入死信队列"
            else:
                queue.status = QueueStatus.FAILED
                queue.next_retry_at = datetime.utcnow() + timedelta(
                    minutes=2 ** queue.retry_count
                )
                queue.retry_category = self._classify_error(e)
                detail = f"处理失败，计划下次重试"

            self._create_operation_history(
                queue.id,
                OperationType.RETRY,
                "system",
                old_status=old_status,
                new_status=queue.status,
                change_summary={
                    "retry_count": queue.retry_count,
                    "error": str(e),
                    "retry_category": queue.retry_category.value
                },
                detail=detail
            )
            self.db.commit()
            raise

        self.db.refresh(queue)
        return queue

    def _execute_compensation_logic(self, queue: ReturnCompensationQueue) -> Dict[str, Any]:
        if not queue.has_outbound_order:
            raise ValueError("缺少出库单数据")
        if not queue.has_return_photos:
            raise ValueError("缺少归还照片数据")
        if not queue.has_maintenance_estimate:
            raise ValueError("缺少维修估价数据")

        total_damage_amount = 0
        if queue.maintenance_estimate:
            total_damage_amount = queue.maintenance_estimate.estimated_amount

        actual_deduction = min(total_damage_amount, queue.deposit_amount)
        compensation_amount = max(0, total_damage_amount - queue.deposit_amount)

        queue.actual_deduction = actual_deduction
        queue.compensation_amount = compensation_amount

        return {
            "total_damage": total_damage_amount,
            "actual_deduction": actual_deduction,
            "compensation_amount": compensation_amount,
            "deposit_amount": queue.deposit_amount
        }

    def _classify_error(self, error: Exception) -> RetryCategory:
        error_str = str(error).lower()
        if "network" in error_str or "connection" in error_str or "timeout" in error_str:
            return RetryCategory.NETWORK_ERROR
        elif "缺少" in error_str or "incomplete" in error_str or "not found" in error_str:
            return RetryCategory.DATA_INCOMPLETE
        elif "valid" in error_str or "验证" in error_str:
            return RetryCategory.VALIDATION_ERROR
        elif "depend" in error_str:
            return RetryCategory.DEPENDENCY_ERROR
        return RetryCategory.UNKNOWN

    def retry(self, queue_id: int, request: QueueRetryRequest) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        self._check_frozen(queue)

        if queue.status not in [QueueStatus.FAILED, QueueStatus.DEAD_LETTER]:
            raise ValueError(f"只有失败或死信状态才能重试: {queue.status}")

        old_status = queue.status
        queue.status = QueueStatus.RETRYING
        queue.retry_count = 0
        queue.next_retry_at = None
        if request.retry_category:
            queue.retry_category = request.retry_category

        self._create_operation_history(
            queue.id,
            OperationType.RETRY,
            request.operator,
            old_status=old_status,
            new_status=QueueStatus.RETRYING,
            change_summary={"manual_retry": True},
            detail="人工触发重试",
            ip_address=request.operator_ip,
            user_agent=request.operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue

    def manual_decision(self, queue_id: int, request: ManualDecisionRequest) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        self._check_frozen(queue)

        old_status = queue.status
        queue.status = QueueStatus.MANUAL
        queue.is_manual = True
        queue.manual_handler = request.operator
        queue.manual_decision = request.decision
        queue.manual_note = request.note
        queue.manual_at = datetime.utcnow()

        if request.compensation_amount is not None:
            queue.compensation_amount = request.compensation_amount
        if request.actual_deduction is not None:
            queue.actual_deduction = request.actual_deduction

        self._create_operation_history(
            queue.id,
            OperationType.MANUAL_DECISION,
            request.operator,
            old_status=old_status,
            new_status=QueueStatus.MANUAL,
            change_summary={
                "decision": request.decision,
                "compensation_amount": request.compensation_amount,
                "actual_deduction": request.actual_deduction
            },
            detail=request.note,
            ip_address=request.operator_ip,
            user_agent=request.operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue

    def freeze(self, queue_id: int, request: FreezeRequest) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        if queue.is_frozen:
            raise ValueError("队列已经被冻结")

        old_status = queue.status
        queue.is_frozen = True
        queue.frozen_at = datetime.utcnow()
        queue.frozen_by = request.operator
        queue.frozen_reason = request.reason

        self._create_operation_history(
            queue.id,
            OperationType.FREEZE,
            request.operator,
            old_status=old_status,
            new_status=QueueStatus.FROZEN,
            change_summary={"reason": request.reason},
            detail="队列已冻结",
            ip_address=request.operator_ip,
            user_agent=request.operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue

    def unfreeze(self, queue_id: int, operator: str, operator_ip: str = None, operator_ua: str = None) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        if not queue.is_frozen:
            raise ValueError("队列未被冻结")

        old_status = QueueStatus.FROZEN
        queue.is_frozen = False
        queue.frozen_at = None
        queue.frozen_by = None
        queue.frozen_reason = None

        target_status = QueueStatus.PENDING
        if queue.retry_count > 0 and queue.status != QueueStatus.DEAD_LETTER:
            target_status = QueueStatus.RETRYING

        self._create_operation_history(
            queue.id,
            OperationType.UNFREEZE,
            operator,
            old_status=old_status,
            new_status=target_status,
            change_summary={},
            detail="队列已解冻",
            ip_address=operator_ip,
            user_agent=operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue

    def close(self, queue_id: int, request: CloseRequest) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        self._check_frozen(queue)

        if queue.status == QueueStatus.CLOSED:
            raise ValueError("队列已经关闭")

        old_status = queue.status
        queue.status = QueueStatus.CLOSED
        queue.closed_at = datetime.utcnow()
        queue.closed_by = request.operator

        self._create_operation_history(
            queue.id,
            OperationType.CLOSE,
            request.operator,
            old_status=old_status,
            new_status=QueueStatus.CLOSED,
            change_summary={"close_note": request.close_note},
            detail=request.close_note or "队列已关闭",
            ip_address=request.operator_ip,
            user_agent=request.operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue

    def cancel(self, queue_id: int, request: CancelRequest) -> ReturnCompensationQueue:
        queue = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()
        if not queue:
            raise ValueError(f"队列记录不存在: {queue_id}")

        self._check_frozen(queue)

        if queue.status in [QueueStatus.CLOSED, QueueStatus.SUCCESS]:
            raise ValueError(f"当前状态不允许撤回: {queue.status}")

        old_status = queue.status
        queue.status = QueueStatus.CANCELLED

        self._create_operation_history(
            queue.id,
            OperationType.CANCEL,
            request.operator,
            old_status=old_status,
            new_status=QueueStatus.CANCELLED,
            change_summary={"cancel_reason": request.cancel_reason},
            detail=request.cancel_reason or "队列已撤回",
            ip_address=request.operator_ip,
            user_agent=request.operator_ua
        )

        self.db.commit()
        self.db.refresh(queue)
        return queue

    def recover_dead_letters(self, request: DeadLetterRecoveryRequest) -> List[ReturnCompensationQueue]:
        queues = self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id.in_(request.queue_ids),
            ReturnCompensationQueue.status == QueueStatus.DEAD_LETTER
        ).all()

        recovered = []
        for queue in queues:
            old_status = queue.status
            queue.status = QueueStatus.RETRYING
            queue.retry_count = 0
            queue.next_retry_at = None

            self._create_operation_history(
                queue.id,
                OperationType.RETRY,
                request.operator,
                old_status=old_status,
                new_status=QueueStatus.RETRYING,
                change_summary={"recovery_note": request.recovery_note},
                detail="从死信队列恢复",
                ip_address=request.operator_ip,
                user_agent=request.operator_ua
            )
            recovered.append(queue)

        self.db.commit()
        return recovered

    def get_queue(self, queue_id: int) -> Optional[ReturnCompensationQueue]:
        return self.db.query(ReturnCompensationQueue).filter(
            ReturnCompensationQueue.id == queue_id
        ).first()

    def list_queues(
        self,
        status: Optional[QueueStatus] = None,
        retry_category: Optional[RetryCategory] = None,
        customer_id: Optional[str] = None,
        is_frozen: Optional[bool] = None,
        is_manual: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[ReturnCompensationQueue], int]:
        query = self.db.query(ReturnCompensationQueue)

        if status:
            query = query.filter(ReturnCompensationQueue.status == status)
        if retry_category:
            query = query.filter(ReturnCompensationQueue.retry_category == retry_category)
        if customer_id:
            query = query.filter(ReturnCompensationQueue.customer_id == customer_id)
        if is_frozen is not None:
            query = query.filter(ReturnCompensationQueue.is_frozen == is_frozen)
        if is_manual is not None:
            query = query.filter(ReturnCompensationQueue.is_manual == is_manual)

        total = query.count()
        items = query.order_by(ReturnCompensationQueue.created_at.desc()).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        return items, total

    def get_finance_summary(self) -> Dict[str, Any]:
        from sqlalchemy import func

        query = self.db.query(
            ReturnCompensationQueue.status,
            func.count(ReturnCompensationQueue.id),
            func.sum(ReturnCompensationQueue.deposit_amount),
            func.sum(ReturnCompensationQueue.compensation_amount),
            func.sum(ReturnCompensationQueue.actual_deduction)
        ).group_by(ReturnCompensationQueue.status)

        summary = {
            "total_count": 0,
            "pending_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "manual_count": 0,
            "dead_letter_count": 0,
            "total_deposit": 0,
            "total_compensation": 0,
            "total_actual_deduction": 0
        }

        for status, count, deposit, compensation, deduction in query.all():
            summary["total_count"] += count
            summary["total_deposit"] += deposit or 0
            summary["total_compensation"] += compensation or 0
            summary["total_actual_deduction"] += deduction or 0

            if status == QueueStatus.PENDING:
                summary["pending_count"] = count
            elif status == QueueStatus.SUCCESS:
                summary["success_count"] = count
            elif status == QueueStatus.FAILED:
                summary["failed_count"] = count
            elif status == QueueStatus.MANUAL:
                summary["manual_count"] = count
            elif status == QueueStatus.DEAD_LETTER:
                summary["dead_letter_count"] = count

        return summary

    def get_dead_letter_retry_categories(self) -> Dict[str, int]:
        from sqlalchemy import func

        query = self.db.query(
            ReturnCompensationQueue.retry_category,
            func.count(ReturnCompensationQueue.id)
        ).filter(
            ReturnCompensationQueue.status == QueueStatus.DEAD_LETTER
        ).group_by(ReturnCompensationQueue.retry_category)

        result = {}
        for category, count in query.all():
            if category:
                result[category.value] = count

        return result
