import uuid
import traceback
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from sqlalchemy.orm import Session

from .models import AsyncTask, TaskStatus, Batch
from .config import settings

logger = logging.getLogger(__name__)


class TaskProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.handlers: Dict[str, Callable] = {}

    def register_handler(self, task_type: str, handler: Callable):
        self.handlers[task_type] = handler

    def create_task(
        self,
        batch_id: str,
        task_type: str,
        created_by: str,
        payload: Optional[Dict[str, Any]] = None,
        max_retries: int = 3
    ) -> AsyncTask:
        task = AsyncTask(
            id=str(uuid.uuid4()),
            batch_id=batch_id,
            task_type=task_type,
            status=TaskStatus.PENDING,
            retry_count=0,
            max_retries=max_retries,
            payload=payload,
            created_by=created_by,
            queued_at=datetime.utcnow()
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        logger.info(f"Created task {task.id} ({task_type}) for batch {batch_id}")
        return task

    def get_pending_tasks(self) -> List[AsyncTask]:
        now = datetime.utcnow()
        return (
            self.db.query(AsyncTask)
            .filter(
                AsyncTask.status.in_([TaskStatus.PENDING, TaskStatus.WAITING_RETRY]),
                (AsyncTask.next_retry_at.is_(None) | (AsyncTask.next_retry_at <= now))
            )
            .order_by(AsyncTask.queued_at.asc())
            .all()
        )

    def get_manual_tasks(self) -> List[AsyncTask]:
        return (
            self.db.query(AsyncTask)
            .filter(AsyncTask.status == TaskStatus.WAITING_MANUAL)
            .order_by(AsyncTask.queued_at.asc())
            .all()
        )

    def process_task(self, task: AsyncTask) -> AsyncTask:
        if task.task_type not in self.handlers:
            error_msg = f"No handler registered for task type: {task.task_type}"
            logger.error(error_msg)
            return self._fail_permanently(task, error_msg)

        task.status = TaskStatus.PROCESSING
        task.started_at = datetime.utcnow()
        self.db.commit()

        try:
            handler = self.handlers[task.task_type]
            result = handler(task.payload)

            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.result = result
            self.db.commit()

            logger.info(f"Task {task.id} completed successfully")
            return task

        except Exception as e:
            return self._handle_task_failure(task, e)

    def _handle_task_failure(self, task: AsyncTask, exception: Exception) -> AsyncTask:
        error_msg = str(exception)
        error_tb = traceback.format_exc()

        task.last_error = error_msg
        task.error_traceback = error_tb
        task.retry_count += 1

        logger.error(
            f"Task {task.id} failed (attempt {task.retry_count}/{task.max_retries}): {error_msg}"
        )

        if task.retry_count >= task.max_retries:
            return self._fail_manual(task, "Max retries exceeded")
        else:
            task.status = TaskStatus.WAITING_RETRY
            task.next_retry_at = datetime.utcnow() + timedelta(
                seconds=settings.RETRY_DELAY_SECONDS
            )
            self.db.commit()
            return task

    def _fail_permanently(self, task: AsyncTask, reason: str) -> AsyncTask:
        task.status = TaskStatus.PERMANENT_FAILED
        task.completed_at = datetime.utcnow()
        task.last_error = reason
        self.db.commit()
        logger.error(f"Task {task.id} permanently failed: {reason}")
        return task

    def _fail_manual(self, task: AsyncTask, reason: str) -> AsyncTask:
        task.status = TaskStatus.WAITING_MANUAL
        task.last_error = f"{reason} - requires manual intervention"
        self.db.commit()
        logger.warning(f"Task {task.id} requires manual intervention: {reason}")
        return task

    def retry_task(
        self,
        task: AsyncTask,
        retried_by: str,
        reason: Optional[str] = None
    ) -> AsyncTask:
        if task.status not in [TaskStatus.WAITING_RETRY, TaskStatus.WAITING_MANUAL, TaskStatus.PERMANENT_FAILED]:
            raise ValueError(f"Cannot retry task in status: {task.status}")

        task.status = TaskStatus.PENDING
        task.next_retry_at = None
        task.retry_count = 0
        task.last_error = None
        task.error_traceback = None

        self.db.commit()
        logger.info(f"Task {task.id} reset for retry by {retried_by}")
        return task

    def resolve_manual_task(
        self,
        task: AsyncTask,
        resolved_by: str,
        resolution: str,
        result: Optional[Dict[str, Any]] = None
    ) -> AsyncTask:
        if task.status != TaskStatus.WAITING_MANUAL:
            raise ValueError(f"Task is not waiting for manual resolution: {task.status}")

        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        task.result = {
            "resolution": resolution,
            "resolved_by": resolved_by,
            "result": result
        }

        self.db.commit()
        logger.info(f"Task {task.id} resolved manually by {resolved_by}: {resolution}")
        return task

    def recover_tasks(self) -> int:
        stuck_tasks = (
            self.db.query(AsyncTask)
            .filter(
                AsyncTask.status == TaskStatus.PROCESSING,
                AsyncTask.started_at < datetime.utcnow() - timedelta(hours=1)
            )
            .all()
        )

        for task in stuck_tasks:
            if task.retry_count >= task.max_retries:
                task.status = TaskStatus.WAITING_MANUAL
            else:
                task.status = TaskStatus.WAITING_RETRY
                task.next_retry_at = datetime.utcnow() + timedelta(seconds=30)

        self.db.commit()

        count = len(stuck_tasks)
        if count > 0:
            logger.info(f"Recovered {count} stuck tasks")
        return count

    def run_once(self) -> int:
        self.recover_tasks()
        tasks = self.get_pending_tasks()
        processed = 0

        for task in tasks:
            self.process_task(task)
            processed += 1

        return processed
