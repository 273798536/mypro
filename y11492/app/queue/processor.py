from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Callable, Optional
import traceback
import logging

from app.models import TenderTask, TaskStatus
from app.services.dead_letter_service import DeadLetterService
from app.services.task_service import TaskService
from app.config import settings

logger = logging.getLogger(__name__)

class TaskProcessor:
    def __init__(self):
        self._handlers = {}
    
    def register_handler(self, task_type: str, handler: Callable):
        self._handlers[task_type] = handler
    
    def process_task(self, db: Session, task: TenderTask) -> bool:
        if task.is_frozen:
            return False
        
        old_status = task.status
        task.status = TaskStatus.PROCESSING
        task.last_process_time = datetime.now()
        db.commit()
        
        TaskService._create_history(
            db, task, "process_start",
            "开始处理任务",
            "system",
            before_status=old_status,
            after_status=TaskStatus.PROCESSING
        )
        
        try:
            success = self._execute_task(task)
            
            if success:
                task.status = TaskStatus.SUCCESS
                task.error_message = None
                task.error_stack = None
                
                TaskService._create_history(
                    db, task, "process_success",
                    "任务处理成功",
                    "system",
                    before_status=TaskStatus.PROCESSING,
                    after_status=TaskStatus.SUCCESS
                )
                
                db.commit()
                return True
            else:
                raise Exception("任务处理返回失败")
        
        except Exception as e:
            error_msg = str(e)
            error_stack = traceback.format_exc()
            
            logger.error(f"任务处理失败 task_id={task.id}: {error_msg}\n{error_stack}")
            
            task.retry_count += 1
            task.error_message = error_msg
            task.error_stack = error_stack
            
            if task.retry_count >= task.max_retry_times:
                task.status = TaskStatus.DEAD_LETTER
                DeadLetterService.create_dead_letter(db, task, error_msg)
                
                TaskService._create_history(
                    db, task, "process_fail_dead",
                    {"error": error_msg, "retry_count": task.retry_count},
                    "system",
                    before_status=TaskStatus.PROCESSING,
                    after_status=TaskStatus.DEAD_LETTER
                )
            else:
                task.status = TaskStatus.FAILED
                task.next_retry_time = datetime.now() + timedelta(
                    seconds=settings.RETRY_INTERVAL_SECONDS * task.retry_count
                )
                
                TaskService._create_history(
                    db, task, "process_fail_retry",
                    {
                        "error": error_msg,
                        "retry_count": task.retry_count,
                        "next_retry": task.next_retry_time.isoformat()
                    },
                    "system",
                    before_status=TaskStatus.PROCESSING,
                    after_status=TaskStatus.FAILED
                )
            
            db.commit()
            return False
    
    def _execute_task(self, task: TenderTask) -> bool:
        from app.database import SessionLocal
        db = SessionLocal()
        
        try:
            self._validate_attachments(task)
            self._process_qualification_file(db, task)
            self._process_quotation_version(db, task)
            self._process_sealed_scan(db, task)
            self._process_confirmation_file(db, task)
            self._send_external_receipt(db, task)
            self._record_compensation(db, task)
            
            db.commit()
            return True
            
        finally:
            db.close()
    
    def _validate_attachments(self, task: TenderTask):
        has_any = any([
            task.qualification_file,
            task.quotation_version,
            task.sealed_scan_file,
            task.confirmation_file
        ])
        
        if not has_any:
            raise Exception("至少需要提供一种附件文件")
    
    def _process_qualification_file(self, db: Session, task: TenderTask):
        if task.qualification_file:
            pass
    
    def _process_quotation_version(self, db: Session, task: TenderTask):
        if task.quotation_version:
            pass
    
    def _process_sealed_scan(self, db: Session, task: TenderTask):
        if task.sealed_scan_file:
            pass
    
    def _process_confirmation_file(self, db: Session, task: TenderTask):
        if task.confirmation_file:
            pass
    
    def _send_external_receipt(self, db: Session, task: TenderTask):
        pass
    
    def _record_compensation(self, db: Session, task: TenderTask):
        pass
