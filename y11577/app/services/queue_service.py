from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.config import settings
from app.models.business import (
    CompensationQueue,
    CompensationItem,
    OutsourceDelivery,
    RepairRecord,
    DeductionDetail,
    SettlementSummary,
    ChangeHistory
)
from app.models.auth import User


class QueueStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"
    MANUAL_HANDLING = "manual_handling"
    CLOSED = "closed"


class CompensationQueueService:
    def __init__(self, db: Session):
        self.db = db

    def enqueue(
        self,
        business_type: str,
        business_key: str,
        business_id: Optional[int] = None,
        source_ids: Optional[List[int]] = None,
        max_retries: Optional[int] = None
    ) -> CompensationQueue:
        existing = self.db.query(CompensationQueue).filter(
            CompensationQueue.business_type == business_type,
            CompensationQueue.business_key == business_key,
            CompensationQueue.status.in_([QueueStatus.PENDING, QueueStatus.PROCESSING, QueueStatus.FAILED])
        ).first()

        if existing:
            return existing

        queue_item = CompensationQueue(
            business_type=business_type,
            business_key=business_key,
            business_id=business_id,
            status=QueueStatus.PENDING,
            retry_count=0,
            max_retries=max_retries or settings.MAX_RETRIES,
            next_retry_at=datetime.utcnow(),
            source_ids=source_ids or []
        )
        self.db.add(queue_item)
        self.db.commit()
        self.db.refresh(queue_item)
        return queue_item

    def get_pending_items(self, batch_size: int = 10) -> List[CompensationQueue]:
        now = datetime.utcnow()
        return self.db.query(CompensationQueue).filter(
            CompensationQueue.status.in_([QueueStatus.PENDING, QueueStatus.FAILED]),
            CompensationQueue.next_retry_at <= now,
            CompensationQueue.retry_count < CompensationQueue.max_retries
        ).order_by(CompensationQueue.next_retry_at).limit(batch_size).all()

    def process_item(self, queue_id: int) -> Dict[str, Any]:
        queue_item = self.db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
        if not queue_item:
            return {"success": False, "error": "队列项不存在"}

        if queue_item.status == QueueStatus.SUCCESS:
            return {"success": True, "message": "已处理成功"}

        queue_item.status = QueueStatus.PROCESSING
        queue_item.retry_count += 1
        self.db.commit()

        try:
            result = self._process_business_item(queue_item)
            if result["success"]:
                self._mark_success(queue_item, result)
                return {"success": True, "data": result}
            else:
                self._mark_failed(queue_item, result.get("error", "处理失败"), result.get("error_code"))
                return {"success": False, "error": result.get("error", "处理失败")}
        except Exception as e:
            self._mark_failed(queue_item, str(e), "UNEXPECTED_ERROR")
            return {"success": False, "error": str(e)}

    def _process_business_item(self, queue_item: CompensationQueue) -> Dict[str, Any]:
        if queue_item.business_type == "delivery":
            return self._process_delivery_compensation(queue_item)
        elif queue_item.business_type == "repair":
            return self._process_repair_compensation(queue_item)
        elif queue_item.business_type == "deduction":
            return self._process_deduction_compensation(queue_item)
        else:
            return {"success": False, "error": f"未知业务类型: {queue_item.business_type}"}

    def _process_delivery_compensation(self, queue_item: CompensationQueue) -> Dict[str, Any]:
        delivery = self.db.query(OutsourceDelivery).filter(
            OutsourceDelivery.id == queue_item.business_id
        ).first()

        if not delivery:
            return {"success": False, "error": "外协送货单不存在", "error_code": "DELIVERY_NOT_FOUND"}

        try:
            self._update_settlement_summary(
                supplier_code=delivery.supplier_code,
                supplier_name=delivery.supplier_name,
                product_code=delivery.product_code,
                product_name=delivery.product_name,
                summary_date=delivery.delivery_date,
                delivery_amount=delivery.total_amount,
                source_id=delivery.id,
                source_type="delivery"
            )
            return {"success": True, "message": "外协送货单补偿成功"}
        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "DELIVERY_PROCESS_ERROR"}

    def _process_repair_compensation(self, queue_item: CompensationQueue) -> Dict[str, Any]:
        repair = self.db.query(RepairRecord).filter(
            RepairRecord.id == queue_item.business_id
        ).first()

        if not repair:
            return {"success": False, "error": "返修记录不存在", "error_code": "REPAIR_NOT_FOUND"}

        try:
            delivery = self.db.query(OutsourceDelivery).filter(
                OutsourceDelivery.id == repair.delivery_id
            ).first()

            if delivery:
                self._update_settlement_summary(
                    supplier_code=delivery.supplier_code,
                    supplier_name=delivery.supplier_name,
                    product_code=delivery.product_code,
                    product_name=delivery.product_name,
                    summary_date=repair.repair_date,
                    repair_amount=repair.repair_cost,
                    source_id=repair.id,
                    source_type="repair"
                )
            return {"success": True, "message": "返修记录补偿成功"}
        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "REPAIR_PROCESS_ERROR"}

    def _process_deduction_compensation(self, queue_item: CompensationQueue) -> Dict[str, Any]:
        deduction = self.db.query(DeductionDetail).filter(
            DeductionDetail.id == queue_item.business_id
        ).first()

        if not deduction:
            return {"success": False, "error": "扣款明细不存在", "error_code": "DEDUCTION_NOT_FOUND"}

        try:
            delivery = self.db.query(OutsourceDelivery).filter(
                OutsourceDelivery.id == deduction.delivery_id
            ).first()

            if delivery:
                self._update_settlement_summary(
                    supplier_code=delivery.supplier_code,
                    supplier_name=delivery.supplier_name,
                    product_code=delivery.product_code,
                    product_name=delivery.product_name,
                    summary_date=deduction.deduction_date,
                    deduction_amount=deduction.deduction_amount,
                    source_id=deduction.id,
                    source_type="deduction"
                )
            return {"success": True, "message": "扣款明细补偿成功"}
        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "DEDUCTION_PROCESS_ERROR"}

    def _update_settlement_summary(
        self,
        supplier_code: str,
        supplier_name: str,
        product_code: str,
        product_name: str,
        summary_date: datetime,
        delivery_amount: float = 0,
        repair_amount: float = 0,
        deduction_amount: float = 0,
        source_id: int = None,
        source_type: str = None
    ):
        summary = self.db.query(SettlementSummary).filter(
            SettlementSummary.supplier_code == supplier_code,
            SettlementSummary.summary_date == summary_date,
            SettlementSummary.product_code == product_code
        ).first()

        if not summary:
            summary = SettlementSummary(
                summary_date=summary_date,
                supplier_code=supplier_code,
                supplier_name=supplier_name,
                product_code=product_code,
                product_name=product_name,
                delivery_amount=delivery_amount,
                repair_amount=repair_amount,
                deduction_amount=deduction_amount,
                final_amount=delivery_amount + repair_amount - deduction_amount,
                source_ids={source_type: [source_id] if source_id else []},
                version=1
            )
            self.db.add(summary)
        else:
            summary.delivery_amount += delivery_amount
            summary.repair_amount += repair_amount
            summary.deduction_amount += deduction_amount
            summary.final_amount = summary.delivery_amount + summary.repair_amount - summary.deduction_amount
            
            if source_type and source_id:
                source_ids = summary.source_ids or {}
                if source_type not in source_ids:
                    source_ids[source_type] = []
                if source_id not in source_ids[source_type]:
                    source_ids[source_type].append(source_id)
                summary.source_ids = source_ids
            
            summary.version += 1

        self.db.commit()

    def _mark_success(self, queue_item: CompensationQueue, result: Dict[str, Any]):
        queue_item.status = QueueStatus.SUCCESS
        queue_item.last_error = None
        queue_item.error_code = None
        self._add_process_log(queue_item, "success", result.get("message", "处理成功"))
        self.db.commit()

    def _mark_failed(self, queue_item: CompensationQueue, error: str, error_code: Optional[str] = None):
        queue_item.last_error = error
        queue_item.error_code = error_code
        self._add_process_log(queue_item, "failed", error, error_code)

        if queue_item.retry_count >= queue_item.max_retries:
            queue_item.status = QueueStatus.DEAD_LETTER
        else:
            queue_item.status = QueueStatus.FAILED
            queue_item.next_retry_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_DELAY_MINUTES)

        self.db.commit()

    def _add_process_log(self, queue_item: CompensationQueue, log_type: str, message: str, error_code: Optional[str] = None):
        logs = queue_item.process_logs or []
        logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "type": log_type,
            "message": message,
            "error_code": error_code,
            "retry_count": queue_item.retry_count
        })
        queue_item.process_logs = logs

    def manual_handle(self, queue_id: int, user: User, action: str, note: str) -> Dict[str, Any]:
        queue_item = self.db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
        if not queue_item:
            return {"success": False, "error": "队列项不存在"}

        if action == "retry":
            queue_item.status = QueueStatus.PENDING
            queue_item.retry_count = 0
            queue_item.next_retry_at = datetime.utcnow()
            self._add_process_log(queue_item, "manual_retry", f"人工重试: {note}")
        elif action == "skip":
            queue_item.status = QueueStatus.CLOSED
            self._add_process_log(queue_item, "skipped", f"人工跳过: {note}")
        elif action == "adjust":
            queue_item.status = QueueStatus.MANUAL_HANDLING
            self._add_process_log(queue_item, "manual_adjust", f"人工调整: {note}")
        else:
            return {"success": False, "error": f"未知操作: {action}"}

        queue_item.handled_by = user.id
        queue_item.handled_at = datetime.utcnow()
        self.db.commit()
        return {"success": True, "message": "人工处理完成"}

    def get_dead_letter_queue(self, skip: int = 0, limit: int = 100) -> List[CompensationQueue]:
        return self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.DEAD_LETTER
        ).order_by(CompensationQueue.updated_at.desc()).offset(skip).limit(limit).all()

    def get_queue_statistics(self) -> Dict[str, Any]:
        stats = {
            "pending": self.db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.PENDING).count(),
            "processing": self.db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.PROCESSING).count(),
            "success": self.db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.SUCCESS).count(),
            "failed": self.db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.FAILED).count(),
            "dead_letter": self.db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.DEAD_LETTER).count(),
            "manual_handling": self.db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.MANUAL_HANDLING).count(),
        }
        
        by_error_code = self.db.query(
            CompensationQueue.error_code,
            CompensationQueue.status,
            CompensationQueue.business_type
        ).filter(
            CompensationQueue.status.in_([QueueStatus.FAILED, QueueStatus.DEAD_LETTER])
        ).all()
        
        error_stats = {}
        for error_code, status, business_type in by_error_code:
            if error_code not in error_stats:
                error_stats[error_code] = {"count": 0, "status": set(), "business_types": set()}
            error_stats[error_code]["count"] += 1
            error_stats[error_code]["status"].add(status)
            error_stats[error_code]["business_types"].add(business_type)

        return {
            "overview": stats,
            "error_breakdown": error_stats
        }

    def retry_all_dead_letters(self, user: User) -> Dict[str, Any]:
        dead_letters = self.get_dead_letter_queue(limit=1000)
        count = 0
        for item in dead_letters:
            result = self.manual_handle(item.id, user, "retry", "批量重试死信")
            if result["success"]:
                count += 1
        return {"success": True, "retried_count": count, "total_count": len(dead_letters)}
