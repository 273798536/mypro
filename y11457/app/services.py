from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.models import (
    CompensationQueue, CompensationStatus, RetryLog, OperationLog,
    RetryCategory, IssueType, DataSource,
    LeaderRefund, WarehouseReview, UserRemark, ManualPriceAdjust,
    FailedRecord, ImportBatch, User
)
from app.config import settings
import uuid
import json


class QueueService:
    @staticmethod
    def generate_queue_no() -> str:
        return f"CQ{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    def generate_batch_no() -> str:
        return f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}"

    @staticmethod
    def determine_retry_category(issue_type: IssueType, error_message: Optional[str] = None) -> RetryCategory:
        if issue_type == IssueType.WRONG_PRICE:
            return RetryCategory.RETRYABLE
        
        if error_message:
            error_lower = error_message.lower()
            if any(kw in error_lower for kw in ["timeout", "network", "connection", "temporarily"]):
                return RetryCategory.RETRYABLE
            if any(kw in error_lower for kw in ["invalid", "not found", "not exist", "forbidden"]):
                return RetryCategory.NEED_MANUAL
        
        if issue_type == IssueType.SHORTAGE:
            return RetryCategory.NEED_MANUAL
        if issue_type == IssueType.DAMAGED:
            return RetryCategory.NEED_MANUAL
        
        return RetryCategory.NON_RETRYABLE

    @staticmethod
    def create_from_source(
        db: Session,
        source_type: DataSource,
        source_id: int,
        source_table: str,
        order_no: str,
        city: str,
        issue_type: IssueType,
        compensation_amount: float,
        operator: User,
        batch_no: Optional[str] = None
    ) -> CompensationQueue:
        existing = db.query(CompensationQueue).filter(
            and_(
                CompensationQueue.source_type == source_type,
                CompensationQueue.source_id == source_id
            )
        ).first()
        
        if existing:
            return existing

        queue = CompensationQueue(
            queue_no=QueueService.generate_queue_no(),
            order_no=order_no,
            city=city,
            source_type=source_type,
            source_id=source_id,
            source_table=source_table,
            issue_type=issue_type,
            compensation_amount=compensation_amount,
            status=CompensationStatus.QUEUED,
            retry_category=QueueService.determine_retry_category(issue_type),
            next_retry_at=datetime.utcnow(),
            batch_no=batch_no
        )
        db.add(queue)
        db.flush()
        
        OperationLogService.log(
            db=db,
            user=operator,
            action="create_queue",
            table_name="compensation_queues",
            record_id=queue.id,
            diff_data={
                "before": None,
                "after": {
                    "queue_no": queue.queue_no,
                    "order_no": order_no,
                    "source_type": source_type.value,
                    "compensation_amount": compensation_amount
                }
            }
        )
        
        return queue

    @staticmethod
    def process_queue(db: Session, queue: CompensationQueue, operator: Optional[User] = None) -> Tuple[bool, Optional[str]]:
        if queue.status == CompensationStatus.COMPLETED or queue.status == CompensationStatus.CLOSED:
            return False, "已完成或已关闭的记录不能重试"

        if queue.retry_count >= queue.max_retries and queue.status != CompensationStatus.MANUAL_TAKEOVER:
            queue.status = CompensationStatus.DEAD_LETTER
            queue.retry_category = RetryCategory.NON_RETRYABLE
            db.flush()
            
            RetryLogService.create(
                db=db,
                queue_id=queue.id,
                retry_number=queue.retry_count,
                status_before=queue.status.value,
                status_after=CompensationStatus.DEAD_LETTER.value,
                action="max_retries_exceeded",
                error_message="超过最大重试次数，进入死信队列",
                operator=operator
            )
            return False, "超过最大重试次数"

        status_before = queue.status.value
        queue.status = CompensationStatus.PROCESSING
        queue.retry_count += 1
        queue.last_retry_at = datetime.utcnow()
        db.flush()

        success, result = ExternalService.simulate_compensation(queue)

        if success:
            queue.status = CompensationStatus.COMPLETED
            queue.actual_compensation = queue.compensation_amount
            queue.completed_at = datetime.utcnow()
            status_after = CompensationStatus.COMPLETED.value
            
            RetryLogService.create(
                db=db,
                queue_id=queue.id,
                retry_number=queue.retry_count,
                status_before=status_before,
                status_after=status_after,
                action="compensation_success",
                response_data=result,
                operator=operator
            )
        else:
            error_msg = result.get("error", "未知错误") if isinstance(result, dict) else str(result)
            queue.retry_category = QueueService.determine_retry_category(queue.issue_type, error_msg)
            
            if queue.retry_category == RetryCategory.RETRYABLE:
                queue.status = CompensationStatus.RETRYING
                queue.next_retry_at = datetime.utcnow() + timedelta(hours=settings.RETRY_INTERVAL_HOURS)
            elif queue.retry_category == RetryCategory.NEED_MANUAL:
                queue.status = CompensationStatus.MANUAL_TAKEOVER
            else:
                queue.status = CompensationStatus.DEAD_LETTER
            
            status_after = queue.status.value
            
            RetryLogService.create(
                db=db,
                queue_id=queue.id,
                retry_number=queue.retry_count,
                status_before=status_before,
                status_after=status_after,
                action="compensation_failed",
                error_message=error_msg,
                response_data=result if isinstance(result, dict) else None,
                operator=operator
            )

        db.flush()
        return success, result

    @staticmethod
    def manual_takeover(db: Session, queue_id: int, reason: str, operator: User) -> CompensationQueue:
        queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
        if not queue:
            raise ValueError("队列记录不存在")

        status_before = queue.status.value
        queue.status = CompensationStatus.MANUAL_TAKEOVER
        queue.assigned_to = operator.id
        db.flush()

        RetryLogService.create(
            db=db,
            queue_id=queue.id,
            retry_number=queue.retry_count,
            status_before=status_before,
            status_after=CompensationStatus.MANUAL_TAKEOVER.value,
            action="manual_takeover",
            error_message=reason,
            operator=operator
        )

        return queue

    @staticmethod
    def close_queue(db: Session, queue_id: int, close_reason: str, operator: User) -> CompensationQueue:
        queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
        if not queue:
            raise ValueError("队列记录不存在")

        status_before = queue.status.value
        queue.status = CompensationStatus.CLOSED
        queue.closed_by = operator.id
        queue.closed_at = datetime.utcnow()
        queue.close_reason = close_reason
        db.flush()

        RetryLogService.create(
            db=db,
            queue_id=queue.id,
            retry_number=queue.retry_count,
            status_before=status_before,
            status_after=CompensationStatus.CLOSED.value,
            action="closed",
            error_message=close_reason,
            operator=operator
        )

        return queue

    @staticmethod
    def force_retry(db: Session, queue_id: int, operator: User) -> Tuple[bool, Optional[str]]:
        queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
        if not queue:
            raise ValueError("队列记录不存在")

        queue.retry_count = 0
        queue.status = CompensationStatus.QUEUED
        queue.next_retry_at = datetime.utcnow()
        db.flush()

        return QueueService.process_queue(db, queue, operator)

    @staticmethod
    def get_source_record(db: Session, queue: CompensationQueue) -> Optional[Any]:
        source_map = {
            DataSource.LEADER_REFUND: LeaderRefund,
            DataSource.WAREHOUSE_REVIEW: WarehouseReview,
            DataSource.USER_REMARK: UserRemark,
            DataSource.MANUAL_PRICE_ADJUST: ManualPriceAdjust
        }
        
        model = source_map.get(queue.source_type)
        if not model:
            return None
        
        return db.query(model).filter(model.id == queue.source_id).first()


