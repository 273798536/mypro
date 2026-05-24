from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.compensation_queue import CompensationQueue, StatusHistory
from app.models.enums import QueueStatus, FailCategory
from app.models.raw_data import RawDataRecord


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_region_status_summary(self, region: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.db.query(
            CompensationQueue.region,
            CompensationQueue.status,
            func.count(CompensationQueue.id).label("count"),
        ).group_by(CompensationQueue.region, CompensationQueue.status)

        if region:
            query = query.filter(CompensationQueue.region == region)

        results = query.all()

        summary = {}
        for r in results:
            if r.region not in summary:
                summary[r.region] = {
                    "region": r.region,
                    "status_counts": {},
                }
            summary[r.region]["status_counts"][r.status.value] = r.count

        return list(summary.values())

    def get_retryable_items_report(
        self,
        region: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        query = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.WAITING_RETRY
        )

        if region:
            query = query.filter(CompensationQueue.region == region)

        items = query.order_by(CompensationQueue.next_retry_at).limit(limit).all()

        return {
            "total": query.count(),
            "items": [
                {
                    "id": item.id,
                    "queue_key": item.queue_key,
                    "appointment_no": item.appointment_no,
                    "region": item.region,
                    "retry_count": item.retry_count,
                    "max_retry_times": item.max_retry_times,
                    "next_retry_at": item.next_retry_at,
                    "last_error": item.last_error,
                }
                for item in items
            ],
        }

    def get_dead_letter_report(
        self,
        region: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        query = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.PERMANENT_FAILED
        )

        if region:
            query = query.filter(CompensationQueue.region == region)

        items = query.order_by(CompensationQueue.last_failed_at.desc()).limit(limit).all()

        return {
            "total": query.count(),
            "items": [
                {
                    "id": item.id,
                    "queue_key": item.queue_key,
                    "appointment_no": item.appointment_no,
                    "region": item.region,
                    "retry_count": item.retry_count,
                    "last_error": item.last_error,
                    "last_failed_at": item.last_failed_at,
                    "raw_data_sources": item.raw_data_sources,
                }
                for item in items
            ],
        }

    def get_manual_pending_report(
        self,
        region: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        query = self.db.query(CompensationQueue).filter(
            CompensationQueue.status == QueueStatus.WAITING_MANUAL
        )

        if region:
            query = query.filter(CompensationQueue.region == region)

        items = query.order_by(CompensationQueue.manual_taken_at.desc()).limit(limit).all()

        return {
            "total": query.count(),
            "items": [
                {
                    "id": item.id,
                    "queue_key": item.queue_key,
                    "appointment_no": item.appointment_no,
                    "region": item.region,
                    "manual_taken_by": item.manual_taken_by,
                    "manual_taken_at": item.manual_taken_at,
                    "manual_note": item.manual_note,
                    "last_error": item.last_error,
                }
                for item in items
            ],
        }

    def get_recovery_backlog_report(self) -> Dict[str, Any]:
        now = datetime.utcnow()
        overdue_retry = (
            self.db.query(CompensationQueue)
            .filter(
                CompensationQueue.status == QueueStatus.WAITING_RETRY,
                CompensationQueue.next_retry_at < now,
            )
            .count()
        )

        return {
            "overdue_retry_count": overdue_retry,
            "waiting_retry_count": self.db.query(CompensationQueue).filter(
                CompensationQueue.status == QueueStatus.WAITING_RETRY
            ).count(),
            "processing_count": self.db.query(CompensationQueue).filter(
                CompensationQueue.status == QueueStatus.PROCESSING
            ).count(),
            "pending_count": self.db.query(CompensationQueue).filter(
                CompensationQueue.status == QueueStatus.PENDING
            ).count(),
        }

    def get_compensation_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        region: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = self.db.query(
            CompensationQueue.region,
            func.count(CompensationQueue.id).label("total_completed"),
            func.sum(CompensationQueue.compensation_amount).label("total_amount"),
        ).filter(CompensationQueue.status == QueueStatus.COMPLETED)

        if start_date:
            query = query.filter(CompensationQueue.compensated_at >= start_date)
        if end_date:
            query = query.filter(CompensationQueue.compensated_at <= end_date)
        if region:
            query = query.filter(CompensationQueue.region == region)

        results = query.group_by(CompensationQueue.region).all()

        return {
            "summary_by_region": [
                {
                    "region": r.region,
                    "total_completed": r.total_completed,
                    "total_amount": r.total_amount or 0,
                }
                for r in results
            ],
            "grand_total": {
                "completed_count": sum(r.total_completed for r in results),
                "total_amount": sum(r.total_amount or 0 for r in results),
            },
        }

    def export_queue_data(
        self,
        status: Optional[QueueStatus] = None,
        region: Optional[str] = None,
        include_history: bool = False,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(CompensationQueue)

        if status:
            query = query.filter(CompensationQueue.status == status)
        if region:
            query = query.filter(CompensationQueue.region == region)

        items = query.order_by(CompensationQueue.created_at.desc()).all()

        export_data = []
        for item in items:
            row = {
                "队列ID": item.id,
                "队列Key": item.queue_key,
                "预约单号": item.appointment_no,
                "订单号": item.order_no,
                "用户ID": item.user_id,
                "师傅ID": item.technician_id,
                "区域": item.region,
                "当前状态": item.status.value if item.status else "",
                "是否改约": "是" if item.is_rescheduled else "否",
                "是否二次上门": "是" if item.is_second_visit else "否",
                "是否差评": "是" if item.has_negative_review else "否",
                "差评原因": item.review_reason or "",
                "补偿金额": item.compensation_amount,
                "补偿原因": item.compensation_reason or "",
                "重试次数": item.retry_count,
                "最大重试次数": item.max_retry_times,
                "失败分类": item.fail_category.value if item.fail_category else "",
                "最后错误": item.last_error or "",
                "最后失败时间": item.last_failed_at.isoformat() if item.last_failed_at else "",
                "人工接管人": item.manual_taken_by or "",
                "人工接管时间": item.manual_taken_at.isoformat() if item.manual_taken_at else "",
                "补偿完成时间": item.compensated_at.isoformat() if item.compensated_at else "",
                "关闭时间": item.closed_at.isoformat() if item.closed_at else "",
                "关闭原因": item.close_reason or "",
                "数据来源": ",".join(item.raw_data_sources) if item.raw_data_sources else "",
                "创建时间": item.created_at.isoformat(),
                "更新时间": item.updated_at.isoformat(),
            }

            if include_history:
                history = self.db.query(StatusHistory).filter(StatusHistory.queue_id == item.id).all()
                row["状态历史"] = " | ".join(
                    [f"{h.changed_at.isoformat()}:{h.from_status.value if h.from_status else 'None'}->{h.to_status.value}({h.change_reason or ''})" for h in history]
                )

            export_data.append(row)

        return export_data

    def get_raw_data_audit(self, appointment_no: str) -> Dict[str, Any]:
        records = (
            self.db.query(RawDataRecord)
            .filter(RawDataRecord.appointment_no == appointment_no)
            .order_by(RawDataRecord.source_type, RawDataRecord.original_row_number)
            .all()
        )

        return {
            "appointment_no": appointment_no,
            "record_count": len(records),
            "records": [
                {
                    "id": r.id,
                    "source_type": r.source_type.value,
                    "source_file": r.source_file,
                    "original_row_number": r.original_row_number,
                    "original_data": r.original_data,
                    "parsed_data": r.parsed_data,
                }
                for r in records
            ],
        }
