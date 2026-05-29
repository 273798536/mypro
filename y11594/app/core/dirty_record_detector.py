from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import hashlib
import json

from app.models.ledger import LedgerRecord, DirtyRecord, DIRTY_RECORD_TYPES
from app.models.source_data import WaveOrder, PickDifference, ReviewScan, RefundFlow, StockSplitRecord, InventoryDifference


class DirtyRecordDetector:
    def __init__(self, db: Session):
        self.db = db
        self.issues = []

    def detect_all(self, ledger: LedgerRecord) -> List[Dict]:
        self.issues = []
        
        self._check_missing_fields(ledger)
        self._check_cross_day(ledger)
        self._check_name_consistency(ledger)
        self._check_diff_qty_consistency(ledger)
        self._check_amount_conflict(ledger)
        self._check_qty_conflict(ledger)
        self._check_duplicate(ledger)
        
        return self.issues

    def _check_missing_fields(self, ledger: LedgerRecord):
        required_fields = [
            "wave_no", "sku_code", "picker_name", "diff_qty", "diff_type"
        ]
        missing = []
        for field in required_fields:
            value = getattr(ledger, field, None)
            if value is None or value == "" or (isinstance(value, int) and value == 0 and field != "diff_qty"):
                missing.append(field)
        
        if missing:
            self.issues.append({
                "type": "missing_field",
                "field_name": ",".join(missing),
                "original_value": None,
                "current_value": None,
                "error_message": f"缺少必填字段: {', '.join(missing)}",
                "source_data": {"missing_fields": missing}
            })

    def _check_cross_day(self, ledger: LedgerRecord):
        if not ledger.wave_date:
            return
            
        wave_date = ledger.wave_date.date()
        today = datetime.utcnow().date()
        
        if abs((today - wave_date).days) > 1:
            self.issues.append({
                "type": "cross_day",
                "field_name": "wave_date",
                "original_value": str(ledger.wave_date),
                "current_value": str(ledger.wave_date),
                "error_message": f"跨日数据，波次日期与处理日期相差超过1天",
                "source_data": {
                    "wave_date": str(ledger.wave_date),
                    "process_date": str(today)
                }
            })

    def _check_name_consistency(self, ledger: LedgerRecord):
        if not ledger.wave_no:
            return
            
        wave = self.db.query(WaveOrder).filter(
            WaveOrder.wave_no == ledger.wave_no
        ).first()
        
        if wave and wave.picker_name and ledger.picker_name:
            if wave.picker_name != ledger.picker_name:
                self.issues.append({
                    "type": "name_changed",
                    "field_name": "picker_name",
                    "original_value": wave.picker_name,
                    "current_value": ledger.picker_name,
                    "error_message": f"拣货员姓名不一致: 波次单中是 {wave.picker_name}，台账中是 {ledger.picker_name}",
                    "source_data": {
                        "wave_picker": wave.picker_name,
                        "ledger_picker": ledger.picker_name
                    }
                })

    def _check_diff_qty_consistency(self, ledger: LedgerRecord):
        if not ledger.wave_no or not ledger.sku_code:
            return
            
        pick_diff = self.db.query(PickDifference).filter(
            PickDifference.wave_no == ledger.wave_no,
            PickDifference.sku_code == ledger.sku_code
        ).first()
        
        if pick_diff and pick_diff.diff_qty != ledger.diff_qty:
            sources = [
                {"source": "pick_diff", "field": "diff_qty", "value": pick_diff.diff_qty},
                {"source": "ledger", "field": "diff_qty", "value": ledger.diff_qty}
            ]
            self.issues.append({
                "type": "qty_conflict",
                "field_name": "diff_qty",
                "original_value": str(pick_diff.diff_qty),
                "current_value": str(ledger.diff_qty),
                "error_message": f"差异数量不一致: 拣货差异表中是 {pick_diff.diff_qty}，台账中是 {ledger.diff_qty}",
                "source_data": {"conflict_sources": sources}
            })

    def _check_amount_conflict(self, ledger: LedgerRecord):
        if not ledger.wave_no or not ledger.sku_code:
            return
            
        issues_found = False
        
        refund = self.db.query(RefundFlow).filter(
            RefundFlow.wave_no == ledger.wave_no,
            RefundFlow.sku_code == ledger.sku_code
        ).first()
        
        split_record = self.db.query(StockSplitRecord).filter(
            StockSplitRecord.original_wave_no == ledger.wave_no,
            StockSplitRecord.sku_code == ledger.sku_code
        ).first()
        
        inventory_diff = self.db.query(InventoryDifference).filter(
            InventoryDifference.related_wave_no == ledger.wave_no,
            InventoryDifference.sku_code == ledger.sku_code
        ).first()
        
        ledger_inv = float(ledger.inventory_impact or 0)
        ledger_perf = float(ledger.performance_impact or 0)

        if refund and refund.refund_amount is not None:
            refund_amt = float(refund.refund_amount)
            if ledger_inv == 0:
                self.issues.append({
                    "type": "amount_conflict",
                    "field_name": "inventory_impact",
                    "original_value": str(refund_amt),
                    "current_value": str(ledger_inv),
                    "error_message": f"退款金额 {refund_amt} 存在，但台账库存影响为 0，可能漏记",
                    "source_data": {
                        "refund_no": refund.refund_no,
                        "refund_amount": refund_amt,
                        "refund_type": refund.refund_type,
                        "ledger_inventory_impact": ledger_inv,
                        "conflict_type": "missing_ledger_value"
                    }
                })
                issues_found = True
            elif abs(ledger_inv - refund_amt) > max(abs(refund_amt) * 0.1, 1.0):
                self.issues.append({
                    "type": "amount_conflict",
                    "field_name": "inventory_impact",
                    "original_value": str(refund_amt),
                    "current_value": str(ledger_inv),
                    "expected_value": str(refund_amt),
                    "error_message": f"库存影响与退款金额不一致: 退款金额 {refund_amt}，台账库存影响 {ledger_inv}，差异 {abs(ledger_inv - refund_amt)}",
                    "source_data": {
                        "refund_no": refund.refund_no,
                        "refund_amount": refund_amt,
                        "ledger_inventory_impact": ledger_inv,
                        "difference": abs(ledger_inv - refund_amt),
                        "conflict_type": "value_mismatch"
                    }
                })
                issues_found = True

        if split_record:
            split_inv = float(split_record.inventory_deviation or 0)
            split_perf = float(split_record.performance_deviation or 0)
            
            if split_inv != 0:
                if ledger_inv == 0:
                    self.issues.append({
                        "type": "amount_conflict",
                        "field_name": "inventory_impact",
                        "original_value": str(split_inv),
                        "current_value": str(ledger_inv),
                        "error_message": f"缺货拆单库存偏差 {split_inv} 存在，但台账库存影响为 0，可能漏记",
                        "source_data": {
                            "split_no": split_record.split_no,
                            "inventory_deviation": split_inv,
                            "ledger_inventory_impact": ledger_inv,
                            "conflict_type": "missing_ledger_value"
                        }
                    })
                    issues_found = True
                elif abs(ledger_inv - split_inv) > max(abs(split_inv) * 0.1, 1.0):
                    self.issues.append({
                        "type": "amount_conflict",
                        "field_name": "inventory_impact",
                        "original_value": str(split_inv),
                        "current_value": str(ledger_inv),
                        "expected_value": str(split_inv),
                        "error_message": f"库存影响与拆单偏差不一致: 拆单库存偏差 {split_inv}，台账库存影响 {ledger_inv}，差异 {abs(ledger_inv - split_inv)}",
                        "source_data": {
                            "split_no": split_record.split_no,
                            "inventory_deviation": split_inv,
                            "ledger_inventory_impact": ledger_inv,
                            "difference": abs(ledger_inv - split_inv),
                            "conflict_type": "value_mismatch"
                        }
                    })
                    issues_found = True

            if split_perf != 0:
                if ledger_perf == 0:
                    self.issues.append({
                        "type": "amount_conflict",
                        "field_name": "performance_impact",
                        "original_value": str(split_perf),
                        "current_value": str(ledger_perf),
                        "error_message": f"缺货拆单绩效偏差 {split_perf} 存在，但台账绩效影响为 0，可能漏记",
                        "source_data": {
                            "split_no": split_record.split_no,
                            "performance_deviation": split_perf,
                            "ledger_performance_impact": ledger_perf,
                            "conflict_type": "missing_ledger_value"
                        }
                    })
                    issues_found = True
                elif abs(ledger_perf - split_perf) > max(abs(split_perf) * 0.1, 0.5):
                    self.issues.append({
                        "type": "amount_conflict",
                        "field_name": "performance_impact",
                        "original_value": str(split_perf),
                        "current_value": str(ledger_perf),
                        "expected_value": str(split_perf),
                        "error_message": f"绩效影响与拆单偏差不一致: 拆单绩效偏差 {split_perf}，台账绩效影响 {ledger_perf}，差异 {abs(ledger_perf - split_perf)}",
                        "source_data": {
                            "split_no": split_record.split_no,
                            "performance_deviation": split_perf,
                            "ledger_performance_impact": ledger_perf,
                            "difference": abs(ledger_perf - split_perf),
                            "conflict_type": "value_mismatch"
                        }
                    })
                    issues_found = True

        if inventory_diff and inventory_diff.diff_qty != 0:
            estimated_impact = abs(inventory_diff.diff_qty) * 10
            if ledger_inv == 0:
                self.issues.append({
                    "type": "amount_conflict",
                    "field_name": "inventory_impact",
                    "original_value": f"预估 {estimated_impact}",
                    "current_value": str(ledger_inv),
                    "error_message": f"盘点差异 {inventory_diff.diff_qty} 存在，但台账库存影响为 0，可能漏记",
                    "source_data": {
                        "check_no": inventory_diff.check_no,
                        "diff_qty": inventory_diff.diff_qty,
                        "estimated_impact": estimated_impact,
                        "ledger_inventory_impact": ledger_inv,
                        "conflict_type": "missing_ledger_value"
                    }
                })
                issues_found = True
            elif abs(ledger_inv - estimated_impact) > max(estimated_impact * 0.1, 1.0):
                self.issues.append({
                    "type": "amount_conflict",
                    "field_name": "inventory_impact",
                    "original_value": f"预估 {estimated_impact}",
                    "current_value": str(ledger_inv),
                    "expected_value": f"预估 {estimated_impact}",
                    "error_message": f"库存影响与盘点预估不一致: 盘点预估影响 {estimated_impact}，台账库存影响 {ledger_inv}，差异 {abs(ledger_inv - estimated_impact)}",
                    "source_data": {
                        "check_no": inventory_diff.check_no,
                        "diff_qty": inventory_diff.diff_qty,
                        "estimated_impact": estimated_impact,
                        "ledger_inventory_impact": ledger_inv,
                        "difference": abs(ledger_inv - estimated_impact),
                        "conflict_type": "value_mismatch"
                    }
                })
                issues_found = True
        
        if ledger_inv != 0:
            has_source = (refund is not None and refund.refund_amount is not None) or \
                        (split_record is not None and split_record.inventory_deviation is not None) or \
                        (inventory_diff is not None and inventory_diff.diff_qty != 0)
            if not has_source:
                self.issues.append({
                    "type": "amount_conflict",
                    "field_name": "inventory_impact",
                    "original_value": str(ledger_inv),
                    "current_value": str(ledger_inv),
                    "error_message": f"台账库存影响 {ledger_inv} 无对应来源记录（退款/拆单/盘点差异）",
                    "source_data": {
                        "ledger_inventory_impact": ledger_inv,
                        "has_refund": refund is not None and refund.refund_amount is not None,
                        "has_split": split_record is not None and split_record.inventory_deviation is not None,
                        "has_inventory_diff": inventory_diff is not None and inventory_diff.diff_qty != 0,
                        "conflict_type": "no_source_record"
                    }
                })
                issues_found = True
        
        if ledger_perf != 0:
            if split_record is None or split_record.performance_deviation is None or split_record.performance_deviation == 0:
                self.issues.append({
                    "type": "amount_conflict",
                    "field_name": "performance_impact",
                    "original_value": str(ledger_perf),
                    "current_value": str(ledger_perf),
                    "error_message": f"台账绩效影响 {ledger_perf} 无对应拆单绩效偏差记录",
                    "source_data": {
                        "ledger_performance_impact": ledger_perf,
                        "has_split": split_record is not None,
                        "split_performance_deviation": float(split_record.performance_deviation) if (split_record and split_record.performance_deviation) else None,
                        "conflict_type": "no_source_record"
                    }
                })
                issues_found = True

    def _check_qty_conflict(self, ledger: LedgerRecord):
        if ledger.pick_qty and ledger.actual_pick_qty:
            expected_diff = ledger.pick_qty - ledger.actual_pick_qty
            if expected_diff != ledger.diff_qty:
                self.issues.append({
                    "type": "qty_conflict",
                    "field_name": "diff_qty",
                    "original_value": str(expected_diff),
                    "current_value": str(ledger.diff_qty),
                    "expected_value": str(expected_diff),
                    "error_message": f"数量逻辑冲突: 拣货数量({ledger.pick_qty}) - 实际拣货({ledger.actual_pick_qty}) = {expected_diff}，但差异数量是 {ledger.diff_qty}",
                    "source_data": {
                        "pick_qty": ledger.pick_qty,
                        "actual_pick_qty": ledger.actual_pick_qty,
                        "diff_qty": ledger.diff_qty
                    }
                })

    def _check_duplicate(self, ledger: LedgerRecord):
        if not ledger.wave_no or not ledger.sku_code:
            return
            
        existing = self.db.query(LedgerRecord).filter(
            LedgerRecord.wave_no == ledger.wave_no,
            LedgerRecord.sku_code == ledger.sku_code,
            LedgerRecord.id != ledger.id,
            LedgerRecord.is_deleted == False
        ).first()
        
        if existing:
            self.issues.append({
                "type": "duplicate",
                "field_name": "wave_no+sku_code",
                "original_value": f"{existing.wave_no}-{existing.sku_code}",
                "current_value": f"{ledger.wave_no}-{ledger.sku_code}",
                "error_message": f"重复记录: 同一波次同一SKU已存在台账记录 {existing.ledger_no}",
                "source_data": {
                    "existing_ledger_no": existing.ledger_no,
                    "new_ledger_no": ledger.ledger_no
                }
            })

    def save_dirty_records(self, ledger: LedgerRecord, issues: List[Dict]):
        for issue in issues:
            dirty = DirtyRecord(
                ledger_id=ledger.id,
                ledger_no=ledger.ledger_no,
                dirty_type=issue["type"],
                field_name=issue.get("field_name", ""),
                original_value=issue.get("original_value", ""),
                current_value=issue.get("current_value", ""),
                expected_value=issue.get("expected_value", ""),
                source_data=issue.get("source_data", {}),
                error_message=issue.get("error_message", ""),
                is_resolved=False
            )
            self.db.add(dirty)
        
        if issues:
            ledger.is_dirty = True
            ledger.dirty_type = issues[0]["type"]
            ledger.dirty_note = f"发现 {len(issues)} 个数据质量问题"
        
        self.db.commit()

    def resolve_dirty_record(self, dirty_id: int, handle_opinion: str, resolver_name: str, resolved_value: Optional[str] = None) -> DirtyRecord:
        dirty = self.db.query(DirtyRecord).filter(DirtyRecord.id == dirty_id).first()
        if not dirty:
            raise ValueError("脏记录不存在")
        
        dirty.is_resolved = True
        dirty.resolved_by = resolver_name
        dirty.resolved_time = datetime.utcnow()
        dirty.handle_opinion = handle_opinion
        
        if resolved_value and dirty.ledger_id:
            ledger = self.db.query(LedgerRecord).filter(LedgerRecord.id == dirty.ledger_id).first()
            if ledger and dirty.field_name and hasattr(ledger, dirty.field_name):
                setattr(ledger, dirty.field_name, resolved_value)
        
        self.db.commit()
        self.db.refresh(dirty)
        
        return dirty
