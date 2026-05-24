import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from ..models import WorkOrder, Clue, RetryRecord, CompensationRecord, OperationLog
from ..config import EXPORT_DIR


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def _work_order_to_dict(self, wo: WorkOrder) -> Dict[str, Any]:
        return {
            "id": wo.id,
            "order_no": wo.order_no,
            "location": wo.location,
            "status": wo.status.value,
            "retry_count": wo.retry_count,
            "compensated_amount": wo.compensated_amount,
            "created_at": wo.created_at.isoformat() if wo.created_at else None,
            "closed_at": wo.closed_at.isoformat() if wo.closed_at else None
        }

    def _clue_to_dict(self, clue: Clue) -> Dict[str, Any]:
        return {
            "id": clue.id,
            "work_order_id": clue.work_order_id,
            "source_type": clue.source_type.value,
            "source_id": clue.source_id,
            "location": clue.location,
            "occurred_at": clue.occurred_at.isoformat() if clue.occurred_at else None,
            "content": json.dumps(clue.content, ensure_ascii=False),
            "is_dirty": clue.is_dirty,
            "dirty_type": clue.dirty_type.value if clue.dirty_type else None,
            "dirty_reason": clue.dirty_reason
        }

    def export_work_orders_json(self, filepath: str = None) -> str:
        work_orders = self.db.query(WorkOrder).all()
        data = [self._work_order_to_dict(wo) for wo in work_orders]
        
        if not filepath:
            filepath = EXPORT_DIR / f"work_orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return str(filepath)

    def export_work_orders_csv(self, filepath: str = None) -> str:
        work_orders = self.db.query(WorkOrder).all()
        
        if not filepath:
            filepath = EXPORT_DIR / f"work_orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        fieldnames = ["id", "order_no", "location", "status", "retry_count",
                      "compensated_amount", "created_at", "closed_at"]
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for wo in work_orders:
                writer.writerow(self._work_order_to_dict(wo))
        
        return str(filepath)

    def export_work_orders_excel(self, filepath: str = None) -> str:
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for Excel export")
        
        if not filepath:
            filepath = EXPORT_DIR / f"work_orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        work_orders = self.db.query(WorkOrder).all()
        wos_data = [self._work_order_to_dict(wo) for wo in work_orders]
        
        clues = self.db.query(Clue).all()
        clues_data = [self._clue_to_dict(c) for c in clues]
        
        retries = self.db.query(RetryRecord).all()
        retries_data = [
            {
                "id": r.id,
                "work_order_id": r.work_order_id,
                "retry_no": r.retry_no,
                "category": r.category.value if r.category else None,
                "error_message": r.error_message,
                "retry_succeeded": r.retry_succeeded,
                "executed_at": r.executed_at.isoformat() if r.executed_at else None
            }
            for r in retries
        ]
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            pd.DataFrame(wos_data).to_excel(writer, sheet_name='工单', index=False)
            pd.DataFrame(clues_data).to_excel(writer, sheet_name='线索', index=False)
            pd.DataFrame(retries_data).to_excel(writer, sheet_name='重试记录', index=False)
        
        return str(filepath)

    def export_single_work_order(self, work_order_id: int, format: str = 'json') -> str:
        wo = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not wo:
            raise ValueError("工单不存在")
        
        wo_data = self._work_order_to_dict(wo)
        
        clues = self.db.query(Clue).filter(Clue.work_order_id == work_order_id).all()
        wo_data["clues"] = [self._clue_to_dict(c) for c in clues]
        
        retries = self.db.query(RetryRecord).filter(RetryRecord.work_order_id == work_order_id).all()
        wo_data["retry_records"] = [
            {
                "id": r.id,
                "retry_no": r.retry_no,
                "category": r.category.value if r.category else None,
                "succeeded": r.retry_succeeded,
                "executed_at": r.executed_at.isoformat() if r.executed_at else None
            }
            for r in retries
        ]
        
        compensations = self.db.query(CompensationRecord).filter(
            CompensationRecord.work_order_id == work_order_id
        ).all()
        wo_data["compensations"] = [
            {
                "id": c.id,
                "amount": c.amount,
                "reason": c.reason,
                "voucher_no": c.voucher_no,
                "accounted_at": c.accounted_at.isoformat() if c.accounted_at else None
            }
            for c in compensations
        ]
        
        logs = self.db.query(OperationLog).filter(OperationLog.work_order_id == work_order_id).all()
        wo_data["operation_logs"] = [
            {
                "operation": l.operation,
                "operator": l.operator,
                "operated_at": l.operated_at.isoformat() if l.operated_at else None,
                "remarks": l.remarks
            }
            for l in logs
        ]
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format == 'json':
            filepath = EXPORT_DIR / f"work_order_{work_order_id}_{timestamp}.json"
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(wo_data, f, ensure_ascii=False, indent=2)
        elif format == 'csv':
            filepath = EXPORT_DIR / f"work_order_{work_order_id}_{timestamp}.csv"
            flat_data = {k: v for k, v in wo_data.items() if not isinstance(v, list)}
            import csv
            with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=flat_data.keys())
                writer.writeheader()
                writer.writerow(flat_data)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        return str(filepath)

    def list_exports(self) -> List[Dict[str, Any]]:
        files = []
        for f in EXPORT_DIR.glob("*"):
            if f.is_file():
                files.append({
                    "filename": f.name,
                    "size": f.stat().st_size,
                    "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "path": str(f)
                })
        return sorted(files, key=lambda x: x["created_at"], reverse=True)
