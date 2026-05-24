from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import hashlib
import json

from app.models.ledger import LedgerRecord, DirtyRecord, DIRTY_RECORD_TYPES
from app.models.source_data import WaveOrder, PickDifference, ReviewScan


class DirtyRecordDetector:
    def __init__(self, db: Session):
        self.db = db
        self.issues = []

    def detect_all(self, ledger: LedgerRecord) -> List[Dict]:
        self.issues = []
        
        self._check_missing_fields(ledger)
        self._check_cross_day(ledger)
        self._check_name_consistency(ledger)
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

    def _check_amount_conflict(self, ledger: LedgerRecord):
        if not ledger.wave_no or not ledger.sku_code:
            return
            
        pick_diff = self.db.query(PickDifference).filter(
            PickDifference.wave_no == ledger.wave_no,
            PickDifference.sku_code == ledger.sku_code
        ).first()
        
        if pick_diff:
            sources = []
            if pick_diff.diff_qty != ledger.diff_qty:
                sources.append({
                    "source": "pick_diff",
                    "field": "diff_qty",
                    "value": pick_diff.diff_qty
                })
                sources.append({
                    "source": "ledger",
                    "field": "diff_qty",
                    "value": ledger.diff_qty
                })
                
                self.issues.append({
                    "type": "qty_conflict",
                    "field_name": "diff_qty",
                    "original_value": str(pick_diff.diff_qty),
                    "current_value": str(ledger.diff_qty),
                    "error_message": f"差异数量冲突: 拣货差异表中是 {pick_diff.diff_qty}，台账中是 {ledger.diff_qty}",
                    "source_data": {"conflict_sources": sources}
                })

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
