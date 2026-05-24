from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from collections import defaultdict

from ..models import (
    WorkOrder, WorkOrderStatus, Clue, SourceType,
    RetryRecord, RetryCategory, DeadLetter, CompensationRecord
)


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_retry_category_summary(self, days: int = 7) -> Dict[str, Any]:
        cutoff = datetime.now() - timedelta(days=days)
        
        retries = self.db.query(RetryRecord).filter(
            RetryRecord.executed_at >= cutoff
        ).all()
        
        summary = {
            "period_days": days,
            "total_retries": len(retries),
            "success_count": sum(1 for r in retries if r.retry_succeeded),
            "failure_count": sum(1 for r in retries if not r.retry_succeeded),
            "by_category": defaultdict(lambda: {"total": 0, "success": 0, "failure": 0})
        }
        
        for retry in retries:
            cat = retry.category.value if retry.category else "unknown"
            summary["by_category"][cat]["total"] += 1
            if retry.retry_succeeded:
                summary["by_category"][cat]["success"] += 1
            else:
                summary["by_category"][cat]["failure"] += 1
        
        summary["by_category"] = dict(summary["by_category"])
        summary["success_rate"] = (
            summary["success_count"] / summary["total_retries"] * 100
            if summary["total_retries"] > 0 else 0
        )
        
        return summary

    def get_dead_letter_summary(self) -> Dict[str, Any]:
        dead_letters = self.db.query(DeadLetter).all()
        
        summary = {
            "total_dead_letters": len(dead_letters),
            "resolved_count": sum(1 for d in dead_letters if d.resolved),
            "unresolved_count": sum(1 for d in dead_letters if not d.resolved),
            "by_category": defaultdict(int),
            "unresolved_list": []
        }
        
        for dl in dead_letters:
            cat = dl.category.value if dl.category else "unknown"
            summary["by_category"][cat] += 1
            
            if not dl.resolved:
                summary["unresolved_list"].append({
                    "id": dl.id,
                    "work_order_id": dl.work_order_id,
                    "order_no": dl.order_no,
                    "location": dl.location,
                    "last_error": dl.last_error,
                    "category": cat,
                    "retry_count": dl.retry_count,
                    "arrived_at": dl.arrived_at.isoformat()
                })
        
        summary["by_category"] = dict(summary["by_category"])
        return summary

    def get_recovery_summary(self, days: int = 7) -> Dict[str, Any]:
        cutoff = datetime.now() - timedelta(days=days)
        
        resolved_dl = self.db.query(DeadLetter).filter(
            DeadLetter.resolved == True,
            DeadLetter.resolved_at >= cutoff
        ).all()
        
        recovered_wo = self.db.query(WorkOrder).filter(
            WorkOrder.status == WorkOrderStatus.PROCESSING,
            WorkOrder.updated_at >= cutoff
        ).all()
        
        return {
            "period_days": days,
            "dead_letters_resolved": len(resolved_dl),
            "work_orders_recovered": len(recovered_wo),
            "resolved_dead_letters": [
                {
                    "id": dl.id,
                    "order_no": dl.order_no,
                    "resolved_at": dl.resolved_at.isoformat() if dl.resolved_at else None,
                    "resolved_by": dl.resolved_by,
                    "notes": dl.resolution_notes
                }
                for dl in resolved_dl[:20]
            ]
        }

    def get_full_report(self) -> Dict[str, Any]:
        return {
            "retry_category_summary": self.get_retry_category_summary(),
            "dead_letter_summary": self.get_dead_letter_summary(),
            "recovery_summary": self.get_recovery_summary(),
            "generated_at": datetime.now().isoformat()
        }

    def resolve_dead_letter(self, dead_letter_id: int, resolved_by: str,
                            notes: str, recover_work_order: bool = False) -> tuple[bool, str]:
        dl = self.db.query(DeadLetter).filter(DeadLetter.id == dead_letter_id).first()
        if not dl:
            return False, "死信记录不存在"
        
        dl.resolved = True
        dl.resolved_at = datetime.now()
        dl.resolved_by = resolved_by
        dl.resolution_notes = notes
        
        if recover_work_order:
            wo = self.db.query(WorkOrder).filter(WorkOrder.id == dl.work_order_id).first()
            if wo:
                wo.status = WorkOrderStatus.PENDING
                wo.retry_count = 0
                wo.next_retry_at = datetime.now()
        
        self.db.commit()
        return True, "已标记为已解决"

    def get_work_order_clue_chain(self, work_order_id: int) -> Dict[str, Any]:
        wo = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not wo:
            return {"error": "工单不存在"}
        
        clues = self.db.query(Clue).filter(
            Clue.work_order_id == work_order_id
        ).order_by(Clue.created_at).all()
        
        return {
            "work_order_id": wo.id,
            "order_no": wo.order_no,
            "location": wo.location,
            "status": wo.status.value,
            "clue_count": len(clues),
            "clues": [
                {
                    "id": c.id,
                    "source_type": c.source_type.value,
                    "source_id": c.source_id,
                    "occurred_at": c.occurred_at.isoformat() if c.occurred_at else None,
                    "is_dirty": c.is_dirty,
                    "dirty_type": c.dirty_type.value if c.dirty_type else None,
                    "created_at": c.created_at.isoformat()
                }
                for c in clues
            ]
        }
