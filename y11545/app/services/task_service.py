from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, Callable
from datetime import datetime, timedelta
import uuid
import traceback

from app.models import AsyncTask, TaskStatus, Batch, BatchStatus, OperationType
from app.config import settings
from app.services.audit_service import AuditService
from app.services.batch_service import BatchService


class TaskService:
    @staticmethod
    def create_task(
        db: Session,
        task_name: str,
        input_data: Optional[Dict[str, Any]] = None,
        batch_id: Optional[int] = None,
        created_by: Optional[str] = None,
        max_retries: int = None
    ) -> AsyncTask:
        task = AsyncTask(
            task_id=str(uuid.uuid4()),
            task_name=task_name,
            status=TaskStatus.PENDING,
            batch_id=batch_id,
            input_data=input_data,
            max_retries=max_retries or settings.ASYNC_TASK_MAX_RETRIES,
            created_by=created_by
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_task(db: Session, task_id: str) -> Optional[AsyncTask]:
        return db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()

    @staticmethod
    def get_pending_tasks(db: Session) -> list:
        now = datetime.now()
        return db.query(AsyncTask).filter(
            (AsyncTask.status == TaskStatus.PENDING) |
            ((AsyncTask.status == TaskStatus.WAITING_RETRY) & (AsyncTask.next_retry_time <= now))
        ).all()

    @staticmethod
    def get_waiting_manual_tasks(db: Session, batch_id: Optional[int] = None) -> list:
        query = db.query(AsyncTask).filter(AsyncTask.status == TaskStatus.WAITING_MANUAL)
        if batch_id:
            query = query.filter(AsyncTask.batch_id == batch_id)
        return query.order_by(AsyncTask.created_at.desc()).all()

    @staticmethod
    def update_task_status(
        db: Session,
        task: AsyncTask,
        status: TaskStatus,
        result_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        error_traceback: Optional[str] = None
    ) -> AsyncTask:
        task.status = status
        
        if result_data:
            task.result_data = result_data
        if error_message:
            task.error_message = error_message
        if error_traceback:
            task.error_traceback = error_traceback
        
        if status == TaskStatus.RUNNING:
            task.started_at = datetime.now()
        elif status in [TaskStatus.COMPLETED, TaskStatus.PERMANENT_FAILED]:
            task.completed_at = datetime.now()
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def mark_for_retry(
        db: Session,
        task: AsyncTask,
        error_message: str,
        error_traceback: Optional[str] = None
    ) -> AsyncTask:
        task.retry_count += 1
        
        if task.retry_count >= task.max_retries:
            return TaskService.update_task_status(
                db, task, TaskStatus.PERMANENT_FAILED,
                error_message=error_message,
                error_traceback=error_traceback
            )
        
        task.status = TaskStatus.WAITING_RETRY
        task.error_message = error_message
        task.error_traceback = error_traceback
        task.next_retry_time = datetime.now() + timedelta(seconds=settings.ASYNC_TASK_RETRY_DELAY)
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def mark_for_manual(
        db: Session,
        task: AsyncTask,
        error_message: str
    ) -> AsyncTask:
        return TaskService.update_task_status(
            db, task, TaskStatus.WAITING_MANUAL,
            error_message=error_message
        )

    @staticmethod
    def execute_task(db: Session, task: AsyncTask, task_handler: Callable) -> AsyncTask:
        TaskService.update_task_status(db, task, TaskStatus.RUNNING)
        
        try:
            result = task_handler(task.input_data)
            return TaskService.update_task_status(
                db, task, TaskStatus.COMPLETED,
                result_data=result
            )
        except Exception as e:
            error_msg = str(e)
            error_tb = traceback.format_exc()
            
            if "retryable" in error_msg.lower():
                return TaskService.mark_for_retry(db, task, error_msg, error_tb)
            elif "manual" in error_msg.lower() or "需要人工" in error_msg:
                return TaskService.mark_for_manual(db, task, error_msg)
            else:
                return TaskService.mark_for_retry(db, task, error_msg, error_tb)

    @staticmethod
    def retry_manual_task(
        db: Session,
        task: AsyncTask,
        operated_by: str,
        override_data: Optional[Dict[str, Any]] = None
    ) -> AsyncTask:
        if task.status != TaskStatus.WAITING_MANUAL:
            raise ValueError("只有等待人工处理的任务才能重试")
        
        task.status = TaskStatus.PENDING
        task.retry_count = 0
        task.error_message = None
        task.error_traceback = None
        
        if override_data:
            task.input_data = {**(task.input_data or {}), **override_data}
        
        db.commit()
        db.refresh(task)
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.RETRY,
            operated_by=operated_by,
            batch_id=task.batch_id,
            record_type="async_task",
            record_id=task.id,
            change_reason="人工重试任务"
        )
        
        return task


class TaskProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.handlers = {}

    def register_handler(self, task_name: str, handler: Callable):
        self.handlers[task_name] = handler

    def process_pending_tasks(self):
        tasks = TaskService.get_pending_tasks(self.db)
        
        for task in tasks:
            handler = self.handlers.get(task.task_name)
            if handler:
                TaskService.execute_task(self.db, task, handler)
