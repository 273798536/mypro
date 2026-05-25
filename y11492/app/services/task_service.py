from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
import json

from app.models import TenderTask, TaskHistory, DeadLetterTask, TaskStatus, ConflictStrategy
from app.schemas import (
    TaskSubmitRequest, TaskResponse,
    ManualHandleRequest, RetryRequest, CancelRequest,
    FreezeRequest, CloseRequest
)
from app.config import settings

class TaskService:
    @staticmethod
    def create_task(db: Session, request: TaskSubmitRequest) -> Tuple[TenderTask, str]:
        from app.schemas import generate_batch_id
        
        existing_task = db.query(TenderTask).filter(
            TenderTask.tender_no == request.tender_no,
            TenderTask.status.notin_([TaskStatus.CANCELLED, TaskStatus.CLOSED])
        ).order_by(desc(TenderTask.submit_time)).first()
        
        message = "任务提交成功"
        parent_task_id = None
        
        if existing_task:
            if request.conflict_strategy == ConflictStrategy.IGNORE:
                return existing_task, "任务已存在，按策略忽略新提交"
            
            elif request.conflict_strategy == ConflictStrategy.OVERWRITE:
                parent_task_id = existing_task.id
                existing_task.status = TaskStatus.CANCELLED
                TaskService._create_history(
                    db, existing_task, "overwrite_cancel",
                    f"被新批次任务覆盖取消",
                    request.submitter,
                    after_status=TaskStatus.CANCELLED
                )
                message = f"已覆盖原有任务(ID:{existing_task.id})"
            
            elif request.conflict_strategy == ConflictStrategy.APPEND:
                parent_task_id = existing_task.id
                message = f"追加到原有任务批次，父任务ID:{existing_task.id}"
        
        batch_id = generate_batch_id()
        
        task = TenderTask(
            batch_id=batch_id,
            tender_no=request.tender_no,
            project_name=request.project_name,
            qualification_file=request.qualification_file.model_dump() if request.qualification_file else None,
            quotation_version=request.quotation_version.model_dump() if request.quotation_version else None,
            sealed_scan_file=request.sealed_scan_file.model_dump() if request.sealed_scan_file else None,
            confirmation_file=request.confirmation_file.model_dump() if request.confirmation_file else None,
            submitter=request.submitter,
            max_retry_times=request.max_retry_times,
            conflict_strategy=request.conflict_strategy,
            parent_task_id=parent_task_id
        )
        
        db.add(task)
        db.flush()
        
        TaskService._create_history(
            db, task, "submit",
            {"remark": request.remark} if request.remark else None,
            request.submitter,
            after_status=TaskStatus.PENDING
        )
        
        db.commit()
        db.refresh(task)
        
        return task, message

    @staticmethod
    def get_task(db: Session, task_id: int) -> Optional[TenderTask]:
        return db.query(TenderTask).filter(TenderTask.id == task_id).first()

    @staticmethod
    def get_task_detail(db: Session, task_id: int):
        from app.schemas import TaskDetailResponse, TaskHistoryResponse
        
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        histories = db.query(TaskHistory).filter(
            TaskHistory.task_id == task_id
        ).order_by(desc(TaskHistory.operate_time)).all()
        
        task_response = TaskResponse.model_validate(task)
        return TaskDetailResponse(
            **task_response.model_dump(),
            histories=[TaskHistoryResponse.model_validate(h) for h in histories]
        )

    @staticmethod
    def list_tasks(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        status: Optional[TaskStatus] = None,
        tender_no: Optional[str] = None,
        submitter: Optional[str] = None,
        batch_id: Optional[str] = None
    ) -> Tuple[int, List[TenderTask]]:
        query = db.query(TenderTask)
        
        if status:
            query = query.filter(TenderTask.status == status)
        if tender_no:
            query = query.filter(TenderTask.tender_no.contains(tender_no))
        if submitter:
            query = query.filter(TenderTask.submitter.contains(submitter))
        if batch_id:
            query = query.filter(TenderTask.batch_id == batch_id)
        
        total = query.count()
        items = query.order_by(desc(TenderTask.submit_time))\
            .offset((page - 1) * page_size)\
            .limit(page_size)\
            .all()
        
        return total, items

    @staticmethod
    def retry_task(db: Session, task_id: int, request: RetryRequest) -> Optional[TenderTask]:
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        if task.status not in [TaskStatus.FAILED, TaskStatus.DEAD_LETTER, TaskStatus.MANUAL]:
            return None
        
        old_status = task.status
        task.status = TaskStatus.RETRYING
        task.retry_count = 0
        task.next_retry_time = datetime.now()
        task.error_message = None
        task.error_stack = None
        
        TaskService._create_history(
            db, task, "manual_retry",
            {"remark": request.remark},
            request.operator,
            before_status=old_status,
            after_status=TaskStatus.RETRYING
        )
        
        dead_letter = db.query(DeadLetterTask).filter(DeadLetterTask.task_id == task_id).first()
        if dead_letter:
            db.delete(dead_letter)
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def cancel_task(db: Session, task_id: int, request: CancelRequest) -> Optional[TenderTask]:
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        if task.status in [TaskStatus.SUCCESS, TaskStatus.CANCELLED, TaskStatus.CLOSED]:
            return None
        
        old_status = task.status
        task.status = TaskStatus.CANCELLED
        
        TaskService._create_history(
            db, task, "cancel",
            {"reason": request.reason},
            request.operator,
            before_status=old_status,
            after_status=TaskStatus.CANCELLED
        )
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def manual_handle(db: Session, task_id: int, request: ManualHandleRequest) -> Optional[TenderTask]:
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        if task.status not in [TaskStatus.FAILED, TaskStatus.DEAD_LETTER, TaskStatus.MANUAL, TaskStatus.PROCESSING]:
            return None
        
        old_status = task.status
        task.status = request.new_status
        task.manual_handler = request.handler
        task.manual_handle_time = datetime.now()
        task.manual_remark = request.remark
        
        if request.new_status == TaskStatus.SUCCESS:
            task.error_message = None
            task.error_stack = None
        
        TaskService._create_history(
            db, task, "manual_judge",
            {
                "remark": request.remark,
                "target_status": request.new_status.value
            },
            request.handler,
            before_status=old_status,
            after_status=request.new_status
        )
        
        if request.new_status != TaskStatus.DEAD_LETTER:
            dead_letter = db.query(DeadLetterTask).filter(DeadLetterTask.task_id == task_id).first()
            if dead_letter:
                db.delete(dead_letter)
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def freeze_task(db: Session, task_id: int, request: FreezeRequest) -> Optional[TenderTask]:
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        if task.is_frozen or task.status == TaskStatus.FROZEN:
            return None
        
        if task.status in [TaskStatus.SUCCESS, TaskStatus.CANCELLED, TaskStatus.CLOSED]:
            return None
        
        old_status = task.status
        task.status_before_frozen = old_status
        task.is_frozen = True
        task.status = TaskStatus.FROZEN
        task.frozen_by = request.operator
        task.frozen_time = datetime.now()
        task.frozen_reason = request.reason
        
        TaskService._create_history(
            db, task, "freeze",
            {"reason": request.reason, "status_before_frozen": old_status.value},
            request.operator,
            before_status=old_status,
            after_status=TaskStatus.FROZEN,
            changed_fields=["status", "is_frozen"]
        )
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def unfreeze_task(db: Session, task_id: int, operator: str, remark: Optional[str] = None) -> Optional[TenderTask]:
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        if not task.is_frozen and task.status != TaskStatus.FROZEN:
            return None
        
        old_status = task.status
        task.is_frozen = False
        target_status = task.status_before_frozen or TaskStatus.PENDING
        task.status = target_status
        task.status_before_frozen = None
        
        TaskService._create_history(
            db, task, "unfreeze",
            {"remark": remark, "restored_status": target_status.value},
            operator,
            before_status=old_status,
            after_status=target_status,
            changed_fields=["status", "is_frozen"]
        )
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def close_task(db: Session, task_id: int, request: CloseRequest) -> Optional[TenderTask]:
        task = db.query(TenderTask).filter(TenderTask.id == task_id).first()
        if not task:
            return None
        
        if task.status == TaskStatus.CLOSED:
            return None
        
        old_status = task.status
        task.status = TaskStatus.CLOSED
        task.closed_by = request.operator
        task.closed_time = datetime.now()
        task.close_reason = request.reason
        
        TaskService._create_history(
            db, task, "close",
            {"reason": request.reason},
            request.operator,
            before_status=old_status,
            after_status=TaskStatus.CLOSED
        )
        
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_task_histories(db: Session, task_id: int) -> List[TaskHistory]:
        return db.query(TaskHistory).filter(
            TaskHistory.task_id == task_id
        ).order_by(desc(TaskHistory.operate_time)).all()

    @staticmethod
    def get_batch_histories(db: Session, batch_id: str) -> List[TaskHistory]:
        return db.query(TaskHistory).filter(
            TaskHistory.batch_id == batch_id
        ).order_by(desc(TaskHistory.operate_time)).all()

    @staticmethod
    def _create_history(
        db: Session,
        task: TenderTask,
        operation_type: str,
        operation_detail: any,
        operator: str,
        before_status: Optional[TaskStatus] = None,
        after_status: Optional[TaskStatus] = None,
        changed_fields: Optional[List[str]] = None
    ):
        history = TaskHistory(
            task_id=task.id,
            batch_id=task.batch_id,
            operation_type=operation_type,
            operation_detail=operation_detail if isinstance(operation_detail, dict) else {"detail": str(operation_detail)},
            operator=operator,
            before_status=before_status,
            after_status=after_status,
            changed_fields=changed_fields
        )
        db.add(history)

    @staticmethod
    def get_statistics(db: Session) -> dict:
        total = db.query(func.count(TenderTask.id)).scalar()
        
        status_counts = {}
        for status in TaskStatus:
            count = db.query(func.count(TenderTask.id)).filter(
                TenderTask.status == status
            ).scalar()
            status_counts[status.value] = count
        
        frozen_by_is_frozen = db.query(func.count(TenderTask.id)).filter(
            TenderTask.is_frozen == True
        ).scalar() or 0
        
        if status_counts.get("frozen", 0) < frozen_by_is_frozen:
            status_counts["frozen"] = frozen_by_is_frozen
        
        now = datetime.now()
        today_start = datetime(now.year, now.month, now.day)
        tomorrow_start = datetime(now.year, now.month, now.day + 1)
        
        today_submitted = db.query(func.count(TenderTask.id)).filter(
            TenderTask.submit_time >= today_start,
            TenderTask.submit_time < tomorrow_start
        ).scalar()
        
        today_completed = db.query(func.count(TenderTask.id)).filter(
            TenderTask.last_process_time >= today_start,
            TenderTask.last_process_time < tomorrow_start,
            TenderTask.status == TaskStatus.SUCCESS
        ).scalar()
        
        recoverable = db.query(func.count(DeadLetterTask.id)).filter(
            DeadLetterTask.is_recoverable == True,
            DeadLetterTask.handled == False
        ).scalar()
        
        unrecoverable = db.query(func.count(DeadLetterTask.id)).filter(
            DeadLetterTask.is_recoverable == False,
            DeadLetterTask.handled == False
        ).scalar()
        
        return {
            "total_tasks": total or 0,
            "pending_tasks": status_counts.get("pending", 0) or 0,
            "processing_tasks": status_counts.get("processing", 0) or 0,
            "success_tasks": status_counts.get("success", 0) or 0,
            "failed_tasks": status_counts.get("failed", 0) or 0,
            "retrying_tasks": status_counts.get("retrying", 0) or 0,
            "dead_letter_tasks": status_counts.get("dead_letter", 0) or 0,
            "manual_tasks": status_counts.get("manual", 0) or 0,
            "frozen_tasks": status_counts.get("frozen", 0) or 0,
            "closed_tasks": status_counts.get("closed", 0) or 0,
            "today_submitted": today_submitted or 0,
            "today_completed": today_completed or 0,
            "recoverable_dead_letter": recoverable or 0,
            "unrecoverable_dead_letter": unrecoverable or 0
        }
