import json
import uuid
import traceback
from datetime import datetime, timedelta
from typing import Optional, Callable, Any, Dict
from sqlalchemy.orm import Session

from app.models import AsyncTask
from app.config import settings
from app.services.status_service import StatusService

TASK_STATUS_PENDING = "pending"
TASK_STATUS_RUNNING = "running"
TASK_STATUS_SUCCESS = "success"
TASK_STATUS_WAITING_RETRY = "waiting_retry"
TASK_STATUS_WAITING_MANUAL = "waiting_manual"
TASK_STATUS_FAILED = "failed"

FAILURE_CATEGORY_WAITING_RETRY = "WAITING_RETRY"
FAILURE_CATEGORY_WAITING_MANUAL = "WAITING_MANUAL"
FAILURE_CATEGORY_PERMANENT = "PERMANENT_FAILED"

class TaskService:
    @staticmethod
    def create_task(
        db: Session,
        task_type: str,
        task_name: str,
        input_data: Optional[Dict] = None,
        created_by: str = "system",
        priority: int = 0,
        parent_task_id: Optional[str] = None,
    ) -> AsyncTask:
        task = AsyncTask(
            task_id=f"TASK_{uuid.uuid4().hex[:16]}",
            task_type=task_type,
            task_name=task_name,
            status=TASK_STATUS_PENDING,
            priority=priority,
            input_data=json.dumps(input_data) if input_data else None,
            created_by=created_by,
            parent_task_id=parent_task_id,
            max_retry_count=settings.MAX_RETRY_COUNT,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_next_task(db: Session) -> Optional[AsyncTask]:
        now = datetime.now()
        
        task = (
            db.query(AsyncTask)
            .filter(AsyncTask.status.in_([TASK_STATUS_PENDING, TASK_STATUS_WAITING_RETRY]))
            .filter(
                (AsyncTask.status == TASK_STATUS_PENDING) |
                (AsyncTask.next_retry_time <= now)
            )
            .order_by(AsyncTask.priority.desc(), AsyncTask.created_at.asc())
            .first()
        )
        return task

    @staticmethod
    def start_task(db: Session, task: AsyncTask) -> AsyncTask:
        task.status = TASK_STATUS_RUNNING
        task.started_at = datetime.now()
        task.progress = 0
        task.progress_message = "任务开始执行"
        db.commit()
        db.refresh(task)
        
        StatusService.log_status_change(
            db=db,
            entity_type="async_tasks",
            entity_id=task.task_id,
            old_status=TASK_STATUS_PENDING,
            new_status=TASK_STATUS_RUNNING,
            change_reason="任务开始执行",
            operator="system",
            operator_role="system",
        )
        return task

    @staticmethod
    def complete_task(
        db: Session,
        task: AsyncTask,
        output_data: Optional[Dict] = None,
    ) -> AsyncTask:
        task.status = TASK_STATUS_SUCCESS
        task.progress = 100
        task.progress_message = "任务执行成功"
        task.output_data = json.dumps(output_data) if output_data else None
        task.completed_at = datetime.now()
        db.commit()
        db.refresh(task)
        
        StatusService.log_status_change(
            db=db,
            entity_type="async_tasks",
            entity_id=task.task_id,
            old_status=TASK_STATUS_RUNNING,
            new_status=TASK_STATUS_SUCCESS,
            change_reason="任务执行成功",
            operator="system",
            operator_role="system",
        )
        return task

    @staticmethod
    def handle_failure(
        db: Session,
        task: AsyncTask,
        error: Exception,
        failure_category: str = FAILURE_CATEGORY_WAITING_RETRY,
        retry_delay: int = settings.RETRY_DELAY_SECONDS,
    ) -> AsyncTask:
        task.failure_reason = str(error)
        task.error_trace = traceback.format_exc()
        task.failure_category = failure_category
        
        if failure_category == FAILURE_CATEGORY_WAITING_RETRY:
            task.retry_count += 1
            if task.retry_count >= task.max_retry_count:
                task.failure_category = FAILURE_CATEGORY_PERMANENT
                task.status = TASK_STATUS_FAILED
                task.progress_message = f"重试次数超限，永久失败: {str(error)}"
            else:
                task.status = TASK_STATUS_WAITING_RETRY
                task.next_retry_time = datetime.now() + timedelta(seconds=retry_delay)
                task.progress_message = f"第{task.retry_count}次失败，等待重试: {str(error)}"
                
        elif failure_category == FAILURE_CATEGORY_WAITING_MANUAL:
            task.status = TASK_STATUS_WAITING_MANUAL
            task.progress_message = f"需要人工处理: {str(error)}"
            
        elif failure_category == FAILURE_CATEGORY_PERMANENT:
            task.status = TASK_STATUS_FAILED
            task.progress_message = f"永久失败: {str(error)}"
        
        task.completed_at = datetime.now()
        db.commit()
        db.refresh(task)
        
        StatusService.log_status_change(
            db=db,
            entity_type="async_tasks",
            entity_id=task.task_id,
            old_status=TASK_STATUS_RUNNING,
            new_status=task.status,
            change_reason=task.progress_message,
            operator="system",
            operator_role="system",
            extra_info={"failure_category": failure_category, "retry_count": task.retry_count},
        )
        return task

    @staticmethod
    def manual_resolve(
        db: Session,
        task: AsyncTask,
        new_status: str,
        opinion: str,
        operator: str,
        output_data: Optional[Dict] = None,
    ) -> AsyncTask:
        old_status = task.status
        task.manual_opinion = opinion
        task.manual_operator = operator
        task.manual_time = datetime.now()
        
        if new_status == TASK_STATUS_SUCCESS:
            task.status = TASK_STATUS_SUCCESS
            task.progress = 100
            task.progress_message = f"人工处理通过: {opinion}"
            task.output_data = json.dumps(output_data) if output_data else None
            task.completed_at = datetime.now()
        elif new_status == TASK_STATUS_RUNNING:
            task.status = TASK_STATUS_PENDING
            task.retry_count = 0
            task.progress_message = f"人工触发重试: {opinion}"
        else:
            task.status = new_status
            task.progress_message = f"人工处理: {opinion}"
        
        db.commit()
        db.refresh(task)
        
        StatusService.log_status_change(
            db=db,
            entity_type="async_tasks",
            entity_id=task.task_id,
            old_status=old_status,
            new_status=task.status,
            change_reason=opinion,
            operator=operator,
            operator_role="manual_operator",
        )
        return task

    @staticmethod
    def resume_interrupted_tasks(db: Session) -> int:
        interrupted_tasks = (
            db.query(AsyncTask)
            .filter(AsyncTask.status == TASK_STATUS_RUNNING)
            .filter(AsyncTask.is_resumable == True)
            .all()
        )
        
        count = 0
        for task in interrupted_tasks:
            task.status = TASK_STATUS_PENDING
            task.progress_message = "服务重启，恢复待执行"
            count += 1
        
        db.commit()
        
        for task in interrupted_tasks:
            StatusService.log_status_change(
                db=db,
                entity_type="async_tasks",
                entity_id=task.task_id,
                old_status=TASK_STATUS_RUNNING,
                new_status=TASK_STATUS_PENDING,
                change_reason="服务重启，任务恢复",
                operator="system",
                operator_role="system",
            )
        
        return count

    @staticmethod
    def update_progress(
        db: Session,
        task: AsyncTask,
        progress: int,
        message: str,
        checkpoint: Optional[Dict] = None,
    ) -> AsyncTask:
        task.progress = progress
        task.progress_message = message
        if checkpoint:
            task.checkpoint = json.dumps(checkpoint)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_task(db: Session, task_id: str) -> Optional[AsyncTask]:
        return db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
