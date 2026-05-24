from typing import Optional, Dict, List, Set
from sqlalchemy.orm import Session
from datetime import datetime

from app.models import (
    Receipt, ReceiptStatus, User, StatusHistory, 
    AuditLog, AuditAction, DirtyRecord, DirtyRecordType
)


class StateTransitionError(Exception):
    pass


class ReceiptStateMachine:
    VALID_TRANSITIONS: Dict[ReceiptStatus, Set[ReceiptStatus]] = {
        ReceiptStatus.DRAFT: {
            ReceiptStatus.SUBMITTED,
            ReceiptStatus.ARCHIVED,
        },
        ReceiptStatus.SUBMITTED: {
            ReceiptStatus.REVIEWING,
            ReceiptStatus.REJECTED,
            ReceiptStatus.FROZEN,
            ReceiptStatus.ARCHIVED,
        },
        ReceiptStatus.REVIEWING: {
            ReceiptStatus.APPROVED,
            ReceiptStatus.REJECTED,
            ReceiptStatus.SUBMITTED,
            ReceiptStatus.FROZEN,
        },
        ReceiptStatus.APPROVED: {
            ReceiptStatus.SETTLED,
            ReceiptStatus.FROZEN,
            ReceiptStatus.REVIEWING,
        },
        ReceiptStatus.REJECTED: {
            ReceiptStatus.SUBMITTED,
            ReceiptStatus.ARCHIVED,
        },
        ReceiptStatus.FROZEN: {
            ReceiptStatus.SUBMITTED,
            ReceiptStatus.REVIEWING,
            ReceiptStatus.APPROVED,
            ReceiptStatus.SETTLED,
        },
        ReceiptStatus.SETTLED: {
            ReceiptStatus.FROZEN,
            ReceiptStatus.ARCHIVED,
        },
        ReceiptStatus.ARCHIVED: {
            ReceiptStatus.DRAFT,
        },
    }

    def __init__(self, receipt: Receipt, db: Session, operator: User):
        self.receipt = receipt
        self.db = db
        self.operator = operator
        self.original_status = receipt.status

    def can_transition_to(self, target_status: ReceiptStatus) -> bool:
        valid_targets = self.VALID_TRANSITIONS.get(self.receipt.status, set())
        return target_status in valid_targets

    def _record_transition(self, to_status: ReceiptStatus, reason: Optional[str] = None):
        history = StatusHistory(
            receipt_id=self.receipt.id,
            from_status=self.original_status,
            to_status=to_status,
            reason=reason,
            operator_id=self.operator.id,
        )
        self.db.add(history)

    def _record_audit(self, action: AuditAction, details: Optional[Dict] = None):
        audit = AuditLog(
            receipt_id=self.receipt.id,
            action=action,
            operator_id=self.operator.id,
            details=details or {},
        )
        self.db.add(audit)

    def _change_status(self, target_status: ReceiptStatus, reason: Optional[str] = None, action: AuditAction = AuditAction.UPDATE):
        if not self.can_transition_to(target_status):
            raise StateTransitionError(
                f"无法从状态 {self.receipt.status.value} 转换到 {target_status.value}"
            )
        
        self.receipt.prev_status = self.receipt.status
        self.receipt.status = target_status
        
        self._record_transition(target_status, reason)
        self._record_audit(action, {
            "from_status": self.original_status.value,
            "to_status": target_status.value,
            "reason": reason
        })

    def submit(self, reason: Optional[str] = None):
        if self.receipt.has_dirty:
            raise StateTransitionError("存在脏记录，无法提交，请先修复脏数据")
        
        self._change_status(
            ReceiptStatus.SUBMITTED,
            reason or "提交审核",
            AuditAction.SUBMIT
        )

    def start_review(self, reason: Optional[str] = None):
        self._change_status(
            ReceiptStatus.REVIEWING,
            reason or "开始复核",
            AuditAction.REVIEW
        )

    def approve(self, reason: Optional[str] = None):
        self._change_status(
            ReceiptStatus.APPROVED,
            reason or "复核通过",
            AuditAction.APPROVE
        )

    def reject(self, reason: Optional[str] = None):
        self._change_status(
            ReceiptStatus.REJECTED,
            reason or "复核驳回",
            AuditAction.REJECT
        )

    def freeze(self, freeze_reason: str):
        self.receipt.freeze_reason = freeze_reason
        self._change_status(
            ReceiptStatus.FROZEN,
            freeze_reason,
            AuditAction.FREEZE
        )

    def unfreeze(self, target_status: ReceiptStatus, reason: Optional[str] = None):
        if target_status not in self.VALID_TRANSITIONS[ReceiptStatus.FROZEN]:
            raise StateTransitionError(f"解冻后无法转换到状态 {target_status.value}")
        
        self.receipt.prev_status = self.receipt.status
        self.receipt.status = target_status
        self.receipt.freeze_reason = None
        
        self._record_transition(target_status, reason or "解冻结算")
        self._record_audit(AuditAction.UNFREEZE, {
            "from_status": ReceiptStatus.FROZEN.value,
            "to_status": target_status.value,
            "reason": reason
        })

    def settle(self, reason: Optional[str] = None):
        self._change_status(
            ReceiptStatus.SETTLED,
            reason or "完成结算",
            AuditAction.SETTLE
        )

    def archive(self, reason: Optional[str] = None):
        self._change_status(
            ReceiptStatus.ARCHIVED,
            reason or "撤回归档",
            AuditAction.ARCHIVE
        )

    def restore(self, reason: Optional[str] = None):
        self._change_status(
            ReceiptStatus.DRAFT,
            reason or "恢复草稿",
            AuditAction.UPDATE
        )


