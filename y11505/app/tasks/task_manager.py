from typing import Optional, Dict, Any, Callable, List
from sqlalchemy.orm import Session
import uuid
import traceback
from datetime import datetime, timedelta

from app.core.constants import TaskStatus
from app.models import AsyncTask
from app.core.config import settings


class TaskManager:
    def __init__(self, db: Session):
        self.db = db
        self._task_handlers: Dict[str, Callable] = {}
    
    def register_handler(self, task_type: str, handler: Callable):
        self._task_handlers[task_type] = handler
    
    def create_task(
        self,
        task_name: str,
        task_type: str,
        payload: Optional[Dict[str, Any]] = None,
        batch_id: Optional[str] = None,
        record_id: Optional[str] = None,
        operator: Optional[str] = None,
        max_retries: int = 3,
    ) -> AsyncTask:
        task = AsyncTask(
            id=str(uuid.uuid4()),
            task_name=task_name,
            task_type=task_type,
            batch_id=batch_id,
            record_id=record_id,
            status=TaskStatus.PENDING,
            payload=payload,
            retry_count=0,
            max_retries=max_retries,
            operator=operator,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task
    
    def get_task(self, task_id: str) -> Optional[AsyncTask]:
        return self.db.query(AsyncTask).filter(AsyncTask.id == task_id).first()
    
    def get_pending_tasks(self, limit: int = 100) -> List[AsyncTask]:
        now = datetime.now()
        return (
            self.db.query(AsyncTask)
            .filter(
                AsyncTask.status.in_([TaskStatus.PENDING, TaskStatus.WAITING_RETRY]),
                AsyncTask.is_cancelled == False,
                (AsyncTask.next_run_time == None) | (AsyncTask.next_run_time <= now),
            )
            .order_by(AsyncTask.created_at.asc())
            .limit(limit)
            .all()
        )
    
    def get_failed_tasks(self, limit: int = 100) -> List[AsyncTask]:
        return (
            self.db.query(AsyncTask)
            .filter(
                AsyncTask.status.in_([TaskStatus.WAITING_MANUAL, TaskStatus.PERMANENT_FAILED]),
                AsyncTask.is_cancelled == False,
            )
            .order_by(AsyncTask.updated_at.desc())
            .limit(limit)
            .all()
        )
    
    def execute_task(self, task: AsyncTask) -> bool:
        task.status = TaskStatus.PROCESSING
        task.last_run_time = datetime.now()
        task.updated_at = datetime.now()
        self.db.commit()
        
        handler = self._task_handlers.get(task.task_type)
        if not handler:
            return self._handle_task_failure(
                task,
                f"No handler registered for task type: {task.task_type}",
                permanent=True,
            )
        
        try:
            result = handler(task.payload)
            task.status = TaskStatus.COMPLETED
            task.result = result
            task.updated_at = datetime.now()
            self.db.commit()
            return True
        except Exception as e:
            error_message = str(e)
            error_trace = traceback.format_exc()
            return self._handle_task_failure(task, error_message, error_trace)
    
    def _handle_task_failure(
        self,
        task: AsyncTask,
        error_message: str,
        error_trace: Optional[str] = None,
        permanent: bool = False,
    ) -> bool:
        task.error_message = error_message
        task.error_trace = error_trace
        task.retry_count += 1
        task.updated_at = datetime.now()
        
        if permanent:
            task.status = TaskStatus.PERMANENT_FAILED
        elif task.retry_count >= task.max_retries:
            task.status = TaskStatus.WAITING_MANUAL
        else:
            task.status = TaskStatus.WAITING_RETRY
            delay_seconds = settings.RETRY_DELAY_SECONDS * (2 ** (task.retry_count - 1))
            task.next_run_time = datetime.now() + timedelta(seconds=delay_seconds)
        
        self.db.commit()
        return False
    
    def retry_task(self, task: AsyncTask, operator: Optional[str] = None) -> bool:
        if task.status not in [TaskStatus.WAITING_MANUAL, TaskStatus.PERMANENT_FAILED]:
            return False
        
        task.status = TaskStatus.PENDING
        task.retry_count = 0
        task.error_message = None
        task.error_trace = None
        task.next_run_time = None
        task.updated_at = datetime.now()
        if operator:
            task.operator = operator
        
        self.db.commit()
        return True
    
    def mark_as_permanent_failed(self, task: AsyncTask, reason: str, operator: str) -> bool:
        if task.status != TaskStatus.WAITING_MANUAL:
            return False
        
        task.status = TaskStatus.PERMANENT_FAILED
        task.error_message = f"人工标记为永久失败: {reason}"
        task.operator = operator
        task.updated_at = datetime.now()
        
        self.db.commit()
        return True
    
    def run_pending_tasks(self, limit: int = 10) -> Dict[str, int]:
        tasks = self.get_pending_tasks(limit)
        results = {"success": 0, "failed": 0, "waiting_manual": 0}
        
        for task in tasks:
            if self.execute_task(task):
                results["success"] += 1
            else:
                if task.status == TaskStatus.WAITING_MANUAL:
                    results["waiting_manual"] += 1
                else:
                    results["failed"] += 1
        
        return results
    
    def recover_after_restart(self) -> int:
        stuck_tasks = (
            self.db.query(AsyncTask)
            .filter(
                AsyncTask.status == TaskStatus.PROCESSING,
                AsyncTask.is_cancelled == False,
            )
            .all()
        )
        
        recovered = 0
        for task in stuck_tasks:
            if task.retry_count < task.max_retries:
                task.status = TaskStatus.WAITING_RETRY
                task.next_run_time = datetime.now() + timedelta(seconds=30)
            else:
                task.status = TaskStatus.WAITING_MANUAL
            
            task.updated_at = datetime.now()
            recovered += 1
        
        if recovered > 0:
            self.db.commit()
        
        return recovered
