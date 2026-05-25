from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from collections import defaultdict

from ..models import Clue, DirtyType, WorkOrder, OperationLog
from .location_matcher import normalize_location, locations_match


class DirtyRecordService:
    def __init__(self, db: Session):
        self.db = db

    REQUIRED_FIELDS = {
        "inspection": ["location", "photo_id"],
        "hotline": ["location", "phone", "report_time"],
        "spare_part": ["location", "batch_no", "part_name"],
        "exception_photo": ["location", "photo_id", "exception_type"],
        "sms": ["location", "phone", "content"]
    }

    def check_missing_fields(self, source_type: str, content: Dict[str, Any]) -> Tuple[bool, List[str]]:
        required = self.REQUIRED_FIELDS.get(source_type, ["location"])
        missing = [f for f in required if f not in content or not content[f]]
        return len(missing) > 0, missing

    def check_cross_day(self, clue: Clue, work_order: WorkOrder) -> bool:
        if not clue.occurred_at or not work_order.created_at:
            return False
        clue_date = clue.occurred_at.date()
        wo_date = work_order.created_at.date()
        return clue_date != wo_date

    def check_name_changed(self, clue: Clue, work_order: WorkOrder) -> Tuple[bool, str, str]:
        clue_loc = normalize_location(clue.location)
        wo_loc = work_order.location_normalized
        if clue_loc != wo_loc and locations_match(clue.location, work_order.location):
            return True, clue.location, work_order.location
        return False, "", ""

    def check_amount_conflict(self, clue: Clue, work_order: WorkOrder) -> Tuple[bool, float, float]:
        clue_amount = clue.content.get("amount")
        if clue_amount is None:
            return False, 0, 0
        
        existing_clues = self.db.query(Clue).filter(
            Clue.work_order_id == work_order.id,
            Clue.content.like('%"amount"%')
        ).all()
        
        for ec in existing_clues:
            ec_amount = ec.content.get("amount")
            if ec_amount and abs(ec_amount - clue_amount) > 0.01:
                return True, ec_amount, clue_amount
        return False, 0, 0

    def check_quantity_conflict(self, clue: Clue, work_order: WorkOrder) -> Tuple[bool, int, int]:
        clue_qty = clue.content.get("quantity") or clue.content.get("lamp_count")
        if clue_qty is None:
            return False, 0, 0
        
        existing_clues = self.db.query(Clue).filter(
            Clue.work_order_id == work_order.id
        ).all()
        
        for ec in existing_clues:
            ec_qty = ec.content.get("quantity") or ec.content.get("lamp_count")
            if ec_qty and ec_qty != clue_qty:
                return True, ec_qty, clue_qty
        return False, 0, 0

    def analyze_clue(self, clue: Clue, work_order: WorkOrder) -> List[Dict[str, Any]]:
        issues = []
        
        has_missing, missing_fields = self.check_missing_fields(
            clue.source_type.value, clue.content
        )
        if has_missing:
            issues.append({
                "type": DirtyType.MISSING_FIELD,
                "reason": f"缺少必填字段: {', '.join(missing_fields)}",
                "fields": missing_fields
            })

        if self.check_cross_day(clue, work_order):
            issues.append({
                "type": DirtyType.CROSS_DAY,
                "reason": f"线索日期({clue.occurred_at.date()})与工单日期({work_order.created_at.date()})不一致"
            })

        has_change, old_name, new_name = self.check_name_changed(clue, work_order)
        if has_change:
            issues.append({
                "type": DirtyType.NAME_CHANGED,
                "reason": f"地点名称不一致: '{old_name}' vs '{new_name}'",
                "old_name": old_name,
                "new_name": new_name
            })

        has_amount, old_amount, new_amount = self.check_amount_conflict(clue, work_order)
        if has_amount:
            issues.append({
                "type": DirtyType.AMOUNT_CONFLICT,
                "reason": f"金额冲突: {old_amount} vs {new_amount}",
                "old_amount": old_amount,
                "new_amount": new_amount
            })

        has_qty, old_qty, new_qty = self.check_quantity_conflict(clue, work_order)
        if has_qty:
            issues.append({
                "type": DirtyType.QUANTITY_CONFLICT,
                "reason": f"数量冲突: {old_qty} vs {new_qty}",
                "old_quantity": old_qty,
                "new_quantity": new_qty
            })

        return issues

    def mark_dirty(self, clue_id: int, issues: List[Dict[str, Any]]) -> bool:
        clue = self.db.query(Clue).filter(Clue.id == clue_id).first()
        if not clue:
            return False
        
        clue.is_dirty = True
        clue.dirty_type = issues[0]["type"] if issues else None
        clue.dirty_reason = "; ".join([i["reason"] for i in issues])
        clue.original_content = dict(clue.content)
        
        self.db.commit()
        return True

    def correct_clue(self, clue_id: int, corrected_content: Dict[str, Any],
                     notes: str, operator: str) -> Tuple[bool, str, Dict[str, Any]]:
        clue = self.db.query(Clue).filter(Clue.id == clue_id).first()
        if not clue:
            return False, "线索不存在", {}
        
        if clue.original_content is None:
            clue.original_content = dict(clue.content)
        
        old_content = dict(clue.content)
        clue.content = corrected_content
        clue.correction_notes = f"{notes} (由 {operator} 修正)"
        clue.is_validated = True
        clue.is_dirty = False
        
        self.db.flush()
        
        aggregation = self.reaggregate_work_order(clue.work_order_id)
        
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == clue.work_order_id).first()
        if work_order:
            if aggregation.get("total_lamps"):
                work_order.lamp_count = aggregation["total_lamps"]
            if aggregation.get("total_amount"):
                pass
            
            work_order.updated_at = datetime.now()
        
        log = OperationLog(
            work_order_id=clue.work_order_id,
            operation="correct_clue",
            old_value={"clue_id": clue_id, "content": old_content},
            new_value={"clue_id": clue_id, "content": corrected_content, "aggregation": aggregation},
            operator=operator,
            remarks=f"修正线索: {notes}"
        )
        self.db.add(log)
        
        self.db.commit()
        return True, "修正成功", aggregation

    def get_dirty_clues(self, dirty_type: DirtyType = None) -> List[Clue]:
        query = self.db.query(Clue).filter(Clue.is_dirty == True)
        if dirty_type:
            query = query.filter(Clue.dirty_type == dirty_type)
        return query.order_by(Clue.created_at.desc()).all()

    def get_dirty_summary(self) -> Dict[str, Any]:
        all_dirty = self.db.query(Clue).filter(Clue.is_dirty == True).all()
        
        summary = {
            "total_dirty": len(all_dirty),
            "by_type": defaultdict(int),
            "recent": []
        }
        
        for clue in all_dirty:
            summary["by_type"][clue.dirty_type.value if clue.dirty_type else "unknown"] += 1
        
        summary["by_type"] = dict(summary["by_type"])
        summary["recent"] = [
            {
                "id": c.id,
                "source_type": c.source_type.value,
                "location": c.location,
                "dirty_type": c.dirty_type.value if c.dirty_type else None,
                "dirty_reason": c.dirty_reason,
                "created_at": c.created_at.isoformat()
            }
            for c in all_dirty[:10]
        ]
        
        return summary

    def reaggregate_work_order(self, work_order_id: int) -> Dict[str, Any]:
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return {"error": "工单不存在"}
        
        clues = self.db.query(Clue).filter(
            Clue.work_order_id == work_order_id,
            Clue.is_validated == True
        ).all()
        
        result = {
            "work_order_id": work_order_id,
            "order_no": work_order.order_no,
            "validated_clues": len(clues),
            "locations": set(),
            "total_amount": 0.0,
            "total_lamps": 0,
            "source_types": set()
        }
        
        for clue in clues:
            result["locations"].add(clue.location)
            result["source_types"].add(clue.source_type.value)
            result["total_amount"] += clue.content.get("amount", 0) or 0
            result["total_lamps"] = max(result["total_lamps"], 
                                       clue.content.get("lamp_count", 0) or 0)
        
        result["locations"] = list(result["locations"])
        result["source_types"] = list(result["source_types"])
        
        return result
