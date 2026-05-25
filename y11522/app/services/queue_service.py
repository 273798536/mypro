from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.compensation_queue import CompensationQueue, StatusHistory
from app.models.enums import QueueStatus, FailCategory
from app.schemas.compensation_queue import QueueItemCreate
from app.models.raw_data import RawDataRecord

settings = get_settings()


class QueueService:
    def __init__(self, db: Session):
        self.db = db

    def _add_status_history(
        self,
        queue_id: int,
        from_status: Optional[QueueStatus],
        to_status: QueueStatus,
        changed_by: Optional[str] = None,
        change_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        history = StatusHistory(
            queue_id=queue_id,
            from_status=from_status,
            to_status=to_status,
            changed_at=datetime.utcnow(),
            changed_by=changed_by,
            change_reason=change_reason,
            extra_data=metadata,
        )
        self.db.add(history)

    def _change_status(
        self,
        queue_item: CompensationQueue,
        new_status: QueueStatus,
        changed_by: Optional[str] = None,
        change_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        old_status = queue_item.status
        if old_status != new_status:
            self._add_status_history(
                queue_id=queue_item.id,
                from_status=old_status,
                to_status=new_status,
                changed_by=changed_by,
                change_reason=change_reason,
                metadata=metadata,
            )
            queue_item.status = new_status
            queue_item.updated_at = datetime.utcnow()

    def _require_status(
        self,
        queue_item: CompensationQueue,
        allowed: List[QueueStatus],
        action: str,
    ) -> None:
        if queue_item.status not in allowed:
            allowed_str = ", ".join(s.value for s in allowed)
            raise ValueError(
                f"当前状态 {queue_item.status.value} 不允许{action}，合法状态: {allowed_str}"
            )

    def create_queue_item(self, item_data: QueueItemCreate, operator: Optional[str] = None) -> CompensationQueue:
        existing = self.db.query(CompensationQueue).filter(CompensationQueue.queue_key == item_data.queue_key).first()
        if existing:
            return existing

        queue_item = CompensationQueue(
            queue_key=item_data.queue_key,
            appointment_no=item_data.appointment_no,
            order_no=item_data.order_no,
            user_id=item_data.user_id,
            technician_id=item_data.technician_id,
            region=item_data.region,
            is_rescheduled=item_data.is_rescheduled,
            is_second_visit=item_data.is_second_visit,
            has_negative_review=item_data.has_negative_review,
            review_reason=item_data.review_reason,
            compensation_amount=item_data.compensation_amount,
            compensation_reason=item_data.compensation_reason,
            status=QueueStatus.PENDING,
            retry_count=0,
            max_retry_times=settings.MAX_RETRY_TIMES,
            raw_data_ids=item_data.raw_data_ids,
            raw_data_sources=item_data.raw_data_sources,
        )
        self.db.add(queue_item)
        self.db.flush()

        self._add_status_history(
            queue_id=queue_item.id,
            from_status=None,
            to_status=QueueStatus.PENDING,
            changed_by=operator,
            change_reason="队列项创建",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def get_queue_item(self, queue_id: int) -> Optional[CompensationQueue]:
        return self.db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()

    def get_queue_item_by_key(self, queue_key: str) -> Optional[CompensationQueue]:
        return self.db.query(CompensationQueue).filter(CompensationQueue.queue_key == queue_key).first()

    def list_queue_items(
        self,
        status: Optional[QueueStatus] = None,
        region: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CompensationQueue]:
        query = self.db.query(CompensationQueue)
        if status:
            query = query.filter(CompensationQueue.status == status)
        if region:
            query = query.filter(CompensationQueue.region == region)
        return query.order_by(CompensationQueue.created_at.desc()).offset(skip).limit(limit).all()

    def submit_receipt(
        self,
        queue_id: int,
        receipt_data: Dict[str, Any],
        operator: Optional[str] = None,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        if queue_item.receipt_submitted:
            return queue_item

        self._require_status(queue_item, [QueueStatus.PENDING], "提交外部回执")

        queue_item.receipt_data = receipt_data
        queue_item.receipt_submitted = True
        queue_item.receipt_submitted_at = datetime.utcnow()

        self._change_status(
            queue_item,
            QueueStatus.PROCESSING,
            changed_by=operator,
            change_reason="外部回执已提交，开始处理",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def mark_processing(
        self,
        queue_id: int,
        operator: Optional[str] = None,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        self._require_status(queue_item, [QueueStatus.PENDING, QueueStatus.WAITING_RETRY], "标记处理中")

        self._change_status(
            queue_item,
            QueueStatus.PROCESSING,
            changed_by=operator,
            change_reason="开始处理",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def mark_failed(
        self,
        queue_id: int,
        error: str,
        fail_category: FailCategory,
        operator: Optional[str] = None,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        self._require_status(
            queue_item,
            [QueueStatus.PROCESSING],
            "标记失败",
        )

        queue_item.last_error = error
        queue_item.last_failed_at = datetime.utcnow()
        queue_item.fail_category = fail_category

        if fail_category == FailCategory.PERMANENT:
            new_status = QueueStatus.PERMANENT_FAILED
            reason = "处理失败，标记为永久失败"
        elif fail_category == FailCategory.NEED_MANUAL:
            new_status = QueueStatus.WAITING_MANUAL
            reason = "处理失败，需要人工接管"
        else:
            queue_item.retry_count += 1
            if queue_item.retry_count >= queue_item.max_retry_times:
                new_status = QueueStatus.PERMANENT_FAILED
                reason = f"处理失败，已达最大重试次数({queue_item.max_retry_times})，标记为永久失败"
                queue_item.fail_category = FailCategory.PERMANENT
            else:
                new_status = QueueStatus.WAITING_RETRY
                queue_item.next_retry_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
                reason = f"处理失败，等待第{queue_item.retry_count}次重试"

        self._change_status(
            queue_item,
            new_status,
            changed_by=operator,
            change_reason=reason,
            metadata={"error": error, "retry_count": queue_item.retry_count},
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def retry_item(
        self,
        queue_id: int,
        operator: Optional[str] = None,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        if queue_item.status not in [QueueStatus.WAITING_RETRY, QueueStatus.PERMANENT_FAILED]:
            raise ValueError(f"当前状态 {queue_item.status.value} 不支持重试")

        self._change_status(
            queue_item,
            QueueStatus.PROCESSING,
            changed_by=operator,
            change_reason="手动触发重试",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def get_items_for_retry(self, batch_size: int = 100) -> List[CompensationQueue]:
        now = datetime.utcnow()
        return (
            self.db.query(CompensationQueue)
            .filter(
                CompensationQueue.status == QueueStatus.WAITING_RETRY,
                CompensationQueue.next_retry_at <= now,
            )
            .order_by(CompensationQueue.next_retry_at)
            .limit(batch_size)
            .all()
        )

    def manual_takeover(
        self,
        queue_id: int,
        operator: str,
        note: Optional[str] = None,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        self._require_status(
            queue_item,
            [QueueStatus.PENDING, QueueStatus.PROCESSING, QueueStatus.WAITING_RETRY, QueueStatus.PERMANENT_FAILED, QueueStatus.WAITING_MANUAL],
            "人工接管",
        )

        queue_item.manual_taken_by = operator
        queue_item.manual_taken_at = datetime.utcnow()
        if note:
            queue_item.manual_note = note

        self._change_status(
            queue_item,
            QueueStatus.WAITING_MANUAL,
            changed_by=operator,
            change_reason=f"人工接管: {note}" if note else "人工接管",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def start_compensation(
        self,
        queue_id: int,
        amount: int,
        reason: str,
        operator: str,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        self._require_status(
            queue_item,
            [QueueStatus.PROCESSING, QueueStatus.WAITING_MANUAL],
            "开始补偿",
        )

        queue_item.compensation_amount = amount
        queue_item.compensation_reason = reason

        self._change_status(
            queue_item,
            QueueStatus.COMPENSATING,
            changed_by=operator,
            change_reason=f"开始补偿: {reason}, 金额: {amount}",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def complete_compensation(
        self,
        queue_id: int,
        operator: str,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        if queue_item.status != QueueStatus.COMPENSATING:
            raise ValueError(f"当前状态 {queue_item.status.value} 不是补偿中状态")

        queue_item.compensated_at = datetime.utcnow()
        queue_item.compensated_by = operator

        self._change_status(
            queue_item,
            QueueStatus.COMPLETED,
            changed_by=operator,
            change_reason="补偿完成",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def close_queue_item(
        self,
        queue_id: int,
        reason: str,
        operator: str,
    ) -> CompensationQueue:
        queue_item = self.get_queue_item(queue_id)
        if not queue_item:
            raise ValueError(f"队列项不存在: {queue_id}")

        if queue_item.status == QueueStatus.CLOSED:
            raise ValueError(f"队列项已关闭，不能重复关闭")

        queue_item.closed_at = datetime.utcnow()
        queue_item.closed_by = operator
        queue_item.close_reason = reason

        self._change_status(
            queue_item,
            QueueStatus.CLOSED,
            changed_by=operator,
            change_reason=f"关闭队列: {reason}",
        )

        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def get_status_history(self, queue_id: int) -> List[StatusHistory]:
        return (
            self.db.query(StatusHistory)
            .filter(StatusHistory.queue_id == queue_id)
            .order_by(StatusHistory.changed_at)
            .all()
        )

    def build_queue_from_raw_data(self, appointment_no: str, operator: Optional[str] = None) -> CompensationQueue:
        existing = self.get_queue_item_by_key(f"appt_{appointment_no}")
        if existing:
            return existing

        raw_records = (
            self.db.query(RawDataRecord)
            .filter(RawDataRecord.appointment_no == appointment_no)
            .all()
        )

        if not raw_records:
            raise ValueError(f"未找到预约单 {appointment_no} 的原始数据")

        is_rescheduled = any(r.is_rescheduled for r in raw_records)
        is_second_visit = any(r.is_second_visit for r in raw_records)
        has_negative_review = any(r.review_type == "negative" for r in raw_records)

        first_record = raw_records[0]
        review_reason = None
        for r in raw_records:
            if r.review_type == "negative" and r.parsed_data:
                review_reason = r.parsed_data.get("review_reason")
                break

        raw_data_ids = [r.id for r in raw_records]
        raw_data_sources = list({r.source_type for r in raw_records})

        queue_data = QueueItemCreate(
            queue_key=f"appt_{appointment_no}",
            appointment_no=appointment_no,
            order_no=first_record.order_no,
            user_id=first_record.user_id,
            technician_id=first_record.technician_id,
            region=first_record.region,
            is_rescheduled=is_rescheduled,
            is_second_visit=is_second_visit,
            has_negative_review=has_negative_review,
            review_reason=review_reason,
            raw_data_ids=raw_data_ids,
            raw_data_sources=raw_data_sources,
        )

        return self.create_queue_item(queue_data, operator=operator)