class DirtyRecordDetector:
    def __init__(self, receipt: Receipt, db: Session):
        self.receipt = receipt
        self.db = db
        self.dirty_types: List[str] = []

    def detect_missing_fields(self) -> List[DirtyRecord]:
        required_fields = ["material_id", "platform", "report_date"]
        dirty_records = []
        
        for field in required_fields:
            value = getattr(self.receipt, field)
            if value is None or (isinstance(value, str) and not value.strip()):
                dirty_records.append(DirtyRecord(
                    receipt_id=self.receipt.id,
                    dirty_type=DirtyRecordType.MISSING_FIELD,
                    field_name=field,
                    original_value=str(value) if value else None,
                    description=f"必填字段 {field} 缺失"
                ))
                self.dirty_types.append(DirtyRecordType.MISSING_FIELD.value)
        
        return dirty_records

    def detect_cross_day(self) -> List[DirtyRecord]:
        dirty_records = []
        
        if self.receipt.report_date:
            same_material = self.db.query(Receipt).filter(
                Receipt.material_id == self.receipt.material_id,
                Receipt.id != self.receipt.id,
                Receipt.report_date == self.receipt.report_date
            ).first()
            
            if same_material:
                dirty_records.append(DirtyRecord(
                    receipt_id=self.receipt.id,
                    dirty_type=DirtyRecordType.CROSS_DAY,
                    field_name="report_date",
                    original_value=self.receipt.report_date.isoformat() if self.receipt.report_date else None,
                    expected_value=same_material.report_date.isoformat() if same_material.report_date else None,
                    description=f"同一素材在相同日期存在多条记录: 回执号 {same_material.receipt_no}"
                ))
                self.dirty_types.append(DirtyRecordType.CROSS_DAY.value)
        
        return dirty_records

    def detect_name_changed(self) -> List[DirtyRecord]:
        dirty_records = []
        
        if self.receipt.material_name and self.receipt.material_id:
            existing = self.db.query(Receipt).filter(
                Receipt.material_id == self.receipt.material_id,
                Receipt.id != self.receipt.id,
                Receipt.material_name != None,
                Receipt.material_name != self.receipt.material_name
            ).order_by(Receipt.created_at.desc()).first()
            
            if existing:
                dirty_records.append(DirtyRecord(
                    receipt_id=self.receipt.id,
                    dirty_type=DirtyRecordType.NAME_CHANGED,
                    field_name="material_name",
                    original_value=self.receipt.material_name,
                    expected_value=existing.material_name,
                    description=f"素材名称变更: 原名为 {existing.material_name}，现名为 {self.receipt.material_name}"
                ))
                self.dirty_types.append(DirtyRecordType.NAME_CHANGED.value)
        
        return dirty_records

    def detect_amount_conflict(self) -> List[DirtyRecord]:
        dirty_records = []
        
        if self.receipt.daily_cost and self.receipt.daily_cost < 0:
            dirty_records.append(DirtyRecord(
                receipt_id=self.receipt.id,
                dirty_type=DirtyRecordType.AMOUNT_CONFLICT,
                field_name="daily_cost",
                original_value=str(self.receipt.daily_cost),
                description="日报花费不能为负数"
            ))
            self.dirty_types.append(DirtyRecordType.AMOUNT_CONFLICT.value)
        
        if self.receipt.cost_amount and self.receipt.cost_amount < 0:
            dirty_records.append(DirtyRecord(
                receipt_id=self.receipt.id,
                dirty_type=DirtyRecordType.AMOUNT_CONFLICT,
                field_name="cost_amount",
                original_value=str(self.receipt.cost_amount),
                description="花费金额不能为负数"
            ))
            if DirtyRecordType.AMOUNT_CONFLICT.value not in self.dirty_types:
                self.dirty_types.append(DirtyRecordType.AMOUNT_CONFLICT.value)
        
        return dirty_records

    def detect_quantity_conflict(self) -> List[DirtyRecord]:
        dirty_records = []
        
        if self.receipt.daily_impressions and self.receipt.daily_impressions < 0:
            dirty_records.append(DirtyRecord(
                receipt_id=self.receipt.id,
                dirty_type=DirtyRecordType.QUANTITY_CONFLICT,
                field_name="daily_impressions",
                original_value=str(self.receipt.daily_impressions),
                description="曝光量不能为负数"
            ))
            self.dirty_types.append(DirtyRecordType.QUANTITY_CONFLICT.value)
        
        if self.receipt.daily_clicks and self.receipt.daily_clicks < 0:
            dirty_records.append(DirtyRecord(
                receipt_id=self.receipt.id,
                dirty_type=DirtyRecordType.QUANTITY_CONFLICT,
                field_name="daily_clicks",
                original_value=str(self.receipt.daily_clicks),
                description="点击量不能为负数"
            ))
            if DirtyRecordType.QUANTITY_CONFLICT.value not in self.dirty_types:
                self.dirty_types.append(DirtyRecordType.QUANTITY_CONFLICT.value)
        
        return dirty_records

    def detect_all(self) -> List[DirtyRecord]:
        self.dirty_types = []
        all_dirty = []
        
        all_dirty.extend(self.detect_missing_fields())
        all_dirty.extend(self.detect_cross_day())
        all_dirty.extend(self.detect_name_changed())
        all_dirty.extend(self.detect_amount_conflict())
        all_dirty.extend(self.detect_quantity_conflict())
        
        self.receipt.has_dirty = len(all_dirty) > 0
        self.receipt.dirty_types = list(set(self.dirty_types)) if self.dirty_types else None
        
        return all_dirty
