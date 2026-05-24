import json
import time
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from .database import (
    get_session, AsyncTask, TaskStatus, DataSourceType, ImportStrategy
)
from .importer import _import_sync


class TaskManager:
    def __init__(self, session: Session = None):
        self.session = session or get_session()
        self._own_session = session is None

    def close(self):
        if self._own_session:
            self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def get_task(self, task_id: str) -> AsyncTask:
        return self.session.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()

    def list_tasks(self, status: TaskStatus = None, limit: int = 100) -> List[AsyncTask]:
        query = self.session.query(AsyncTask).order_by(AsyncTask.created_at.desc())
        if status:
            query = query.filter(AsyncTask.status == status)
        return query.limit(limit).all()

    def run_task(self, task_id: str) -> Dict[str, Any]:
        task = self.get_task(task_id)
        if not task:
            raise ValueError(f"任务不存在: {task_id}")

        if task.status == TaskStatus.COMPLETED:
            return {"status": "already_completed", "message": "任务已完成"}

        if task.status == TaskStatus.PERMANENT_FAILED:
            return {"status": "permanent_failed", "message": "任务已永久失败，无法执行"}

        task.status = TaskStatus.PROCESSING
        task.started_at = datetime.utcnow()
        task.last_heartbeat = datetime.utcnow()
        self.session.commit()

        try:
            payload = json.loads(task.payload)

            if task.task_type == "import":
                result = self._execute_import(task, payload)
            elif task.task_type == "check":
                result = self._execute_check(task, payload)
            else:
                raise ValueError(f"未知任务类型: {task.task_type}")

            task.status = TaskStatus.COMPLETED
            task.progress = 100
            task.completed_at = datetime.utcnow()
            task.result = json.dumps(result, ensure_ascii=False)
            self.session.commit()

            return {"status": "completed", "result": result}

        except Exception as e:
            task.retry_count += 1

            if task.retry_count >= task.max_retries:
                task.status = TaskStatus.PERMANENT_FAILED
                task.error_message = f"永久失败: {str(e)}"
            else:
                task.status = TaskStatus.WAIT_RETRY
                task.error_message = f"重试 {task.retry_count}/{task.max_retries}: {str(e)}"

            task.last_heartbeat = datetime.utcnow()
            self.session.commit()

            return {
                "status": task.status.value,
                "retry_count": task.retry_count,
                "error": str(e)
            }

    def _execute_import(self, task: AsyncTask, payload: Dict) -> Dict[str, Any]:
        task.total_items = 1
        task.current_item = 1
        task.progress = 50
        self.session.commit()

        result = _import_sync(
            filepath=payload["filepath"],
            source_type=DataSourceType(payload["source_type"]),
            strategy=ImportStrategy(payload["strategy"]),
            batch_id=task.batch_id,
            user=payload["user"],
            file_hash=payload["file_hash"]
        )

        task.progress = 100
        return result

    def _execute_check(self, task: AsyncTask, payload: Dict) -> Dict[str, Any]:
        from .checker import run_checks
        result = run_checks(batch_id=payload.get("batch_id"), session=self.session)
        return result

    def run_pending_tasks(self) -> List[Dict[str, Any]]:
        pending_tasks = self.session.query(AsyncTask).filter(
            AsyncTask.status.in_([TaskStatus.PENDING, TaskStatus.WAIT_RETRY])
        ).order_by(AsyncTask.created_at).all()

        results = []
        for task in pending_tasks:
            result = self.run_task(task.task_id)
            results.append({"task_id": task.task_id, **result})

        return results

    def mark_manual(self, task_id: str, note: str = None) -> bool:
        task = self.get_task(task_id)
        if not task:
            return False

        task.status = TaskStatus.WAIT_MANUAL
        if note:
            task.error_message = (task.error_message or "") + f"\n人工备注: {note}"
        self.session.commit()
        return True

    def reset_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if not task:
            return False

        task.status = TaskStatus.PENDING
        task.retry_count = 0
        task.started_at = None
        task.completed_at = None
        task.error_message = None
        task.progress = 0
        self.session.commit()
        return True

    def resume_tasks(self) -> int:
        stuck_tasks = self.session.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.PROCESSING
        ).all()

        count = 0
        for task in stuck_tasks:
            if task.retry_count < task.max_retries:
                task.status = TaskStatus.WAIT_RETRY
            else:
                task.status = TaskStatus.WAIT_MANUAL
            count += 1

        self.session.commit()
        return count
