import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Callable
from sqlalchemy.orm import Session

from app.models.base import AsyncTask, TaskStatus


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def create_task(
        self,
        task_type: str,
        created_by: str,
        batch_id: Optional[int] = None
    ) -> AsyncTask:
        task = AsyncTask(
            task_id=str(uuid.uuid4()),
            task_type=task_type,
            batch_id=batch_id,
            created_by=created_by,
            status=TaskStatus.PENDING,
            progress=0,
            retry_count=0,
            max_retries=3
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(
        self,
        task_id: str,
        status: Optional[TaskStatus] = None,
        progress: Optional[int] = None,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        checkpoint: Optional[Dict[str, Any]] = None
    ) -> Optional[AsyncTask]:
        task = self.db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        if not task:
            return None

        if status is not None:
            task.status = status
            if status == TaskStatus.PROCESSING and task.started_at is None:
                task.started_at = datetime.utcnow()
            if status in [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.MANUAL]:
                task.completed_at = datetime.utcnow()

        if progress is not None:
            task.progress = progress
        if error_message is not None:
            task.error_message = error_message
        if error_type is not None:
            task.error_type = error_type
        if result is not None:
            task.result = result
        if checkpoint is not None:
            task.checkpoint = checkpoint

        task.last_heartbeat = datetime.utcnow()
        self.db.commit()
        self.db.refresh(task)
        return task

    def fail_task(
        self,
        task_id: str,
        error_message: str,
        error_type: str,
        retry: bool = True
    ) -> AsyncTask:
        task = self.db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")

        task.error_message = error_message
        task.error_type = error_type
        task.last_heartbeat = datetime.utcnow()

        if retry and task.retry_count < task.max_retries:
            task.retry_count += 1
            task.status = TaskStatus.RETRY
        elif retry and task.retry_count >= task.max_retries:
            task.status = TaskStatus.MANUAL
        else:
            task.status = TaskStatus.FAILED

        self.db.commit()
        self.db.refresh(task)
        return task

    def retry_task(self, task_id: str, force: bool = False) -> Optional[AsyncTask]:
        task = self.db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        if not task:
            return None

        if force:
            task.retry_count = 0
            task.status = TaskStatus.PENDING
            task.error_message = None
            task.error_type = None
        elif task.status == TaskStatus.MANUAL:
            task.retry_count = 0
            task.status = TaskStatus.PENDING
            task.error_message = None
            task.error_type = None

        self.db.commit()
        self.db.refresh(task)
        return task

    def get_task(self, task_id: str) -> Optional[AsyncTask]:
        return self.db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()

    def get_tasks_by_status(self, status: TaskStatus) -> list[AsyncTask]:
        return self.db.query(AsyncTask).filter(AsyncTask.status == status).all()

    def resume_stalled_tasks(self, timeout_seconds: int = 300) -> int:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(seconds=timeout_seconds)
        stalled = self.db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.PROCESSING,
            AsyncTask.last_heartbeat < cutoff
        ).all()

        count = 0
        for task in stalled:
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = TaskStatus.RETRY
            else:
                task.status = TaskStatus.MANUAL
            count += 1

        self.db.commit()
        return count
