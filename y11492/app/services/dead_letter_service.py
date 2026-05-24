from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime
from typing import List, Optional, Tuple

from app.models import DeadLetterTask, TenderTask, TaskStatus

class DeadLetterService:
    @staticmethod
    def create_dead_letter(
        db: Session,
        task: TenderTask,
        error_message: str,
        retry_classification: Optional[str] = None
    ) -> DeadLetterTask:
        existing = db.query(DeadLetterTask).filter(
            DeadLetterTask.task_id == task.id
        ).first()
        
        if existing:
            existing.fail_count += 1
            existing.last_error = error_message
            existing.last_fail_time = datetime.now()
            if retry_classification:
                existing.retry_classification = retry_classification
            db.commit()
            db.refresh(existing)
            return existing
        
        dead_letter = DeadLetterTask(
            task_id=task.id,
            batch_id=task.batch_id,
            fail_count=1,
            last_error=error_message,
            first_fail_time=datetime.now(),
            last_fail_time=datetime.now(),
            retry_classification=retry_classification or DeadLetterService._classify_error(error_message),
            is_recoverable=DeadLetterService._is_recoverable(error_message)
        )
        
        db.add(dead_letter)
        db.commit()
        db.refresh(dead_letter)
        return dead_letter

    @staticmethod
    def _classify_error(error_message: str) -> str:
        error_lower = error_message.lower()
        
        if any(k in error_lower for k in ["network", "timeout", "connection", "504", "502"]):
            return "NETWORK_ERROR"
        elif any(k in error_lower for k in ["file", "upload", "download", "not found", "404"]):
            return "FILE_ERROR"
        elif any(k in error_lower for k in ["permission", "auth", "401", "403", "unauthorized"]):
            return "PERMISSION_ERROR"
        elif any(k in error_lower for k in ["format", "invalid", "parse", "schema"]):
            return "FORMAT_ERROR"
        elif any(k in error_lower for k in ["database", "sql", "constraint"]):
            return "DATABASE_ERROR"
        else:
            return "UNKNOWN_ERROR"

    @staticmethod
    def _is_recoverable(error_message: str) -> bool:
        error_lower = error_message.lower()
        unrecoverable_keywords = [
            "permanent", "fatal", "invalid file", "corrupted",
            "malformed", "not exists", "not found", "deleted"
        ]
        return not any(k in error_lower for k in unrecoverable_keywords)

    @staticmethod
    def list_dead_letters(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        handled: Optional[bool] = None,
        is_recoverable: Optional[bool] = None,
        retry_classification: Optional[str] = None,
        batch_id: Optional[str] = None
    ) -> Tuple[int, List[DeadLetterTask]]:
        query = db.query(DeadLetterTask)
        
        if handled is not None:
            query = query.filter(DeadLetterTask.handled == handled)
        if is_recoverable is not None:
            query = query.filter(DeadLetterTask.is_recoverable == is_recoverable)
        if retry_classification:
            query = query.filter(DeadLetterTask.retry_classification == retry_classification)
        if batch_id:
            query = query.filter(DeadLetterTask.batch_id == batch_id)
        
        total = query.count()
        items = query.order_by(desc(DeadLetterTask.last_fail_time))\
            .offset((page - 1) * page_size)\
            .limit(page_size)\
            .all()
        
        return total, items

    @staticmethod
    def get_dead_letter(db: Session, dead_letter_id: int) -> Optional[DeadLetterTask]:
        return db.query(DeadLetterTask).filter(DeadLetterTask.id == dead_letter_id).first()

    @staticmethod
    def mark_handled(
        db: Session,
        dead_letter_id: int,
        handler: str,
        handle_result: str,
        remark: Optional[str] = None
    ) -> Optional[DeadLetterTask]:
        dead_letter = db.query(DeadLetterTask).filter(
            DeadLetterTask.id == dead_letter_id
        ).first()
        
        if not dead_letter:
            return None
        
        dead_letter.handled = True
        dead_letter.handled_by = handler
        dead_letter.handled_time = datetime.now()
        dead_letter.handle_result = handle_result
        if remark:
            dead_letter.recover_remark = remark
        
        db.commit()
        db.refresh(dead_letter)
        return dead_letter

    @staticmethod
    def update_classification(
        db: Session,
        dead_letter_id: int,
        retry_classification: str,
        is_recoverable: bool,
        operator: str
    ) -> Optional[DeadLetterTask]:
        dead_letter = db.query(DeadLetterTask).filter(
            DeadLetterTask.id == dead_letter_id
        ).first()
        
        if not dead_letter:
            return None
        
        dead_letter.retry_classification = retry_classification
        dead_letter.is_recoverable = is_recoverable
        
        db.commit()
        db.refresh(dead_letter)
        return dead_letter

    @staticmethod
    def get_classification_stats(db: Session) -> dict:
        all_dead_letters = db.query(DeadLetterTask).all()
        
        result = {}
        for dl in all_dead_letters:
            classification = dl.retry_classification or "UNKNOWN_ERROR"
            if classification not in result:
                result[classification] = {
                    "total": 0,
                    "recoverable": 0,
                    "unhandled": 0
                }
            
            result[classification]["total"] += 1
            if dl.is_recoverable:
                result[classification]["recoverable"] += 1
            if not dl.handled:
                result[classification]["unhandled"] += 1
        
        return result
