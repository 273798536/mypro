from datetime import date, datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict

from models import (
    VerificationResult, Dispute, VerificationStatus, DisputeType,
    AttendanceRecord
)
from data_store import DataStore


@dataclass
class ChangeItem:
    field_name: str
    old_value: str
    new_value: str
    change_type: str  


@dataclass
class VersionDiff:
    old_version: int
    new_version: int
    old_result_id: str
    new_result_id: str
    total_days_change: float
    total_amount_change: float
    duplicate_days_change: float
    duplicate_amount_change: float
    added_disputes: List[Dispute]
    removed_disputes: List[Dispute]
    changed_disputes: List[Tuple[Dispute, Dispute, List[ChangeItem]]]
    attendance_changes: List[ChangeItem]


class VersionComparator:
    def __init__(self, data_store: DataStore):
        self.data_store = data_store
    
    def compare_results(self, old_result: VerificationResult, 
                       new_result: VerificationResult) -> VersionDiff:
        old_ids = set(old_result.attendance_ids)
        new_ids = set(new_result.attendance_ids)
        
        attendance_changes = self._compare_attendance_records(
            old_ids, new_ids, old_result, new_result
        )
        
        added_disputes, removed_disputes, changed_disputes = self._compare_disputes(
            old_result.disputes, new_result.disputes
        )
        
        return VersionDiff(
            old_version=old_result.version,
            new_version=new_result.version,
            old_result_id=old_result.result_id,
            new_result_id=new_result.result_id,
            total_days_change=round(new_result.total_days - old_result.total_days, 2),
            total_amount_change=round(new_result.total_amount - old_result.total_amount, 2),
            duplicate_days_change=round(new_result.duplicate_days - old_result.duplicate_days, 2),
            duplicate_amount_change=round(new_result.duplicate_amount - old_result.duplicate_amount, 2),
            added_disputes=added_disputes,
            removed_disputes=removed_disputes,
            changed_disputes=changed_disputes,
            attendance_changes=attendance_changes
        )
    
    def _compare_attendance_records(self, old_ids: set, new_ids: set,
                                    old_result: VerificationResult, 
                                    new_result: VerificationResult) -> List[ChangeItem]:
        changes = []
        
        added_ids = new_ids - old_ids
        for aid in added_ids:
            record = self.data_store.attendance.get(aid)
            if record:
                staff = self.data_store.staff.get(record.staff_id)
                staff_name = staff.name if staff else record.staff_id
                changes.append(ChangeItem(
                    field_name=f"新增考勤记录",
                    old_value="",
                    new_value=f"【{staff_name}】{record.work_date} {record.hours}小时 (ID:{aid})",
                    change_type="added"
                ))
        
        removed_ids = old_ids - new_ids
        for rid in removed_ids:
            record = self.data_store.attendance.get(rid)
            if record:
                staff = self.data_store.staff.get(record.staff_id)
                staff_name = staff.name if staff else record.staff_id
                changes.append(ChangeItem(
                    field_name=f"移除考勤记录",
                    old_value=f"【{staff_name}】{record.work_date} {record.hours}小时 (ID:{rid})",
                    new_value="",
                    change_type="removed"
                ))
        
        common_ids = old_ids & new_ids
        for cid in common_ids:
            old_record = self.data_store.attendance.get(cid)
            if old_record:
                new_record = self._find_in_result(cid, new_result)
                if new_record:
                    changes.extend(self._compare_single_record(old_record, new_record))
        
        return changes
    
    def _find_in_result(self, attendance_id: str, result: VerificationResult) -> Optional[AttendanceRecord]:
        return self.data_store.attendance.get(attendance_id)
    
    def _compare_single_record(self, old: AttendanceRecord, 
                              new: AttendanceRecord) -> List[ChangeItem]:
        changes = []
        
        staff = self.data_store.staff.get(new.staff_id)
        staff_name = staff.name if staff else new.staff_id
        prefix = f"【{staff_name}】{new.work_date}"
        
        if old.hours != new.hours:
            changes.append(ChangeItem(
                field_name=f"{prefix} 工时变更",
                old_value=f"{old.hours}小时",
                new_value=f"{new.hours}小时",
                change_type="modified"
            ))
        
        if old.project_code != new.project_code:
            changes.append(ChangeItem(
                field_name=f"{prefix} 项目变更",
                old_value=old.project_code or "未设置",
                new_value=new.project_code or "未设置",
                change_type="modified"
            ))
        
        if old.remark != new.remark:
            changes.append(ChangeItem(
                field_name=f"{prefix} 备注变更",
                old_value=old.remark or "无备注",
                new_value=new.remark or "无备注",
                change_type="modified"
            ))
        
        if old.is_approved != new.is_approved:
            changes.append(ChangeItem(
                field_name=f"{prefix} 审批状态变更",
                old_value="已审批" if old.is_approved else "未审批",
                new_value="已审批" if new.is_approved else "未审批",
                change_type="modified"
            ))
        
        return changes
    
    def _compare_disputes(self, old_disputes: List[Dispute], 
                         new_disputes: List[Dispute]) -> Tuple[List[Dispute], List[Dispute], 
                                                              List[Tuple[Dispute, Dispute, List[ChangeItem]]]]:
        def get_dispute_key(d: Dispute) -> tuple:
            return (d.dispute_type.value, d.staff_id, 
                   d.work_date.isoformat() if d.work_date else None)
        
        old_by_key = {get_dispute_key(d): d for d in old_disputes}
        new_by_key = {get_dispute_key(d): d for d in new_disputes}
        
        old_keys = set(old_by_key.keys())
        new_keys = set(new_by_key.keys())
        
        added_keys = new_keys - old_keys
        removed_keys = old_keys - new_keys
        common_keys = old_keys & new_keys
        
        added_disputes = [new_by_key[k] for k in added_keys]
        removed_disputes = [old_by_key[k] for k in removed_keys]
        changed_disputes = []
        
        for key in common_keys:
            old_d = old_by_key[key]
            new_d = new_by_key[key]
            
            changes = self._compare_single_dispute(old_d, new_d)
            if changes:
                changed_disputes.append((old_d, new_d, changes))
        
        return added_disputes, removed_disputes, changed_disputes
    
    def _compare_single_dispute(self, old: Dispute, new: Dispute) -> List[ChangeItem]:
        changes = []
        
        if old.status != new.status:
            changes.append(ChangeItem(
                field_name="状态变更",
                old_value=old.status.value,
                new_value=new.status.value,
                change_type="status"
            ))
        
        if old.resolved != new.resolved:
            changes.append(ChangeItem(
                field_name="解决状态变更",
                old_value="已解决" if old.resolved else "未解决",
                new_value="已解决" if new.resolved else "未解决",
                change_type="status"
            ))
        
        if old.description != new.description:
            changes.append(ChangeItem(
                field_name="描述变更",
                old_value=old.description,
                new_value=new.description,
                change_type="content"
            ))
        
        if old.suggestion != new.suggestion:
            changes.append(ChangeItem(
                field_name="建议变更",
                old_value=old.suggestion,
                new_value=new.suggestion,
                change_type="content"
            ))
        
        return changes
    
    def get_version_history(self, limit: int = 10) -> List[VerificationResult]:
        results = sorted(
            self.data_store.verification_results.values(),
            key=lambda r: r.created_at,
            reverse=True
        )
        return results[:limit]
    
    def generate_change_summary(self, diff: VersionDiff) -> Dict[str, any]:
        summary = {
            "version_change": f"V{diff.old_version} -> V{diff.new_version}",
            "result_ids": f"{diff.old_result_id} -> {diff.new_result_id}",
            "total_days": {
                "change": diff.total_days_change,
                "direction": "增加" if diff.total_days_change > 0 else "减少" if diff.total_days_change < 0 else "不变"
            },
            "total_amount": {
                "change": diff.total_amount_change,
                "direction": "增加" if diff.total_amount_change > 0 else "减少" if diff.total_amount_change < 0 else "不变"
            },
            "disputes_summary": {
                "added": len(diff.added_disputes),
                "removed": len(diff.removed_disputes),
                "changed": len(diff.changed_disputes)
            },
            "attendance_changes": len(diff.attendance_changes)
        }
        return summary
