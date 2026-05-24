import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.enums import RecordStatus, RoleType, FabricStatus
from app.core.exceptions import (
    InvalidStatusTransition, RecordFrozen, DuplicateSubmission,
    OriginalEvidenceProtected
)
from app.models.ledger import LedgerRecord, StatusHistory, ProcessingChain
from app.models.ledger import SampleTransfer, SizeModification, FabricInventory


class LedgerService:
    def __init__(self, db: Session):
        self.db = db

    STATUS_TRANSITION_MAP = {
        RecordStatus.DRAFT: [RecordStatus.SUBMITTED],
        RecordStatus.SUBMITTED: [RecordStatus.REJECTED, RecordStatus.SECOND_CONFIRM, RecordStatus.DRAFT],
        RecordStatus.REJECTED: [RecordStatus.DRAFT, RecordStatus.SUBMITTED, RecordStatus.AUDIT_ONLY],
        RecordStatus.SECOND_CONFIRM: [RecordStatus.AUDIT_ONLY, RecordStatus.REJECTED, RecordStatus.DRAFT],
        RecordStatus.AUDIT_ONLY: [RecordStatus.FROZEN, RecordStatus.EXPORTED, RecordStatus.REJECTED, RecordStatus.DRAFT],
        RecordStatus.FROZEN: [RecordStatus.EXPORTED, RecordStatus.AUDIT_ONLY],
        RecordStatus.EXPORTED: [],
    }

    def generate_record_no(self) -> str:
        return f"LDG-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    def create_ledger_record(self, data: Dict[str, Any], creator: str) -> LedgerRecord:
        record_no = data.get("record_no") or self.generate_record_no()

        record = LedgerRecord(
            record_no=record_no,
            style_code=data["style_code"],
            style_name=data.get("style_name"),
            version=data.get("version", 1),
            parent_version_id=data.get("parent_version_id"),
            designer=data.get("designer"),
            pattern_maker=data.get("pattern_maker"),
            sample_maker=data.get("sample_maker"),
            warehouse_keeper=data.get("warehouse_keeper"),
            fabric_code=data.get("fabric_code"),
            fabric_name=data.get("fabric_name"),
            fabric_quantity=data.get("fabric_quantity"),
            fabric_unit=data.get("fabric_unit", "米"),
            remarks=data.get("remarks"),
            extra_data=data.get("extra_data", {}),
            status=RecordStatus.DRAFT,
            current_role=RoleType.DESIGNER,
        )

        self.db.add(record)
        self.db.flush()

        self._add_status_history(
            record.id,
            None,
            RecordStatus.DRAFT,
            "创建台账记录",
            creator,
            RoleType.ADMIN
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def _add_status_history(
        self,
        ledger_id: int,
        from_status: Optional[str],
        to_status: str,
        reason: str,
        operator: str,
        operator_role: str,
        extra_info: Optional[Dict[str, Any]] = None
    ) -> StatusHistory:
        history = StatusHistory(
            ledger_record_id=ledger_id,
            from_status=from_status,
            to_status=to_status,
            transition_reason=reason,
            operator=operator,
            operator_role=operator_role,
            extra_info=extra_info or {}
        )
        self.db.add(history)
        return history

    def _validate_status_transition(self, from_status: str, to_status: str) -> bool:
        allowed_statuses = self.STATUS_TRANSITION_MAP.get(from_status, [])
        return to_status in allowed_statuses

    def transition_status(
        self,
        record_id: int,
        target_status: str,
        transition_reason: str,
        operator: str,
        operator_role: str,
        extra_info: Optional[Dict[str, Any]] = None
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"台账记录不存在: {record_id}")

        if record.is_frozen and target_status != RecordStatus.EXPORTED:
            raise RecordFrozen(record_id)

        if not self._validate_status_transition(record.status, target_status):
            raise InvalidStatusTransition(record.status, target_status)

        old_status = record.status
        record.status = target_status
        record.updated_at = datetime.utcnow()

        self._add_status_history(
            record_id,
            old_status,
            target_status,
            transition_reason,
            operator,
            operator_role,
            extra_info
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def submit(self, record_id: int, operator: str, operator_role: str, reason: str = "提交审核") -> LedgerRecord:
        return self.transition_status(
            record_id,
            RecordStatus.SUBMITTED,
            reason,
            operator,
            operator_role
        )

    def reject(self, record_id: int, operator: str, operator_role: str, reason: str) -> LedgerRecord:
        return self.transition_status(
            record_id,
            RecordStatus.REJECTED,
            reason,
            operator,
            operator_role
        )

    def second_confirm(self, record_id: int, operator: str, operator_role: str, reason: str = "二次确认通过") -> LedgerRecord:
        return self.transition_status(
            record_id,
            RecordStatus.SECOND_CONFIRM,
            reason,
            operator,
            operator_role
        )

    def audit_only(self, record_id: int, operator: str, operator_role: str, reason: str = "进入只读审计状态") -> LedgerRecord:
        return self.transition_status(
            record_id,
            RecordStatus.AUDIT_ONLY,
            reason,
            operator,
            operator_role
        )

    def withdraw(self, record_id: int, operator: str, operator_role: str, reason: str = "撤回修改") -> LedgerRecord:
        if operator_role not in [RoleType.ADMIN, RoleType.AUDITOR]:
            raise PermissionError("只有管理员或审计员可以撤回")
        return self.transition_status(
            record_id,
            RecordStatus.DRAFT,
            reason,
            operator,
            operator_role
        )

    def freeze_record(self, record_id: int, freeze_reason: str, operator: str, operator_role: str) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"台账记录不存在: {record_id}")

        if record.status not in [RecordStatus.AUDIT_ONLY, RecordStatus.FROZEN]:
            raise ValueError("只有审计状态的记录可以冻结")

        if record.status == RecordStatus.FROZEN:
            raise ValueError("记录已处于冻结状态")

        old_status = record.status

        record.is_frozen = True
        record.frozen_at = datetime.utcnow()
        record.frozen_by = operator
        record.freeze_reason = freeze_reason
        record.status = RecordStatus.FROZEN

        self._add_status_history(
            record_id,
            old_status,
            RecordStatus.FROZEN,
            f"冻结记录: {freeze_reason}",
            operator,
            operator_role
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def unfreeze_record(self, record_id: int, operator: str, operator_role: str) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"台账记录不存在: {record_id}")

        if operator_role not in [RoleType.ADMIN, RoleType.AUDITOR]:
            raise PermissionError("只有管理员或审计员可以解冻")

        record.is_frozen = False
        record.status = RecordStatus.AUDIT_ONLY

        self._add_status_history(
            record_id,
            RecordStatus.FROZEN,
            RecordStatus.AUDIT_ONLY,
            "解冻记录",
            operator,
            operator_role
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def manual_adjust(
        self,
        record_id: int,
        adjust_reason: str,
        operator: str,
        operator_role: str,
        updates: Dict[str, Any]
    ) -> LedgerRecord:
        if operator_role not in [RoleType.ADMIN, RoleType.AUDITOR]:
            raise PermissionError("只有管理员或审计员可以人工改判")

        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"台账记录不存在: {record_id}")

        protected_fields = ["record_no", "created_at", "import_batch_id", "original_raw_data"]
        for field in protected_fields:
            if field in updates:
                raise OriginalEvidenceProtected()

        for key, value in updates.items():
            if hasattr(record, key):
                setattr(record, key, value)

        record.manual_adjusted = True
        record.adjust_count += 1
        record.last_adjusted_at = datetime.utcnow()
        record.last_adjusted_by = operator
        record.adjust_reason = adjust_reason

        self._add_status_history(
            record_id,
            record.status,
            record.status,
            f"人工改判: {adjust_reason}",
            operator,
            operator_role,
            {"updates": updates}
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def mark_exported(self, record_id: int, operator: str, operator_role: str) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"台账记录不存在: {record_id}")

        record.export_count += 1
        record.last_exported_at = datetime.utcnow()

        if record.status == RecordStatus.FROZEN:
            record.status = RecordStatus.EXPORTED
            self._add_status_history(
                record_id,
                RecordStatus.FROZEN,
                RecordStatus.EXPORTED,
                "导出脱敏数据",
                operator,
                operator_role
            )

        self.db.commit()
        self.db.refresh(record)
        return record

    def check_duplicate_submission(self, style_code: str, version: int) -> bool:
        existing = self.db.query(LedgerRecord).filter(
            LedgerRecord.style_code == style_code,
            LedgerRecord.version == version,
            LedgerRecord.status != RecordStatus.DRAFT
        ).first()
        return existing is not None

    def get_record(self, record_id: int) -> Optional[LedgerRecord]:
        return self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()

    def get_records_by_style(self, style_code: str) -> List[LedgerRecord]:
        return self.db.query(LedgerRecord).filter(
            LedgerRecord.style_code == style_code
        ).order_by(LedgerRecord.version).all()
