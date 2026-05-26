from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.ledger import LedgerRecord, StatusHistory, DirtyRecord
from app.models.user import User


class ManagerViewService:
    def __init__(self, db: Session):
        self.db = db

    def get_role_view_overview(self, start_date: datetime = None, end_date: datetime = None) -> Dict:
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        base_query = self.db.query(LedgerRecord).filter(
            LedgerRecord.created_at >= start_date,
            LedgerRecord.created_at <= end_date,
            LedgerRecord.is_deleted == False
        )

        total_records = base_query.count()
        status_stats = base_query.with_entities(
            LedgerRecord.status,
            func.count(LedgerRecord.id)
        ).group_by(LedgerRecord.status).all()

        dirty_stats = base_query.with_entities(
            LedgerRecord.is_dirty,
            func.count(LedgerRecord.id)
        ).group_by(LedgerRecord.is_dirty).all()

        role_stats = {
            "entry": {
                "created_count": base_query.filter(LedgerRecord.created_by.in_(
                    self.db.query(User.username).filter(User.role == "entry")
                )).count()
            },
            "reviewer": {
                "reviewed_count": self.db.query(StatusHistory).filter(
                    StatusHistory.to_status.in_(["confirmed", "audited", "rejected"]),
                    StatusHistory.operate_time >= start_date,
                    StatusHistory.operate_time <= end_date
                ).join(User, StatusHistory.operator_id == User.id).filter(
                    User.role == "reviewer"
                ).count()
            },
            "supervisor": {
                "audited_count": self.db.query(StatusHistory).filter(
                    StatusHistory.to_status == "audited",
                    StatusHistory.operate_time >= start_date,
                    StatusHistory.operate_time <= end_date
                ).join(User, StatusHistory.operator_id == User.id).filter(
                    User.role == "supervisor"
                ).count()
            }
        }

        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "total_records": total_records,
            "status_distribution": {s: c for s, c in status_stats},
            "dirty_data_stats": {
                "dirty_count": sum(c for d, c in dirty_stats if d),
                "clean_count": sum(c for d, c in dirty_stats if not d),
                "dirty_rate": (sum(c for d, c in dirty_stats if d) / total_records * 100) if total_records > 0 else 0
            },
            "role_activity": role_stats
        }

    def get_change_reason_analysis(self, start_date: datetime = None, end_date: datetime = None) -> Dict:
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        histories = self.db.query(StatusHistory).filter(
            StatusHistory.operate_time >= start_date,
            StatusHistory.operate_time <= end_date,
            StatusHistory.reason.isnot(None)
        ).all()

        reason_counts = {}
        reject_reasons = {}
        for h in histories:
            if h.reason:
                reason_counts[h.reason] = reason_counts.get(h.reason, 0) + 1
                if h.to_status == "rejected":
                    reject_reasons[h.reason] = reject_reasons.get(h.reason, 0) + 1

        top_reasons = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_reject_reasons = sorted(reject_reasons.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "total_changes": len(histories),
            "top_change_reasons": [{"reason": r, "count": c} for r, c in top_reasons],
            "top_reject_reasons": [{"reason": r, "count": c} for r, c in top_reject_reasons],
            "reject_rate": (sum(reject_reasons.values()) / len(histories) * 100) if len(histories) > 0 else 0
        }

    def get_sensitive_field_handling(self, start_date: datetime = None, end_date: datetime = None) -> Dict:
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        export_count = self.db.query(StatusHistory).filter(
            StatusHistory.to_status == "exported",
            StatusHistory.operate_time >= start_date,
            StatusHistory.operate_time <= end_date
        ).count()

        dirty_records = self.db.query(DirtyRecord).filter(
            DirtyRecord.created_at >= start_date,
            DirtyRecord.created_at <= end_date
        ).all()

        dirty_type_stats = {}
        for d in dirty_records:
            dirty_type_stats[d.dirty_type] = dirty_type_stats.get(d.dirty_type, 0) + 1

        resolved_rate = (
            sum(1 for d in dirty_records if d.is_resolved) / len(dirty_records) * 100
            if dirty_records else 0
        )

        return {
            "export_count": export_count,
            "dirty_record_total": len(dirty_records),
            "dirty_type_distribution": dirty_type_stats,
            "resolved_rate": resolved_rate,
            "unresolved_count": sum(1 for d in dirty_records if not d.is_resolved)
        }

    def get_picker_performance_ranking(self, start_date: datetime = None, end_date: datetime = None, top_n: int = 10) -> Dict:
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        picker_stats = self.db.query(
            LedgerRecord.picker_name,
            func.count(LedgerRecord.id).label('total_records'),
            func.sum(case((LedgerRecord.is_dirty == True, 1), else_=0)).label('dirty_count'),
            func.avg(func.coalesce(LedgerRecord.performance_impact, 0)).label('avg_performance_impact')
        ).filter(
            LedgerRecord.created_at >= start_date,
            LedgerRecord.created_at <= end_date,
            LedgerRecord.is_deleted == False,
            LedgerRecord.picker_name.isnot(None)
        ).group_by(LedgerRecord.picker_name).all()

        ranking = []
        for ps in picker_stats:
            dirty_rate = (ps.dirty_count / ps.total_records * 100) if ps.total_records > 0 else 0
            ranking.append({
                "picker_name": ps.picker_name,
                "total_records": ps.total_records,
                "dirty_count": ps.dirty_count,
                "dirty_rate": dirty_rate,
                "avg_performance_impact": float(ps.avg_performance_impact) if ps.avg_performance_impact else 0
            })

        ranking.sort(key=lambda x: x["dirty_rate"])
        
        return {
            "ranking": ranking[:top_n],
            "total_pickers": len(ranking)
        }

    def get_full_manager_dashboard(self, start_date: datetime = None, end_date: datetime = None) -> Dict:
        return {
            "overview": self.get_role_view_overview(start_date, end_date),
            "change_reason_analysis": self.get_change_reason_analysis(start_date, end_date),
            "sensitive_field_handling": self.get_sensitive_field_handling(start_date, end_date),
            "picker_ranking": self.get_picker_performance_ranking(start_date, end_date)
        }
