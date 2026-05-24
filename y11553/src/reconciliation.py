import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .repository import DataRepository
from .models import (
    ReconciliationResult,
    InventoryRecord,
    ReplenishmentPhoto,
    RefundRecord,
)


class ReconciliationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DataRepository(db)

    def reconcile_cabinet(self, cabinet_id: str) -> List[ReconciliationResult]:
        results = []

        inventory_map = self._get_latest_inventory(cabinet_id)
        expected_map = self._calculate_expected_inventory(cabinet_id)

        all_cells = set(inventory_map.keys()) | set(expected_map.keys())

        for cell_id in all_cells:
            inv = inventory_map.get(cell_id)
            exp = expected_map.get(cell_id)

            actual_qty = inv.quantity if inv else 0
            expected_qty = exp.get("quantity", 0) if exp else 0
            difference = actual_qty - expected_qty

            is_consistent = difference == 0

            issue_type = None
            description = None

            if not is_consistent:
                if difference > 0:
                    issue_type = "库存溢出"
                    description = f"实际库存比预期多 {difference} 件"
                else:
                    issue_type = "库存短缺"
                    description = f"实际库存比预期少 {abs(difference)} 件"

                if inv and inv.processing_reason:
                    description += f" (备注: {inv.processing_reason})"

            result = ReconciliationResult(
                reconciliation_id=f"recon_{uuid.uuid4().hex[:16]}",
                cabinet_id=cabinet_id,
                cell_id=cell_id,
                sku_id=inv.sku_id if inv else (exp.get("sku_id") if exp else ""),
                expected_quantity=expected_qty,
                actual_quantity=actual_qty,
                difference=difference,
                is_consistent=is_consistent,
                issue_type=issue_type,
                description=description,
                report_time=datetime.utcnow(),
            )
            self.db.add(result)
            results.append(result)

        self.db.commit()
        return results

    def _get_latest_inventory(self, cabinet_id: str) -> Dict[str, InventoryRecord]:
        subquery = (
            self.db.query(
                InventoryRecord.cell_id,
                InventoryRecord.record_time,
            )
            .filter(InventoryRecord.cabinet_id == cabinet_id)
            .group_by(InventoryRecord.cell_id)
            .subquery()
        )

        records = (
            self.db.query(InventoryRecord)
            .filter(
                InventoryRecord.cabinet_id == cabinet_id,
            )
            .all()
        )

        latest_map = {}
        for r in records:
            if r.cell_id not in latest_map or r.record_time > latest_map[r.cell_id].record_time:
                latest_map[r.cell_id] = r

        return latest_map

    def _calculate_expected_inventory(self, cabinet_id: str) -> Dict[str, Dict[str, Any]]:
        expected_map = {}

        replenishments = (
            self.db.query(ReplenishmentPhoto)
            .filter(ReplenishmentPhoto.cabinet_id == cabinet_id)
            .all()
        )
        for r in replenishments:
            key = r.cell_id
            if key not in expected_map:
                expected_map[key] = {"quantity": 0, "sku_id": ""}
            expected_map[key]["quantity"] += r.replenishment_quantity

        refunds = (
            self.db.query(RefundRecord)
            .filter(RefundRecord.cabinet_id == cabinet_id)
            .all()
        )
        for r in refunds:
            key = r.sku_id
            if key not in expected_map:
                expected_map[key] = {"quantity": 0, "sku_id": r.sku_id}

        return expected_map

    def get_reconciliation_history(
        self,
        cabinet_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ReconciliationResult]:
        query = self.db.query(ReconciliationResult)
        if cabinet_id:
            query = query.filter(ReconciliationResult.cabinet_id == cabinet_id)
        return query.order_by(ReconciliationResult.report_time.desc()).offset(skip).limit(limit).all()

    def get_reconciliation_summary(self, cabinet_id: Optional[str] = None) -> Dict[str, Any]:
        query = self.db.query(ReconciliationResult)
        if cabinet_id:
            query = query.filter(ReconciliationResult.cabinet_id == cabinet_id)

        results = query.all()
        total = len(results)
        consistent = sum(1 for r in results if r.is_consistent)
        inconsistent = total - consistent

        issues = {}
        for r in results:
            if r.issue_type:
                issues[r.issue_type] = issues.get(r.issue_type, 0) + 1

        return {
            "total_cells": total,
            "consistent_count": consistent,
            "inconsistent_count": inconsistent,
            "consistency_rate": consistent / total if total > 0 else 0,
            "issues_distribution": issues,
        }
