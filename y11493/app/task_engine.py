import traceback
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Callable
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import AsyncTask, TaskStatus
from .utils import update_task_status, log_audit, OperationType
from .config import settings

logger = logging.getLogger(__name__)

task_handlers: Dict[str, Callable] = {}

MANUAL_TIMEOUT_HOURS = 24


def register_task_handler(task_type: str):
    def decorator(func: Callable):
        task_handlers[task_type] = func
        return func
    return decorator


def process_task(task_id: str):
    db = SessionLocal()
    try:
        task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        if not task or task.status != TaskStatus.PENDING.value:
            return
        
        update_task_status(db, task_id, TaskStatus.RUNNING)
        
        handler = task_handlers.get(task.task_type)
        if not handler:
            raise ValueError(f"未找到任务处理器: {task.task_type}")
        
        result = handler(task.input_data or {}, db)
        
        update_task_status(
            db, task_id, TaskStatus.COMPLETED,
            result_data=result
        )
        
    except Exception as e:
        error_msg = str(e)
        error_tb = traceback.format_exc()
        
        task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        if task:
            if task.retry_count < task.max_retry:
                update_task_status(
                    db, task_id, TaskStatus.WAITING_RETRY,
                    error_message=error_msg,
                    error_traceback=error_tb
                )
                logger.warning(f"任务 {task_id} 失败，等待重试 ({task.retry_count}/{task.max_retry}): {error_msg}")
            else:
                update_task_status(
                    db, task_id, TaskStatus.WAITING_MANUAL,
                    error_message=error_msg,
                    error_traceback=error_tb
                )
                logger.error(f"任务 {task_id} 重试次数用尽，进入人工处理队列: {error_msg}")
    finally:
        db.close()


def retry_waiting_tasks():
    db = SessionLocal()
    try:
        now = datetime.now()
        waiting_tasks = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.WAITING_RETRY.value,
            AsyncTask.next_retry_at <= now
        ).all()
        
        for task in waiting_tasks:
            task.status = TaskStatus.PENDING.value
            task.next_retry_at = None
            db.commit()
            process_task(task.task_id)
            
    except Exception as e:
        logger.error(f"重试任务时出错: {str(e)}")
    finally:
        db.close()


def check_manual_timeout_tasks():
    db = SessionLocal()
    try:
        now = datetime.now()
        timeout_threshold = now - timedelta(hours=MANUAL_TIMEOUT_HOURS)
        
        timed_out_tasks = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.WAITING_MANUAL.value,
            AsyncTask.completed_at <= timeout_threshold
        ).all()
        
        for task in timed_out_tasks:
            task.status = TaskStatus.PERMANENT_FAILED.value
            task.completed_at = now
            task.error_message = (task.error_message or "") + f"\n[自动标记] 人工处理超时({MANUAL_TIMEOUT_HOURS}小时)，已自动标记为永久失败"
            db.commit()
            
            log_audit(
                db=db,
                operation_type=OperationType.UPDATE,
                entity_type="AsyncTask",
                entity_id=task.id,
                entity_no=task.task_id,
                after_state={"status": TaskStatus.PERMANENT_FAILED.value, "auto_marked": True},
                operator="system",
                note=f"人工处理超时({MANUAL_TIMEOUT_HOURS}小时)，自动标记为永久失败"
            )
            
            logger.warning(f"任务 {task.task_id} 人工处理超时，自动标记为永久失败")
        
        if timed_out_tasks:
            logger.info(f"检查人工处理超时任务，共处理 {len(timed_out_tasks)} 个超时任务")
            
    except Exception as e:
        logger.error(f"检查人工处理超时任务时出错: {str(e)}")
    finally:
        db.close()


def resume_pending_tasks_on_startup():
    db = SessionLocal()
    try:
        running_tasks = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.RUNNING.value
        ).all()
        
        for task in running_tasks:
            task.status = TaskStatus.PENDING.value
            db.commit()
            logger.info(f"恢复中断的任务: {task.task_id}")
        
        pending_count = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.PENDING.value
        ).count()
        
        if pending_count > 0:
            logger.info(f"服务重启后，共有 {pending_count} 个待处理任务需要执行")

        waiting_manual_count = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.WAITING_MANUAL.value
        ).count()
        
        if waiting_manual_count > 0:
            logger.info(f"服务重启后，共有 {waiting_manual_count} 个等待人工处理的任务")
            
    except Exception as e:
        logger.error(f"恢复任务时出错: {str(e)}")
    finally:
        db.close()


scheduler = BackgroundScheduler()


def start_task_scheduler():
    resume_pending_tasks_on_startup()
    
    scheduler.add_job(
        retry_waiting_tasks,
        trigger=IntervalTrigger(minutes=1),
        id="retry_waiting_tasks",
        replace_existing=True
    )
    
    scheduler.add_job(
        process_pending_tasks,
        trigger=IntervalTrigger(seconds=30),
        id="process_pending_tasks",
        replace_existing=True
    )
    
    scheduler.add_job(
        check_manual_timeout_tasks,
        trigger=IntervalTrigger(hours=1),
        id="check_manual_timeout_tasks",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("任务调度器已启动")


def process_pending_tasks():
    db = SessionLocal()
    try:
        pending_tasks = db.query(AsyncTask).filter(
            AsyncTask.status == TaskStatus.PENDING.value
        ).order_by(AsyncTask.created_at).limit(5).all()
        
        for task in pending_tasks:
            process_task(task.task_id)
            
    except Exception as e:
        logger.error(f"处理待办任务时出错: {str(e)}")
    finally:
        db.close()


def stop_task_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("任务调度器已停止")


@register_task_handler("document_process")
def handle_document_process(input_data: Dict[str, Any], db: Session) -> Dict:
    document_id = input_data.get("document_id")
    return {"document_id": document_id, "processed": True, "timestamp": datetime.now().isoformat()}


@register_task_handler("export_generate")
def handle_export_generate(input_data: Dict[str, Any], db: Session) -> Dict:
    export_type = input_data.get("export_type", "all")
    return {"export_type": export_type, "generated": True, "file_path": "/tmp/export.xlsx"}


@register_task_handler("reconcile_check")
def handle_reconcile_check(input_data: Dict[str, Any], db: Session) -> Dict:
    left_id = input_data.get("left_document_id")
    right_id = input_data.get("right_document_id")
    return {"left_id": left_id, "right_id": right_id, "consistent": True}


@register_task_handler("simulate_failure")
def handle_simulate_failure(input_data: Dict[str, Any], db: Session) -> Dict:
    raise Exception("这是一个模拟的失败任务，用于测试重试机制")
