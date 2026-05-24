from typing import List, Optional
from datetime import datetime, timedelta
from app.models.base_model import BaseModel
from app.database import get_db_connection

TASK_STATUS_PENDING = 'pending'
TASK_STATUS_RUNNING = 'running'
TASK_STATUS_WAITING_RETRY = 'waiting_retry'
TASK_STATUS_WAITING_MANUAL = 'waiting_manual'
TASK_STATUS_SUCCESS = 'success'
TASK_STATUS_FAILED_PERMANENT = 'failed_permanent'


class AsyncTask(BaseModel):
    table_name = "async_tasks"
    primary_key = "id"

    @classmethod
    def create_task(cls, task_type: str, params: dict = None, 
                    priority: int = 5, max_retries: int = 3,
                    ticket_id: int = None) -> 'AsyncTask':
        return cls.create(
            task_type=task_type,
            task_params=params or {},
            task_status=TASK_STATUS_PENDING,
            priority=priority,
            max_retries=max_retries,
            ticket_id=ticket_id
        )

    @classmethod
    def get_pending_tasks(cls, limit: int = 10) -> List['AsyncTask']:
        return cls.query(
            "task_status = ? AND (next_retry_at IS NULL OR next_retry_at <= ?)",
            (TASK_STATUS_PENDING, datetime.now().isoformat()),
            order_by="priority DESC, created_at ASC",
            limit=limit
        )

    @classmethod
    def get_retry_tasks(cls, limit: int = 10) -> List['AsyncTask']:
        return cls.query(
            "task_status = ? AND next_retry_at <= ?",
            (TASK_STATUS_WAITING_RETRY, datetime.now().isoformat()),
            order_by="next_retry_at ASC",
            limit=limit
        )

    @classmethod
    def get_waiting_manual_tasks(cls, limit: int = 100) -> List['AsyncTask']:
        return cls.query(
            "task_status = ?",
            (TASK_STATUS_WAITING_MANUAL,),
            order_by="created_at DESC",
            limit=limit
        )

    def start(self) -> None:
        self.update(
            self.id,
            task_status=TASK_STATUS_RUNNING,
            started_at=datetime.now().isoformat()
        )

    def mark_success(self, result_data: dict = None) -> None:
        self.update(
            self.id,
            task_status=TASK_STATUS_SUCCESS,
            progress=100,
            completed_at=datetime.now().isoformat(),
            result_data=result_data
        )

    def mark_for_retry(self, error: str, retry_delay_minutes: int = 5) -> None:
        retry_count = (self.retry_count or 0) + 1
        next_retry = datetime.now() + timedelta(minutes=retry_delay_minutes)
        
        if retry_count >= (self.max_retries or 3):
            self.mark_failed_permanent(error)
            return
        
        self.update(
            self.id,
            task_status=TASK_STATUS_WAITING_RETRY,
            retry_count=retry_count,
            last_error=error,
            last_retry_at=datetime.now().isoformat(),
            next_retry_at=next_retry.isoformat()
        )

    def mark_waiting_manual(self, error: str, assignee: str = None) -> None:
        self.update(
            self.id,
            task_status=TASK_STATUS_WAITING_MANUAL,
            last_error=error,
            handler=assignee
        )

    def mark_failed_permanent(self, error: str) -> None:
        self.update(
            self.id,
            task_status=TASK_STATUS_FAILED_PERMANENT,
            last_error=error,
            completed_at=datetime.now().isoformat()
        )

    def update_progress(self, progress: float) -> None:
        self.update(self.id, progress=progress)

    @classmethod
    def resume_pending_after_restart(cls) -> int:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE async_tasks 
                SET task_status = ?, next_retry_at = ?
                WHERE task_status = ?
            """, (TASK_STATUS_PENDING, None, TASK_STATUS_RUNNING))
            return cursor.rowcount
