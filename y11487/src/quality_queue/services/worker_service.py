from datetime import datetime, timedelta
from typing import Optional, List, Callable, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import uuid
import time
import threading

from ..models import (
    CompensationQueue, QueueStatus, RetryCategory,
    WorkerState, WorkerStatus, ExternalReceipt, ReceiptStatus,
    RecordSource
)
from .queue_service import QueueService
from .lock_service import LockService


class QueueWorker:
    def __init__(self, db: Session, worker_id: Optional[str] = None,
                 poll_interval: int = 5, batch_size: int = 10):
        self.db = db
        self.worker_id = worker_id or f"worker_{uuid.uuid4().hex[:8]}"
        self.poll_interval = poll_interval
        self.batch_size = batch_size
        self.lock_service = LockService(db, self.worker_id)
        self.queue_service = QueueService(db, self.worker_id, "worker")
        self._running = False
        self._thread: Optional[threading.Thread] = None

        self._register_worker()

    def _register_worker(self):
        worker = self.db.query(WorkerState).filter(
            WorkerState.worker_id == self.worker_id
        ).first()

        if not worker:
            worker = WorkerState(
                worker_id=self.worker_id,
                status=WorkerStatus.IDLE,
                config={"poll_interval": self.poll_interval, "batch_size": self.batch_size}
            )
            self.db.add(worker)
            self.db.flush()
        else:
            worker.status = WorkerStatus.IDLE
            worker.last_heartbeat = datetime.now()
            self.db.flush()

    def _heartbeat(self):
        worker = self.db.query(WorkerState).filter(
            WorkerState.worker_id == self.worker_id
        ).first()
        if worker:
            worker.last_heartbeat = datetime.now()
            self.db.flush()

    def _get_pending_items(self) -> List[CompensationQueue]:
        now = datetime.now()

        items = self.db.query(CompensationQueue).filter(
            or_(
                CompensationQueue.status == QueueStatus.PENDING,
                and_(
                    CompensationQueue.status == QueueStatus.RETRYING,
                    CompensationQueue.next_retry_at <= now
                )
            )
        ).order_by(
            CompensationQueue.created_at.asc()
        ).limit(self.batch_size).all()

        return items

    def _process_item(self, item: CompensationQueue) -> bool:
        lock_key = f"queue_{item.id}"
        with self.lock_service.lock("compensation_queue", lock_key, wait=False) as acquired:
            if not acquired:
                return False

            try:
                worker = self.db.query(WorkerState).filter(
                    WorkerState.worker_id == self.worker_id
                ).first()
                if worker:
                    worker.status = WorkerStatus.RUNNING
                    worker.current_queue_id = item.id
                    self.db.flush()

                success, msg = self.queue_service.process_queue(item.id)
                if not success:
                    return False

                if item.retry_category == RetryCategory.AUTO_RETRYABLE:
                    success, msg = self.queue_service.compensate(item.id)
                    if success:
                        worker = self.db.query(WorkerState).filter(
                            WorkerState.worker_id == self.worker_id
                        ).first()
                        if worker:
                            worker.processed_count += 1
                        return True
                    else:
                        success, msg = self.queue_service.retry_queue(item.id, msg)
                        return False
                elif item.retry_category == RetryCategory.MANUAL_REQUIRED:
                    reason = f"缺陷类型: {item.defect_type or '未知'}, 需人工确认"
                    success, msg = self.queue_service.transfer_to_manual(item.id, reason)
                    if success:
                        worker = self.db.query(WorkerState).filter(
                            WorkerState.worker_id == self.worker_id
                        ).first()
                        if worker:
                            worker.processed_count += 1
                        return True
                    return False
                else:
                    success, msg = self.queue_service.transfer_to_manual(
                        item.id, "不可自动重试，需人工处理"
                    )
                    return success

            except Exception as e:
                self.queue_service.retry_queue(item.id, str(e))
                worker = self.db.query(WorkerState).filter(
                    WorkerState.worker_id == self.worker_id
                ).first()
                if worker:
                    worker.error_count += 1
                return False
            finally:
                worker = self.db.query(WorkerState).filter(
                    WorkerState.worker_id == self.worker_id
                ).first()
                if worker:
                    worker.status = WorkerStatus.IDLE
                    worker.current_queue_id = None
                    self.db.flush()
                self.db.commit()

    def process_once(self) -> int:
        self._heartbeat()
        items = self._get_pending_items()
        processed = 0

        for item in items:
            if self._process_item(item):
                processed += 1

        self._heartbeat()
        return processed

    def start(self):
        self._running = True
        worker = self.db.query(WorkerState).filter(
            WorkerState.worker_id == self.worker_id
        ).first()
        if worker:
            worker.status = WorkerStatus.RUNNING
            self.db.flush()
            self.db.commit()

        while self._running:
            try:
                self.process_once()
                time.sleep(self.poll_interval)
            except Exception as e:
                print(f"Worker error: {e}")
                time.sleep(self.poll_interval)

        worker = self.db.query(WorkerState).filter(
            WorkerState.worker_id == self.worker_id
        ).first()
        if worker:
            worker.status = WorkerStatus.STOPPED
            self.db.flush()
            self.db.commit()

    def start_background(self):
        self._thread = threading.Thread(target=self.start, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=10)

    def pause(self):
        self._running = False
        worker = self.db.query(WorkerState).filter(
            WorkerState.worker_id == self.worker_id
        ).first()
        if worker:
            worker.status = WorkerStatus.PAUSED
            self.db.flush()
            self.db.commit()


class ReceiptProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.queue_service = QueueService(db, "receipt_processor", "worker")
        self.data_service = None

    def _get_data_service(self):
        if self.data_service is None:
            from .data_service import DataService
            self.data_service = DataService(self.db)
        return self.data_service

    def submit_receipt(self, source_type: str, payload: Dict[str, Any],
                       source_system: str = "external",
                       callback_url: Optional[str] = None) -> ExternalReceipt:
        receipt_no = f"RCP{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4]}"

        type_map = {
            "shift": RecordSource.SHIFT,
            "inspection": RecordSource.INSPECTION,
            "rework": RecordSource.REWORK,
            "sms": RecordSource.SMS,
        }
        enum_source_type = type_map.get(source_type.lower(), RecordSource.SMS)

        receipt = ExternalReceipt(
            receipt_no=receipt_no,
            source_system=source_system,
            source_type=enum_source_type,
            status=ReceiptStatus.RECEIVED,
            payload=payload,
            callback_url=callback_url
        )
        self.db.add(receipt)
        self.db.flush()
        return receipt

    def process_receipt(self, receipt_id: int) -> bool:
        receipt = self.db.query(ExternalReceipt).filter(
            ExternalReceipt.id == receipt_id
        ).first()

        if not receipt or receipt.status in [ReceiptStatus.SUCCESS, ReceiptStatus.FAILED]:
            return False

        receipt.status = ReceiptStatus.VALIDATING
        self.db.flush()

        try:
            data_service = self._get_data_service()
            source_type = receipt.source_type.value

            if source_type == "shift":
                shift, dirty_records = data_service.create_machine_shift(receipt.payload)
                receipt.shift_id = shift.id
            elif source_type == "inspection":
                inspection, dirty_records = data_service.create_inspection(receipt.payload)
                receipt.inspection_id = inspection.id
                queue_item = self.queue_service.submit_from_inspection(inspection.id)
                receipt.queue_item_id = queue_item.id
            elif source_type == "rework":
                rework, dirty_records = data_service.create_rework_order(receipt.payload)
                receipt.rework_order_id = rework.id
                queue_item = self.queue_service.submit_from_rework(rework.id)
                receipt.queue_item_id = queue_item.id
            elif source_type == "sms":
                exception = data_service.create_exception_record(receipt.payload)
                receipt.exception_id = exception.id
                queue_item = self.queue_service.submit_from_exception(exception.id)
                receipt.queue_item_id = queue_item.id

            receipt.status = ReceiptStatus.SUCCESS
            receipt.processed_at = datetime.now()
            self.db.flush()
            return True

        except Exception as e:
            receipt.status = ReceiptStatus.FAILED
            receipt.error_message = str(e)
            receipt.retry_count += 1

            if receipt.retry_count < receipt.max_retries:
                receipt.next_retry_at = datetime.now() + timedelta(minutes=5 * receipt.retry_count)
                receipt.status = ReceiptStatus.RECEIVED

            self.db.flush()
            return False

    def process_pending_receipts(self, limit: int = 100) -> int:
        now = datetime.now()
        receipts = self.db.query(ExternalReceipt).filter(
            or_(
                ExternalReceipt.status == ReceiptStatus.RECEIVED,
                and_(
                    ExternalReceipt.status == ReceiptStatus.RECEIVED,
                    ExternalReceipt.next_retry_at <= now
                )
            )
        ).limit(limit).all()

        success_count = 0
        for receipt in receipts:
            if self.process_receipt(receipt.id):
                success_count += 1
            self.db.commit()

        return success_count
