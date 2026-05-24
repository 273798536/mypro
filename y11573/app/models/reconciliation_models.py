from typing import Optional
from app.models.base_model import BaseModel
from datetime import datetime


class ReconciliationRecord(BaseModel):
    table_name = "reconciliation_records"
    primary_key = "id"

    @classmethod
    def get_by_date(cls, reconciliation_date: str) -> Optional['ReconciliationRecord']:
        results = cls.query("reconciliation_date = ?", (reconciliation_date,), limit=1)
        return results[0] if results else None

    @classmethod
    def create_record(cls, reconciliation_date: str = None,
                      ticket_count: int = 0, compensation_total: float = 0,
                      sla_violation_count: int = 0, exception_count: int = 0,
                      reconciled_by: str = None, remark: str = None) -> 'ReconciliationRecord':
        date_str = reconciliation_date or datetime.now().strftime('%Y-%m-%d')
        existing = cls.get_by_date(date_str)
        if existing:
            cls.update(
                existing.id,
                ticket_count=ticket_count,
                compensation_total=compensation_total,
                sla_violation_count=sla_violation_count,
                exception_count=exception_count,
                reconciliation_status='completed',
                reconciled_by=reconciled_by,
                reconciled_at=datetime.now().isoformat(),
                remark=remark
            )
            return cls.get_by_id(existing.id)
        
        return cls.create(
            reconciliation_date=date_str,
            ticket_count=ticket_count,
            compensation_total=compensation_total,
            sla_violation_count=sla_violation_count,
            exception_count=exception_count,
            reconciliation_status='completed',
            reconciled_by=reconciled_by,
            reconciled_at=datetime.now().isoformat(),
            remark=remark
        )

    @classmethod
    def get_pending_records(cls):
        return cls.query("reconciliation_status = 'pending'", order_by="reconciliation_date DESC")