class RetryLogService:
    @staticmethod
    def create(
        db: Session,
        queue_id: int,
        retry_number: int,
        status_before: str,
        status_after: str,
        action: str,
        error_message: Optional[str] = None,
        response_data: Optional[Dict[str, Any]] = None,
        operator: Optional[User] = None
    ) -> RetryLog:
        log = RetryLog(
            queue_id=queue_id,
            retry_number=retry_number,
            status_before=status_before,
            status_after=status_after,
            action=action,
            error_message=error_message,
            response_data=response_data,
            operator_id=operator.id if operator else None,
            operator_name=operator.full_name if operator else None,
            diff_data={
                "status": {
                    "before": status_before,
                    "after": status_after
                },
                "action": action
            }
        )
        db.add(log)
        db.flush()
        return log

    @staticmethod
    def get_by_queue_id(db: Session, queue_id: int) -> List[RetryLog]:
        return db.query(RetryLog).filter(RetryLog.queue_id == queue_id).order_by(RetryLog.created_at).all()


class OperationLogService:
    @staticmethod
    def log(
        db: Session,
        user: User,
        action: str,
        table_name: Optional[str] = None,
        record_id: Optional[int] = None,
        field_name: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        diff_data: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> OperationLog:
        log = OperationLog(
            user_id=user.id,
            user_name=user.full_name,
            action=action,
            table_name=table_name,
            record_id=record_id,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            diff_data=diff_data,
            ip_address=ip_address
        )
        db.add(log)
        db.flush()
        return log

    @staticmethod
    def get_record_history(db: Session, table_name: str, record_id: int) -> List[OperationLog]:
        return db.query(OperationLog).filter(
            and_(
                OperationLog.table_name == table_name,
                OperationLog.record_id == record_id
            )
        ).order_by(OperationLog.created_at).all()


class ExternalService:
    @staticmethod
    def simulate_compensation(queue: CompensationQueue) -> Tuple[bool, Dict[str, Any]]:
        import random
        
        success_rate = {
            IssueType.WRONG_PRICE: 0.8,
            IssueType.SHORTAGE: 0.5,
            IssueType.DAMAGED: 0.4,
            IssueType.OTHER: 0.6
        }
        
        rate = success_rate.get(queue.issue_type, 0.5)
        
        if queue.retry_count > 1:
            rate = rate * (1 - (queue.retry_count * 0.1))
        
        if random.random() < rate:
            return True, {
                "receipt_id": f"RCP{uuid.uuid4().hex[:12].upper()}",
                "transaction_id": f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "amount": queue.compensation_amount,
                "timestamp": datetime.utcnow().isoformat(),
                "channel": "auto_compensation"
            }
        else:
            errors = [
                "支付系统超时，请稍后重试",
                "用户账户信息校验失败",
                "订单状态异常，无法补偿",
                "网络连接错误，重试中",
                "金额计算不一致，需要人工核对"
            ]
            error = random.choice(errors)
            return False, {
                "error": error,
                "error_code": f"ERR{random.randint(1000, 9999)}",
                "retryable": "超时" in error or "网络" in error
            }

    @staticmethod
    def submit_external_receipt(
        db: Session,
        queue_id: int,
        receipt_id: str,
        receipt_status: str,
        receipt_data: Optional[Dict[str, Any]],
        operator: User
    ) -> CompensationQueue:
        queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
        if not queue:
            raise ValueError("队列记录不存在")

        status_before = queue.status.value
        queue.external_receipt_id = receipt_id
        queue.external_receipt_status = receipt_status
        queue.external_receipt_data = receipt_data

        if receipt_status.lower() in ["success", "completed", "成功"]:
            queue.status = CompensationStatus.COMPLETED
            queue.actual_compensation = receipt_data.get("amount", queue.compensation_amount) if receipt_data else queue.compensation_amount
            queue.completed_at = datetime.utcnow()
            action = "external_receipt_success"
        elif receipt_status.lower() in ["failed", "失败"]:
            queue.status = CompensationStatus.FAILED
            action = "external_receipt_failed"
        else:
            queue.status = CompensationStatus.PROCESSING
            action = "external_receipt_submitted"

        status_after = queue.status.value
        db.flush()

        RetryLogService.create(
            db=db,
            queue_id=queue.id,
            retry_number=queue.retry_count,
            status_before=status_before,
            status_after=status_after,
            action=action,
            response_data={"receipt_id": receipt_id, "status": receipt_status, "data": receipt_data},
            operator=operator
        )

        return queue


class FailedRecordService:
    @staticmethod
    def create(
        db: Session,
        source_type: DataSource,
        source_table: str,
        source_data: Dict[str, Any],
        batch_no: str,
        error_type: str,
        error_message: str,
        city: Optional[str] = None
    ) -> FailedRecord:
        record = FailedRecord(
            source_type=source_type,
            source_table=source_table,
            source_data=source_data,
            batch_no=batch_no,
            error_type=error_type,
            error_message=error_message,
            city=city,
            is_resolved=False
        )
        db.add(record)
        db.flush()
        return record

    @staticmethod
    def resolve(
        db: Session,
        record_id: int,
        resolution_note: str,
        operator: User
    ) -> FailedRecord:
        record = db.query(FailedRecord).filter(FailedRecord.id == record_id).first()
        if not record:
            raise ValueError("失败记录不存在")

        record.is_resolved = True
        record.resolved_by = operator.id
        record.resolved_at = datetime.utcnow()
        record.resolution_note = resolution_note
        db.flush()

        return record

    @staticmethod
    def get_unresolved(db: Session, city: Optional[str] = None, limit: int = 100) -> List[FailedRecord]:
        query = db.query(FailedRecord).filter(FailedRecord.is_resolved == False)
        if city:
            query = query.filter(FailedRecord.city == city)
        return query.order_by(FailedRecord.created_at.desc()).limit(limit).all()


class ReportService:
    @staticmethod
    def get_city_summary(db: Session, city: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(
            CompensationQueue.city,
            func.count(CompensationQueue.id).label("total_count"),
            func.sum(func.case((CompensationQueue.status == CompensationStatus.COMPLETED, 1), else_=0)).label("completed_count"),
            func.sum(func.case((CompensationQueue.status.in_([CompensationStatus.QUEUED, CompensationStatus.RETRYING, CompensationStatus.PROCESSING]), 1), else_=0)).label("pending_count"),
            func.sum(func.case((CompensationQueue.status == CompensationStatus.FAILED, 1), else_=0)).label("failed_count"),
            func.sum(func.case((CompensationQueue.status == CompensationStatus.DEAD_LETTER, 1), else_=0)).label("dead_letter_count"),
            func.sum(CompensationQueue.compensation_amount).label("total_amount"),
            func.sum(func.case((CompensationQueue.status == CompensationStatus.COMPLETED, CompensationQueue.actual_compensation), else_=0)).label("completed_amount"),
            func.sum(func.case((CompensationQueue.status.in_([CompensationStatus.QUEUED, CompensationStatus.RETRYING, CompensationStatus.PROCESSING]), CompensationQueue.compensation_amount), else_=0)).label("pending_amount")
        ).group_by(CompensationQueue.city)

        if city:
            query = query.filter(CompensationQueue.city == city)

        results = query.all()
        return [
            {
                "city": r.city,
                "total_count": r.total_count,
                "completed_count": r.completed_count,
                "pending_count": r.pending_count,
                "failed_count": r.failed_count,
                "dead_letter_count": r.dead_letter_count,
                "total_amount": float(r.total_amount or 0),
                "completed_amount": float(r.completed_amount or 0),
                "pending_amount": float(r.pending_amount or 0)
            }
            for r in results
        ]

    @staticmethod
    def get_retry_category_report(db: Session, city: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(
            CompensationQueue.retry_category,
            func.count(CompensationQueue.id).label("count"),
            func.sum(CompensationQueue.compensation_amount).label("amount")
        ).filter(
            CompensationQueue.status.in_([CompensationStatus.RETRYING, CompensationStatus.MANUAL_TAKEOVER, CompensationStatus.DEAD_LETTER])
        ).group_by(CompensationQueue.retry_category)

        if city:
            query = query.filter(CompensationQueue.city == city)

        results = query.all()
        total_count = sum(r.count for r in results) if results else 1

        return [
            {
                "category": r.retry_category.value if r.retry_category else "unknown",
                "count": r.count,
                "amount": float(r.amount or 0),
                "percentage": round((r.count / total_count) * 100, 2)
            }
            for r in results
        ]

    @staticmethod
    def get_dead_letter_report(db: Session, city: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(
            RetryLog.error_message,
            func.count(RetryLog.id).label("count"),
            func.avg(RetryLog.retry_number).label("avg_retry_count")
        ).join(
            CompensationQueue, CompensationQueue.id == RetryLog.queue_id
        ).filter(
            CompensationQueue.status == CompensationStatus.DEAD_LETTER
        ).group_by(RetryLog.error_message).order_by(func.count(RetryLog.id).desc())

        if city:
            query = query.filter(CompensationQueue.city == city)

        results = query.limit(10).all()

        return [
            {
                "reason": r.error_message or "未知原因",
                "count": r.count,
                "avg_retry_count": float(r.avg_retry_count or 0)
            }
            for r in results
        ]

    @staticmethod
    def get_issue_type_distribution(db: Session, city: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(
            CompensationQueue.issue_type,
            func.count(CompensationQueue.id).label("count"),
            func.sum(CompensationQueue.compensation_amount).label("amount")
        ).group_by(CompensationQueue.issue_type)

        if city:
            query = query.filter(CompensationQueue.city == city)

        results = query.all()

        return [
            {
                "issue_type": r.issue_type.value if r.issue_type else "unknown",
                "count": r.count,
                "amount": float(r.amount or 0)
            }
            for r in results
        ]
