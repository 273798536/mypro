import threading
import time
import logging
from datetime import datetime
from typing import Optional

from app.database import SessionLocal
from app.models import TenderTask, TaskStatus
from app.queue.processor import TaskProcessor
from app.config import settings

logger = logging.getLogger(__name__)

class QueueWorker:
    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._processor = TaskProcessor()
    
    def start(self):
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info("队列Worker已启动")
    
    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("队列Worker已停止")
    
    def _run(self):
        while self._running:
            try:
                self._process_pending_tasks()
                self._process_retry_tasks()
                self._process_retrying_tasks()
                
            except Exception as e:
                logger.error(f"Worker循环异常: {str(e)}", exc_info=True)
            
            time.sleep(settings.QUEUE_WORKER_INTERVAL)
    
    def _process_pending_tasks(self):
        db = SessionLocal()
        try:
            pending_tasks = db.query(TenderTask).filter(
                TenderTask.status == TaskStatus.PENDING,
                TenderTask.is_frozen == False
            ).order_by(TenderTask.submit_time.asc()).limit(10).all()
            
            for task in pending_tasks:
                if not self._running:
                    break
                self._processor.process_task(db, task)
                
        finally:
            db.close()
    
    def _process_retry_tasks(self):
        db = SessionLocal()
        try:
            now = datetime.now()
            retry_tasks = db.query(TenderTask).filter(
                TenderTask.status == TaskStatus.FAILED,
                TenderTask.next_retry_time <= now,
                TenderTask.is_frozen == False
            ).order_by(TenderTask.next_retry_time.asc()).limit(10).all()
            
            for task in retry_tasks:
                if not self._running:
                    break
                
                from app.services.task_service import TaskService
                TaskService._create_history(
                    db, task, "auto_retry",
                    {"retry_count": task.retry_count},
                    "system",
                    before_status=TaskStatus.FAILED,
                    after_status=TaskStatus.RETRYING
                )
                
                task.status = TaskStatus.RETRYING
                db.commit()
                self._processor.process_task(db, task)
                
        finally:
            db.close()
    
    def _process_retrying_tasks(self):
        db = SessionLocal()
        try:
            retrying_tasks = db.query(TenderTask).filter(
                TenderTask.status == TaskStatus.RETRYING,
                TenderTask.is_frozen == False
            ).order_by(TenderTask.last_process_time.asc()).limit(10).all()
            
            for task in retrying_tasks:
                if not self._running:
                    break
                self._processor.process_task(db, task)
                
        finally:
            db.close()
