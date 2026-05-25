import uuid
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from collections import deque


class RetryQueueService:
    """重试队列服务 - 处理失败请求的自动重试"""

    def __init__(self, max_retries: int = 3, retry_interval: float = 1.0):
        self.max_retries = max_retries
        self.retry_interval = retry_interval
        self._queue: deque = deque()
        self._failed: List[Dict[str, Any]] = []
        self._history: List[Dict[str, Any]] = []

    def enqueue(self, task_type: str, data: Dict[str, Any], callback: Optional[Callable] = None) -> str:
        task_id = f"RQ-{uuid.uuid4().hex[:12].upper()}"
        task = {
            "task_id": task_id,
            "task_type": task_type,
            "data": data,
            "callback": callback,
            "retry_count": 0,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "last_error": None,
        }
        self._queue.append(task)
        return task_id

    def process_next(self) -> Dict[str, Any]:
        if not self._queue:
            return {"status": "empty"}

        task = self._queue[0]

        if task["retry_count"] >= self.max_retries:
            self._queue.popleft()
            task["status"] = "dead_letter"
            self._failed.append(task)
            self._history.append(task)
            return {"status": "moved_to_dead_letter", "task_id": task["task_id"]}

        try:
            task["retry_count"] += 1
            if task["callback"]:
                result = task["callback"](task["data"])
                task["status"] = "completed"
                task["result"] = str(result)
                self._queue.popleft()
                self._history.append(task)
                return {"status": "completed", "task_id": task["task_id"], "result": result}
        except Exception as e:
            task["last_error"] = str(e)
            if task["retry_count"] >= self.max_retries:
                task["status"] = "dead_letter"
                self._queue.popleft()
                self._failed.append(task)
            self._history.append(task.copy())

        return {"status": "retry_scheduled", "task_id": task["task_id"], "retry_count": task["retry_count"]}

    def process_all(self, callback: Optional[Callable] = None) -> Dict[str, Any]:
        results = {"completed": 0, "dead_letter": 0, "retried": 0}
        while self._queue:
            if callback:
                for task in self._queue:
                    if task["callback"] is None:
                        task["callback"] = callback
            result = self.process_next()
            if result["status"] == "completed":
                results["completed"] += 1
            elif result["status"] == "moved_to_dead_letter":
                results["dead_letter"] += 1
            elif result["status"] == "retry_scheduled":
                results["retried"] += 1
        return results

    def get_failed(self) -> List[Dict[str, Any]]:
        return self._failed

    def get_history(self) -> List[Dict[str, Any]]:
        return self._history

    def get_stats(self) -> Dict[str, Any]:
        return {
            "pending": len(self._queue),
            "failed": len(self._failed),
            "history": len(self._history),
        }


class DeadLetterQueueService:
    """死信队列服务 - 存储超过最大重试次数的失败请求"""

    def __init__(self):
        self._queue: Dict[str, Dict[str, Any]] = {}

    def add(self, task: Dict[str, Any]) -> str:
        dlq_id = f"DLQ-{uuid.uuid4().hex[:12].upper()}"
        record = {
            "dlq_id": dlq_id,
            "original_task": task,
            "status": "new",
            "created_at": datetime.utcnow().isoformat(),
            "reviewed_by": None,
            "review_note": None,
            "resolved": False,
        }
        self._queue[dlq_id] = record
        return dlq_id

    def review(self, dlq_id: str, reviewed_by: str, note: str, resolved: bool = False) -> bool:
        if dlq_id not in self._queue:
            return False
        record = self._queue[dlq_id]
        record["status"] = "reviewed"
        record["reviewed_by"] = reviewed_by
        record["review_note"] = note
        record["resolved"] = resolved
        record["reviewed_at"] = datetime.utcnow().isoformat()
        return True

    def get_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        records = list(self._queue.values())
        if status:
            records = [r for r in records if r["status"] == status]
        return records

    def get_unresolved(self) -> List[Dict[str, Any]]:
        return [r for r in self._queue.values() if not r["resolved"]]

    def get_stats(self) -> Dict[str, Any]:
        total = len(self._queue)
        resolved = len([r for r in self._queue.values() if r["resolved"]])
        return {
            "total": total,
            "resolved": resolved,
            "unresolved": total - resolved,
            "new": len([r for r in self._queue.values() if r["status"] == "new"]),
            "reviewed": len([r for r in self._queue.values() if r["status"] == "reviewed"]),
        }
