from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import logging
import traceback

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import SessionLocal
from app.models import AsyncTask
from app.enums import TaskStatus, TaskType
from app.services import task_service, export_service, batch_service

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None
_task_handlers: Dict[str, Callable] = {}


def register_task_handler(task_type: TaskType, handler: Callable):
    _task_handlers[task_type.value] = handler


def _default_task_handler(task: AsyncTask, db: Session) -> Dict[str, Any]:
    if task.task_type == TaskType.EXPORT_REPORT.value:
        batch_ids = None
        if task.batch_id:
            batch_ids = [task.batch_id]
        filepath = export_service.export_batch_summary(
            db,
            batch_ids=batch_ids,
            include_frozen=True,
            include_change_logs=True,
            format="xlsx",
        )
        return {"filepath": filepath}
    elif task.task_type == TaskType.RECALCULATE.value:
        if task.batch_id:
            batch = batch_service.get_batch(db, task.batch_id)
            if batch:
                batch_service._update_batch_stats(db, batch)
                db.commit()
        return {"recalculated": True}
    return {}


def _process_pending_tasks():
    db = SessionLocal()
    try:
        pending_tasks = task_service.get_pending_tasks(db)
        
        for task in pending_tasks:
            try:
                task_service.update_task_status(
                    db, task.task_id, TaskStatus.RUNNING, progress=0, message="开始执行"
                )
                
                handler = _task_handlers.get(task.task_type, _default_task_handler)
                result = handler(task, db)
                
                task_service.update_task_status(
                    db, task.task_id, TaskStatus.SUCCESS, 
                    progress=100, message="执行成功", result_data=result
                )
            except Exception as e:
                error_tb = traceback.format_exc()
                task_service.mark_task_failed(db, task.task_id, str(e), error_tb)
    finally:
        db.close()


def start_scheduler(interval_seconds: int = 30) -> BackgroundScheduler:
    global _scheduler
    
    if _scheduler and _scheduler.running:
        return _scheduler
    
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _process_pending_tasks,
        trigger=IntervalTrigger(seconds=interval_seconds),
        id="process_pending_tasks",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"任务调度器已启动，每 {interval_seconds} 秒检查一次待执行任务")
    return _scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("任务调度器已停止")


def run_once():
    _process_pending_tasks()
