from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from typing import Dict, Callable, Optional
from datetime import datetime
import logging

from app.database import SessionLocal
from app.models import AsyncTask, TaskStatus, OperationType
from app.services.task_service import TaskService
from app.services.audit_service import AuditService

logging.basicConfig()
logging.getLogger('apscheduler').setLevel(logging.WARNING)


class TaskScheduler:
    _instance = None
    _scheduler: Optional[BackgroundScheduler] = None
    _handlers: Dict[str, Callable] = {}
    _running: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def register_handler(cls, task_name: str, handler: Callable):
        cls._handlers[task_name] = handler

    @classmethod
    def get_handler(cls, task_name: str) -> Optional[Callable]:
        return cls._handlers.get(task_name)

    @classmethod
    def _process_pending_tasks(cls):
        if not cls._running:
            return
        
        db = SessionLocal()
        try:
            tasks = TaskService.get_pending_tasks(db)
            
            for task in tasks:
                handler = cls.get_handler(task.task_name)
                if handler:
                    TaskService.execute_task(db, task, handler)
        except Exception as e:
            logging.error(f"处理待执行任务时出错: {e}")
        finally:
            db.close()

    @classmethod
    def _recover_running_tasks(cls, db: Session):
        running_tasks = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.RUNNING
        ).all()
        
        for task in running_tasks:
            task.status = TaskStatus.PENDING
            task.error_message = f"服务重启，任务从运行状态恢复"
            db.commit()
            
            AuditService.log_operation(
                db=db,
                operation_type=OperationType.RETRY,
                operated_by="system_recovery",
                batch_id=task.batch_id,
                record_type="async_task",
                record_id=task.id,
                change_reason="服务重启，恢复待运行任务"
            )
        
        return len(running_tasks)

    @classmethod
    def _recover_waiting_retry_tasks(cls, db: Session):
        now = datetime.now()
        expired_retry_tasks = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.WAITING_RETRY,
            AsyncTask.next_retry_time <= now
        ).all()
        
        for task in expired_retry_tasks:
            task.status = TaskStatus.PENDING
            task.next_retry_time = None
            db.commit()
            
            AuditService.log_operation(
                db=db,
                operation_type=OperationType.RETRY,
                operated_by="system_recovery",
                batch_id=task.batch_id,
                record_type="async_task",
                record_id=task.id,
                change_reason="服务重启，恢复待重试任务"
            )
        
        return len(expired_retry_tasks)

    @classmethod
    def start(cls):
        if cls._running:
            return
        
        db = SessionLocal()
        try:
            recovered_running = cls._recover_running_tasks(db)
            recovered_retry = cls._recover_waiting_retry_tasks(db)
            logging.info(f"任务恢复完成: 运行中恢复 {recovered_running} 个, 待重试恢复 {recovered_retry} 个")
        finally:
            db.close()
        
        cls._scheduler = BackgroundScheduler()
        cls._scheduler.add_job(
            cls._process_pending_tasks,
            trigger=IntervalTrigger(seconds=5),
            id="process_pending_tasks",
            replace_existing=True
        )
        cls._scheduler.start()
        cls._running = True
        logging.info("异步任务调度器已启动")

    @classmethod
    def shutdown(cls):
        if cls._scheduler and cls._running:
            cls._scheduler.shutdown()
            cls._running = False
            logging.info("异步任务调度器已停止")

    @classmethod
    def is_running(cls) -> bool:
        return cls._running
