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
        if task.is_frozen or task.status == TaskStatus.FROZEN:
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
            
            processing_results = {}
            
            if task.qualification_file:
                processing_results["qualification"] = self._process_qualification_file(db, task)
            
            if task.quotation_version:
                processing_results["quotation"] = self._process_quotation_version(db, task)
            
            if task.sealed_scan_file:
                processing_results["sealed_scan"] = self._process_sealed_scan(db, task)
            
            if task.confirmation_file:
                processing_results["confirmation"] = self._process_confirmation_file(db, task)
            
            processing_results["external_receipt"] = self._send_external_receipt(db, task)
            processing_results["compensation"] = self._record_compensation(db, task)
            
            task.process_result = processing_results
            
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            raise e
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
            raise ValueError("至少需要提供一种附件文件")
        
        if task.qualification_file:
            qual = task.qualification_file
            if not qual.get("file_name"):
                raise ValueError("资质文件缺少文件名")
            if not qual.get("file_url"):
                raise ValueError("资质文件缺少文件地址")
            if qual.get("file_size", 0) <= 0:
                raise ValueError("资质文件大小无效")
        
        if task.quotation_version:
            quote = task.quotation_version
            if not quote.get("file_name"):
                raise ValueError("报价文件缺少文件名")
            if not quote.get("version"):
                raise ValueError("报价文件缺少版本号")
    
    def _process_qualification_file(self, db: Session, task: TenderTask) -> dict:
        qual_file = task.qualification_file
        if not qual_file:
            return {"status": "skipped", "reason": "no_file"}
        
        file_name = qual_file.get("file_name", "")
        file_hash = qual_file.get("file_hash", "")
        version = qual_file.get("version", "v1.0")
        
        if not file_hash:
            import hashlib
            file_hash = hashlib.md5(f"{file_name}{task.batch_id}".encode()).hexdigest()
        
        result = {
            "status": "processed",
            "file_name": file_name,
            "file_hash": file_hash,
            "version": version,
            "sealed_timestamp": datetime.now().isoformat(),
            "seal_code": f"SEAL-QUAL-{task.batch_id}-{int(datetime.now().timestamp())}"
        }
        
        TaskService._create_history(
            db, task, "qualification_process",
            result,
            "system",
            changed_fields=["qualification_file"]
        )
        
        return result
    
    def _process_quotation_version(self, db: Session, task: TenderTask) -> dict:
        quote_file = task.quotation_version
        if not quote_file:
            return {"status": "skipped", "reason": "no_file"}
        
        file_name = quote_file.get("file_name", "")
        version = quote_file.get("version", "v1.0")
        file_hash = quote_file.get("file_hash", "")
        
        if not file_hash:
            import hashlib
            file_hash = hashlib.md5(f"{file_name}{version}{task.batch_id}".encode()).hexdigest()
        
        result = {
            "status": "processed",
            "file_name": file_name,
            "file_hash": file_hash,
            "version": version,
            "version_locked": True,
            "sealed_timestamp": datetime.now().isoformat(),
            "seal_code": f"SEAL-QUOTE-{task.batch_id}-{int(datetime.now().timestamp())}"
        }
        
        TaskService._create_history(
            db, task, "quotation_process",
            result,
            "system",
            changed_fields=["quotation_version"]
        )
        
        return result
    
    def _process_sealed_scan(self, db: Session, task: TenderTask) -> dict:
        sealed_file = task.sealed_scan_file
        if not sealed_file:
            return {"status": "skipped", "reason": "no_file"}
        
        file_name = sealed_file.get("file_name", "")
        page_count = sealed_file.get("page_count", 0)
        file_hash = sealed_file.get("file_hash", "")
        
        if not file_hash:
            import hashlib
            file_hash = hashlib.md5(f"{file_name}{page_count}{task.batch_id}".encode()).hexdigest()
        
        result = {
            "status": "processed",
            "file_name": file_name,
            "file_hash": file_hash,
            "page_count": page_count,
            "pages_verified": page_count,
            "sealed_timestamp": datetime.now().isoformat(),
            "seal_code": f"SEAL-SCAN-{task.batch_id}-{int(datetime.now().timestamp())}"
        }
        
        TaskService._create_history(
            db, task, "sealed_scan_process",
            result,
            "system",
            changed_fields=["sealed_scan_file"]
        )
        
        return result
    
    def _process_confirmation_file(self, db: Session, task: TenderTask) -> dict:
        conf_file = task.confirmation_file
        if not conf_file:
            return {"status": "skipped", "reason": "no_file"}
        
        file_name = conf_file.get("file_name", "")
        file_hash = conf_file.get("file_hash", "")
        
        if not file_hash:
            import hashlib
            file_hash = hashlib.md5(f"{file_name}{task.batch_id}".encode()).hexdigest()
        
        result = {
            "status": "processed",
            "file_name": file_name,
            "file_hash": file_hash,
            "confirmed": True,
            "sealed_timestamp": datetime.now().isoformat(),
            "seal_code": f"SEAL-CONF-{task.batch_id}-{int(datetime.now().timestamp())}"
        }
        
        TaskService._create_history(
            db, task, "confirmation_process",
            result,
            "system",
            changed_fields=["confirmation_file"]
        )
        
        return result
    
    def _send_external_receipt(self, db: Session, task: TenderTask) -> dict:
        import time
        import random
        
        time.sleep(0.1)
        
        if random.random() < 0.05:
            raise ConnectionError("外部回执服务暂时不可用，请稍后重试")
        
        receipt_id = f"RCPT-{task.batch_id}-{int(datetime.now().timestamp())}"
        
        result = {
            "status": "sent",
            "receipt_id": receipt_id,
            "sent_at": datetime.now().isoformat(),
            "recipient": "tender-platform@company.com",
            "acknowledged": True,
            "ack_time": datetime.now().isoformat()
        }
        
        TaskService._create_history(
            db, task, "external_receipt",
            result,
            "system"
        )
        
        return result
    
    def _record_compensation(self, db: Session, task: TenderTask) -> dict:
        compensation_id = f"CMP-{task.batch_id}-{int(datetime.now().timestamp())}"
        
        attachments = []
        if task.qualification_file:
            attachments.append("qualification")
        if task.quotation_version:
            attachments.append("quotation")
        if task.sealed_scan_file:
            attachments.append("sealed_scan")
        if task.confirmation_file:
            attachments.append("confirmation")
        
        result = {
            "status": "recorded",
            "compensation_id": compensation_id,
            "recorded_at": datetime.now().isoformat(),
            "attachments_processed": attachments,
            "submitter": task.submitter,
            "batch_id": task.batch_id,
            "ledger_entry": True,
            "account_code": f"TENDER-{task.tender_no}"
        }
        
        TaskService._create_history(
            db, task, "compensation_record",
            result,
            "system"
        )
        
        return result
