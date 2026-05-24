from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.models import ReceiptQueue, QueueStatus
from app.schemas import (
    DashboardStats, DashboardResponse,
    RetryCategoryStats, DirtyTypeStats, SourceStats
)


class DashboardService:
    @staticmethod
    def get_stats(db: Session) -> DashboardStats:
        total = db.query(ReceiptQueue).count()

        def count_by_status(status: str) -> int:
            return db.query(ReceiptQueue).filter(ReceiptQueue.status == status).count()

        return DashboardStats(
            total_queue=total,
            pending=count_by_status(QueueStatus.PENDING),
            processing=count_by_status(QueueStatus.PROCESSING),
            retrying=count_by_status(QueueStatus.RETRYING),
            manual_review=count_by_status(QueueStatus.MANUAL_REVIEW),
            compensated=count_by_status(QueueStatus.COMPENSATED),
            closed=count_by_status(QueueStatus.CLOSED),
            dead_letter=count_by_status(QueueStatus.DEAD_LETTER),
            dirty_records=db.query(ReceiptQueue).filter(ReceiptQueue.is_dirty == True).count()
        )

    @staticmethod
    def get_retry_category_stats(db: Session) -> List[RetryCategoryStats]:
        results = db.query(
            ReceiptQueue.retry_category,
            func.count(ReceiptQueue.id),
            func.sum(ReceiptQueue.amount)
        ).filter(
            ReceiptQueue.retry_category.isnot(None)
        ).group_by(
            ReceiptQueue.retry_category
        ).all()

        return [
            RetryCategoryStats(
                category=r[0] or "unknown",
                count=r[1],
                amount=r[2] or 0
            )
            for r in results
        ]

    @staticmethod
    def get_dirty_type_stats(db: Session) -> List[DirtyTypeStats]:
        results = db.query(
            ReceiptQueue.dirty_type,
            func.count(ReceiptQueue.id)
        ).filter(
            ReceiptQueue.is_dirty == True
        ).group_by(
            ReceiptQueue.dirty_type
        ).all()

        return [
            DirtyTypeStats(
                dirty_type=r[0] or "unknown",
                count=r[1]
            )
            for r in results
        ]

    @staticmethod
    def get_source_stats(db: Session) -> List[SourceStats]:
        results = db.query(
            ReceiptQueue.source_type,
            func.count(ReceiptQueue.id),
            func.sum(ReceiptQueue.amount)
        ).group_by(
            ReceiptQueue.source_type
        ).all()

        return [
            SourceStats(
                source_type=r[0],
                count=r[1],
                amount=r[2] or 0
            )
            for r in results
        ]

    @classmethod
    def get_dashboard(cls, db: Session) -> DashboardResponse:
        return DashboardResponse(
            stats=cls.get_stats(db),
            retry_categories=cls.get_retry_category_stats(db),
            dirty_types=cls.get_dirty_type_stats(db),
            sources=cls.get_source_stats(db)
        )
