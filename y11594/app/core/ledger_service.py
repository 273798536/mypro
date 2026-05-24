from typing import Dict, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import json

from app.models.ledger import LedgerRecord, StatusHistory
from app.models.source_data import WaveOrder, PickDifference, ReviewScan, RefundFlow, StockSplitRecord, InventoryDifference
from app.models.user import User
from app.core.dirty_record_detector import DirtyRecordDetector


class LedgerService:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.detector = DirtyRecordDetector(db)

    def generate_ledger_no(self) -> str:
        today = datetime.utcnow().strftime("%Y%m%d")
        count = self.db.query(LedgerRecord).filter(
            LedgerRecord.ledger_no.like(f"LD{today}%")
        ).count() + 1
        return f"LD{today}{count:04d}"

    def create_ledger_from_sources(
        self,
        wave_no: str,
        sku_code: str,
        auto_detect: bool = True
    ) -> LedgerRecord:
        wave = self.db.query(WaveOrder).filter(WaveOrder.wave_no == wave_no).first()
        if not wave:
            raise ValueError(f"波次单不存在: {wave_no}")

        pick_diff = self.db.query(PickDifference).filter(
            PickDifference.wave_no == wave_no,
            PickDifference.sku_code == sku_code
        ).first()

        review_scan = self.db.query(ReviewScan).filter(
            ReviewScan.wave_no == wave_no,
            ReviewScan.sku_code == sku_code
        ).first()

        ledger = LedgerRecord(
            ledger_no=self.generate_ledger_no(),
            wave_id=wave.id,
            wave_no=wave_no,
            wave_date=wave.wave_date,
            pick_zone=wave.pick_zone,
            picker_name=wave.picker_name,
            sku_code=sku_code,
            created_by=self.user.username
        )

        if pick_diff:
            ledger.pick_diff_id = pick_diff.id
            ledger.sku_name = pick_diff.sku_name
            ledger.pick_qty = pick_diff.pick_qty
            ledger.actual_pick_qty = pick_diff.actual_pick_qty
            ledger.diff_qty = pick_diff.diff_qty
            ledger.diff_type = pick_diff.diff_type
            ledger.diff_reason = pick_diff.diff_reason
            ledger.order_no = pick_diff.order_no

        if review_scan:
            ledger.review_scan_id = review_scan.id
            ledger.reviewer_name = review_scan.reviewer_name
            ledger.review_qty = review_scan.review_qty
            if not ledger.sku_name:
                ledger.sku_name = review_scan.sku_name

        refund = self.db.query(RefundFlow).filter(
            RefundFlow.wave_no == wave_no,
            RefundFlow.sku_code == sku_code
        ).first()
        if refund:
            ledger.related_refund_no = refund.refund_no

        inventory_diff = self.db.query(InventoryDifference).filter(
            InventoryDifference.related_wave_no == wave_no,
            InventoryDifference.sku_code == sku_code
        ).first()
        if inventory_diff:
            ledger.related_inventory_check_no = inventory_diff.check_no

        split_record = self.db.query(StockSplitRecord).filter(
            StockSplitRecord.original_wave_no == wave_no,
            StockSplitRecord.sku_code == sku_code
        ).first()
        if split_record:
            ledger.related_split_no = split_record.split_no
            ledger.original_performance = split_record.original_performance
            ledger.performance_impact = split_record.performance_deviation
            ledger.original_inventory = split_record.original_inventory_occupied
            ledger.inventory_impact = split_record.inventory_deviation

        ledger.data_sources = {
            "wave_order": wave_no,
            "pick_difference": pick_diff.diff_no if pick_diff else None,
            "review_scan": review_scan.scan_no if review_scan else None,
            "refund_flow": refund.refund_no if refund else None,
            "stock_split": split_record.split_no if split_record else None,
            "inventory_check": inventory_diff.check_no if inventory_diff else None
        }

        ledger.trace_info = self._build_trace_info(wave, pick_diff, review_scan, split_record)

        self.db.add(ledger)
        self.db.commit()
        self.db.refresh(ledger)

        if auto_detect:
            issues = self.detector.detect_all(ledger)
            self.detector.save_dirty_records(ledger, issues)

        return ledger

    def _build_trace_info(
        self,
        wave: WaveOrder,
        pick_diff: Optional[PickDifference],
        review_scan: Optional[ReviewScan],
        split_record: Optional[StockSplitRecord]
    ) -> Dict:
        trace = {
            "wave_performance": {
                "original": float(wave.performance_score) if wave.performance_score else None,
                "source": "wave_order"
            },
            "inventory_occupied": {
                "original": float(wave.inventory_occupied) if wave.inventory_occupied else None,
                "source": "wave_order"
            }
        }

        if split_record:
            trace["performance_deformation"] = {
                "before": float(split_record.original_performance) if split_record.original_performance else None,
                "after": float(split_record.new_performance) if split_record.new_performance else None,
                "deviation": float(split_record.performance_deviation) if split_record.performance_deviation else None,
                "reason": split_record.split_reason,
                "source": "stock_split"
            }
            trace["inventory_deformation"] = {
                "before": float(split_record.original_inventory_occupied) if split_record.original_inventory_occupied else None,
                "after": float(split_record.new_inventory_occupied) if split_record.new_inventory_occupied else None,
                "deviation": float(split_record.inventory_deviation) if split_record.inventory_deviation else None,
                "source": "stock_split"
            }

        return trace

    def update_ledger(self, ledger_id: int, update_data: Dict) -> LedgerRecord:
        ledger = self.db.query(LedgerRecord).filter(LedgerRecord.id == ledger_id).first()
        if not ledger:
            raise ValueError("台账记录不存在")

        if ledger.status not in ["draft", "rejected"]:
            raise ValueError("只有草稿或驳回状态的记录可以编辑")

        changed_fields = {}
        for key, value in update_data.items():
            if hasattr(ledger, key):
                old_value = getattr(ledger, key)
                if old_value != value:
                    changed_fields[key] = {"old": str(old_value), "new": str(value)}
                    setattr(ledger, key, value)

        ledger.updated_by = self.user.username
        ledger.version += 1

        if changed_fields:
            issues = self.detector.detect_all(ledger)
            if issues:
                self.detector.save_dirty_records(ledger, issues)

        self.db.commit()
        self.db.refresh(ledger)

        return ledger

    def get_ledger_with_trace(self, ledger_id: int) -> Dict:
        ledger = self.db.query(LedgerRecord).filter(LedgerRecord.id == ledger_id).first()
        if not ledger:
            raise ValueError("台账记录不存在")

        result = {
            "ledger": ledger,
            "status_histories": self.db.query(StatusHistory).filter(
                StatusHistory.ledger_id == ledger_id
            ).order_by(StatusHistory.operate_time).all(),
            "dirty_records": [d for d in ledger.dirty_records],
            "comments": [c for c in ledger.comments],
            "trace_analysis": self._analyze_trace(ledger)
        }

        return result

    def _analyze_trace(self, ledger: LedgerRecord) -> Dict:
        analysis = {
            "performance_impact": {
                "has_impact": ledger.performance_impact is not None and ledger.performance_impact != 0,
                "impact_value": float(ledger.performance_impact) if ledger.performance_impact else 0,
                "original_value": float(ledger.original_performance) if ledger.original_performance else None,
                "source": []
            },
            "inventory_impact": {
                "has_impact": ledger.inventory_impact is not None and ledger.inventory_impact != 0,
                "impact_value": float(ledger.inventory_impact) if ledger.inventory_impact else 0,
                "original_value": float(ledger.original_inventory) if ledger.original_inventory else None,
                "source": []
            },
            "data_sources": ledger.data_sources if ledger.data_sources else {},
            "deformation_detected": False
        }

        if ledger.trace_info:
            if "performance_deformation" in ledger.trace_info:
                analysis["performance_impact"]["source"].append("缺货拆单")
                analysis["deformation_detected"] = True
            if "inventory_deformation" in ledger.trace_info:
                analysis["inventory_impact"]["source"].append("缺货拆单")
                analysis["deformation_detected"] = True

        if ledger.related_refund_no:
            analysis["performance_impact"]["source"].append("退款流水")
        if ledger.related_inventory_check_no:
            analysis["inventory_impact"]["source"].append("盘点差异")

        return analysis

    def manual_import(
        self,
        records: List[Dict],
        check_duplicate: bool = True
    ) -> Dict:
        results = {
            "success": [],
            "failed": [],
            "duplicates": [],
            "dirty_count": 0
        }

        for record in records:
            try:
                wave_no = record.get("wave_no")
                sku_code = record.get("sku_code")

                if check_duplicate:
                    existing = self.db.query(LedgerRecord).filter(
                        LedgerRecord.wave_no == wave_no,
                        LedgerRecord.sku_code == sku_code,
                        LedgerRecord.is_deleted == False
                    ).first()
                    if existing:
                        results["duplicates"].append({
                            "wave_no": wave_no,
                            "sku_code": sku_code,
                            "existing_ledger_no": existing.ledger_no
                        })
                        continue

                if wave_no and sku_code:
                    ledger = self.create_ledger_from_sources(wave_no, sku_code, auto_detect=True)
                    
                    if ledger.is_dirty:
                        results["dirty_count"] += 1
                    
                    results["success"].append({
                        "ledger_no": ledger.ledger_no,
                        "wave_no": wave_no,
                        "sku_code": sku_code,
                        "is_dirty": ledger.is_dirty
                    })
                else:
                    results["failed"].append({
                        "record": record,
                        "reason": "缺少wave_no或sku_code"
                    })
            except Exception as e:
                results["failed"].append({
                    "record": record,
                    "reason": str(e)
                })

        return results
