from sqlalchemy.orm import Session
from typing import Optional, List, Callable, Dict, Any
from datetime import datetime, timedelta
import uuid
import traceback
import json

from app.models import AsyncTask
from app.enums import TaskStatus, TaskType
from app.schemas import AsyncTaskCreate


def create_task(
    db: Session,
    task_type: TaskType,
    batch_id: int = None,
    created_by: str = None,
    max_retries: int = 3,
) -> AsyncTask:
    task_id = str(uuid.uuid4())
    db_task = AsyncTask(
        task_id=task_id,
        task_type=task_type.value,
        batch_id=batch_id,
        status=TaskStatus.PENDING.value,
        max_retries=max_retries,
        created_by=created_by,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_task(db: Session, task_id: str) -> Optional[AsyncTask]:
    return db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()


def get_tasks(
    db: Session,
    status: Optional[TaskStatus] = None,
    task_type: Optional[TaskType] = None,
    batch_id: int = None,
    skip: int = 0,
    limit: int = 100,
) -> List[AsyncTask]:
    query = db.query(AsyncTask)
    if status:
        query = query.filter(AsyncTask.status == status.value)
    if task_type:
        query = query.filter(AsyncTask.task_type == task_type.value)
    if batch_id:
        query = query.filter(AsyncTask.batch_id == batch_id)
    return query.order_by(AsyncTask.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_tasks(db: Session) -> List[AsyncTask]:
    now = datetime.now()
    return db.query(AsyncTask).filter(
        (AsyncTask.status == TaskStatus.PENDING.value) |
        ((AsyncTask.status == TaskStatus.WAITING_RETRY.value) & (AsyncTask.next_retry_at <= now))
    ).order_by(AsyncTask.created_at.asc()).all()


def update_task_status(
    db: Session,
    task_id: str,
    status: TaskStatus,
    message: str = None,
    progress: int = None,
    result_data: Dict[str, Any] = None,
) -> Optional[AsyncTask]:
    db_task = get_task(db, task_id)
    if not db_task:
        return None

    db_task.status = status.value
    if message is not None:
        db_task.message = message
    if progress is not None:
        db_task.progress = progress
    if result_data is not None:
        db_task.result_data = json.dumps(result_data, ensure_ascii=False)

    if status == TaskStatus.RUNNING:
        db_task.started_at = datetime.now()
    elif status in [TaskStatus.SUCCESS, TaskStatus.FAILED_PERMANENT]:
        db_task.completed_at = datetime.now()

    db.commit()
    db.refresh(db_task)
    return db_task


def mark_task_failed(
    db: Session,
    task_id: str,
    error_message: str,
    error_traceback: str = None,
) -> AsyncTask:
    db_task = get_task(db, task_id)
    if not db_task:
        raise ValueError(f"任务 {task_id} 不存在")

    db_task.retry_count += 1

    if db_task.retry_count >= db_task.max_retries:
        db_task.status = TaskStatus.FAILED_PERMANENT.value
        db_task.failed_at = datetime.now()
        db_task.completed_at = datetime.now()
    else:
        db_task.status = TaskStatus.WAITING_RETRY.value
        db_task.next_retry_at = datetime.now() + timedelta(minutes=5 * db_task.retry_count)

    db_task.error_message = error_message
    db_task.error_traceback = error_traceback
    db_task.message = f"失败 (重试 {db_task.retry_count}/{db_task.max_retries}): {error_message}"

    db.commit()
    db.refresh(db_task)
    return db_task


def mark_task_manual(db: Session, task_id: str, message: str = None) -> AsyncTask:
    db_task = get_task(db, task_id)
    if not db_task:
        raise ValueError(f"任务 {task_id} 不存在")

    db_task.status = TaskStatus.WAITING_MANUAL.value
    db_task.message = message or "等待人工处理"
    db_task.failed_at = datetime.now()

    db.commit()
    db.refresh(db_task)
    return db_task


def retry_task(db: Session, task_id: str, reset_retries: bool = False) -> AsyncTask:
    db_task = get_task(db, task_id)
    if not db_task:
        raise ValueError(f"任务 {task_id} 不存在")

    if db_task.status not in [TaskStatus.WAITING_RETRY.value, TaskStatus.WAITING_MANUAL.value, TaskStatus.FAILED_PERMANENT.value]:
        raise ValueError(f"任务状态 {db_task.status} 不支持重试")

    db_task.status = TaskStatus.PENDING.value
    if reset_retries:
        db_task.retry_count = 0
    db_task.next_retry_at = None
    db_task.error_message = None
    db_task.error_traceback = None
    db_task.message = "已重置，等待执行"
    db_task.started_at = None
    db_task.completed_at = None

    db.commit()
    db.refresh(db_task)
    return db_task


def execute_task(
    db: Session,
    task_id: str,
    task_handler: Callable[[AsyncTask, Session], Dict[str, Any]],
) -> AsyncTask:
    db_task = get_task(db, task_id)
    if not db_task:
        raise ValueError(f"任务 {task_id} 不存在")

    if db_task.status not in [TaskStatus.PENDING.value, TaskStatus.WAITING_RETRY.value]:
        raise ValueError(f"任务状态 {db_task.status} 不能执行")

    update_task_status(db, task_id, TaskStatus.RUNNING, progress=0, message="开始执行")

    try:
        result = task_handler(db_task, db)
        update_task_status(db, task_id, TaskStatus.SUCCESS, progress=100, message="执行成功", result_data=result)
    except Exception as e:
        error_tb = traceback.format_exc()
        mark_task_failed(db, task_id, str(e), error_tb)

    return get_task(db, task_id)
