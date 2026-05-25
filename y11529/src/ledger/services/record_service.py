from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import (
    LedgerRecord, RecordStatus, RecordType, ActionType, Role,
    AuditLog, VersionDiff, DeclarationForm, TraceNode, TaxNotice,
    SupplementaryRecord, ShiftRecord, NodeType
)


class StateTransitionError(Exception):
    pass


class RecordFrozenError(Exception):
    pass


class StateMachine:
    VALID_TRANSITIONS = {
        RecordStatus.DRAFT: [RecordStatus.SUBMITTED],
        RecordStatus.SUBMITTED: [RecordStatus.REJECTED, RecordStatus.CONFIRMED, RecordStatus.DRAFT],
        RecordStatus.REJECTED: [RecordStatus.DRAFT, RecordStatus.CONFIRMED, RecordStatus.SUBMITTED],
        RecordStatus.CONFIRMED: [RecordStatus.FROZEN, RecordStatus.REJECTED],
        RecordStatus.FROZEN: [RecordStatus.CONFIRMED],
        RecordStatus.ARCHIVED: [],
    }

    @classmethod
    def can_transition(cls, current: RecordStatus, target: RecordStatus) -> bool:
        return target in cls.VALID_TRANSITIONS.get(current, [])

    @classmethod
    def validate_transition(cls, current: RecordStatus, target: RecordStatus) -> None:
        if not cls.can_transition(current, target):
            raise StateTransitionError(
                f"Invalid state transition: {current.value} -> {target.value}"
            )


class VersionControlService:
    def __init__(self, db: Session):
        self.db = db

    def create_new_version(
        self,
        record: LedgerRecord,
        data_before: Dict[str, Any],
        data_after: Dict[str, Any],
        action: ActionType,
        action_by: str,
        action_by_role: Role,
        action_note: Optional[str] = None,
    ) -> Tuple[AuditLog, List[VersionDiff]]:
        record.version += 1

        audit_log = AuditLog(
            ledger_record_id=record.id,
            action=action,
            action_by=action_by,
            action_by_role=action_by_role,
            action_note=action_note,
            before_data=data_before,
            after_data=data_after,
            version_before=record.version - 1,
            version_after=record.version,
        )
        self.db.add(audit_log)
        self.db.flush()

        diffs = self._calculate_diffs(data_before, data_after, audit_log.id)
        for diff in diffs:
            self.db.add(diff)

        return audit_log, diffs

    def _calculate_diffs(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any],
        audit_log_id: int,
    ) -> List[VersionDiff]:
        diffs = []
        sensitive_fields = {"tax_amount", "duty_amount", "vat_amount", "declared_value"}

        all_keys = set(before.keys()) | set(after.keys())

        for key in all_keys:
            old_val = str(before.get(key, "")) if before.get(key) is not None else None
            new_val = str(after.get(key, "")) if after.get(key) is not None else None

            if old_val != new_val:
                diffs.append(VersionDiff(
                    audit_log_id=audit_log_id,
                    field_name=key,
                    old_value=old_val,
                    new_value=new_val,
                    is_sensitive=key in sensitive_fields,
                ))

        return diffs

    def get_version_history(self, record_id: int) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.ledger_record_id == record_id)
            .order_by(AuditLog.created_at.desc())
            .all()
        )

    def get_version_diffs(self, audit_log_id: int) -> List[VersionDiff]:
        return (
            self.db.query(VersionDiff)
            .filter(VersionDiff.audit_log_id == audit_log_id)
            .all()
        )


class RecordService:
    def __init__(self, db: Session):
        self.db = db
        self.version_service = VersionControlService(db)

    def _check_frozen(self, record: LedgerRecord) -> None:
        if record.is_frozen:
            raise RecordFrozenError(f"Record {record.record_no} is frozen")

    def _record_to_dict(self, record: LedgerRecord) -> Dict[str, Any]:
        data = {
            "record_no": record.record_no,
            "version": record.version,
            "status": record.status.value,
            "tracking_no": record.tracking_no,
            "package_no": record.package_no,
            "customs_no": record.customs_no,
            "current_handler": record.current_handler,
            "final_handler": record.final_handler,
            "change_reason": record.change_reason.value if record.change_reason else None,
            "change_reason_note": record.change_reason_note,
        }

        if record.declaration:
            data.update({
                "declaration_no": record.declaration.declaration_no,
                "hs_code": record.declaration.hs_code,
                "goods_description": record.declaration.goods_description,
                "declared_value": record.declaration.declared_value,
                "tax_amount": record.declaration.tax_amount,
                "duty_amount": record.declaration.duty_amount,
                "vat_amount": record.declaration.vat_amount,
                "is_exception": record.declaration.is_exception,
                "exception_note": record.declaration.exception_note,
                "exception_owner": record.declaration.exception_owner,
            })

        if record.tax_notice:
            data.update({
                "notice_no": record.tax_notice.notice_no,
                "original_tax": record.tax_notice.original_tax,
                "supplementary_tax": record.tax_notice.supplementary_tax,
                "total_tax": record.tax_notice.total_tax,
                "is_paid": record.tax_notice.is_paid,
            })

        return data

    def create_record(
        self,
        record_type: RecordType,
        tracking_no: str,
        created_by: str,
        created_by_role: Role,
        **kwargs,
    ) -> LedgerRecord:
        record_no = self._generate_record_no(record_type)

        record = LedgerRecord(
            record_no=record_no,
            record_type=record_type,
            status=RecordStatus.DRAFT,
            tracking_no=tracking_no,
            package_no=kwargs.get("package_no"),
            customs_no=kwargs.get("customs_no"),
            current_handler=created_by,
        )
        self.db.add(record)
        self.db.flush()

        self._create_type_specific_record(record, record_type, **kwargs)

        data_after = self._record_to_dict(record)
        self.version_service.create_new_version(
            record=record,
            data_before={},
            data_after=data_after,
            action=ActionType.CREATE,
            action_by=created_by,
            action_by_role=created_by_role,
            action_note=f"Created {record_type.value} record",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def _create_type_specific_record(self, record: LedgerRecord, record_type: RecordType, **kwargs):
        if record_type == RecordType.DECLARATION:
            declaration = DeclarationForm(
                ledger_record_id=record.id,
                declaration_no=kwargs.get("declaration_no") or f"DEC{record.record_no}",
                declaration_date=kwargs.get("declaration_date") or datetime.now(),
                declarant=kwargs.get("declarant"),
                exporter=kwargs.get("exporter"),
                importer=kwargs.get("importer"),
                hs_code=kwargs.get("hs_code"),
                goods_description=kwargs.get("goods_description"),
                quantity=kwargs.get("quantity", 0),
                unit=kwargs.get("unit"),
                declared_value=kwargs.get("declared_value", 0),
                currency=kwargs.get("currency", "CNY"),
                weight=kwargs.get("weight", 0),
                origin_country=kwargs.get("origin_country"),
                destination_country=kwargs.get("destination_country"),
                tax_amount=kwargs.get("tax_amount", 0),
                duty_amount=kwargs.get("duty_amount", 0),
                vat_amount=kwargs.get("vat_amount", 0),
                is_exception=kwargs.get("is_exception", False),
                exception_note=kwargs.get("exception_note"),
                exception_owner=kwargs.get("exception_owner"),
            )
            self.db.add(declaration)

        elif record_type == RecordType.TAX_NOTICE:
            tax_notice = TaxNotice(
                ledger_record_id=record.id,
                notice_no=kwargs.get("notice_no") or f"TAX{record.record_no}",
                notice_date=kwargs.get("notice_date") or datetime.now(),
                due_date=kwargs.get("due_date"),
                original_tax=kwargs.get("original_tax", 0),
                supplementary_tax=kwargs.get("supplementary_tax", 0),
                late_fee=kwargs.get("late_fee", 0),
                total_tax=kwargs.get("total_tax", 0),
                payer=kwargs.get("payer"),
            )
            self.db.add(tax_notice)

        elif record_type == RecordType.TRACE_NODE:
            trace_node = TraceNode(
                ledger_record_id=record.id,
                node_type=kwargs.get("node_type") or NodeType.CUSTOMS_DECLARATION,
                node_time=kwargs.get("node_time") or datetime.now(),
                node_location=kwargs.get("node_location"),
                operator=kwargs.get("operator"),
                node_note=kwargs.get("node_note"),
            )
            self.db.add(trace_node)

        elif record_type == RecordType.SUPPLEMENTARY:
            supplementary = SupplementaryRecord(
                ledger_record_id=record.id,
                supplementary_no=kwargs.get("supplementary_no") or f"SUP{record.record_no}",
                supplementary_date=kwargs.get("supplementary_date") or datetime.now(),
                supplementary_by=kwargs.get("supplementary_by"),
                supplementary_type=kwargs.get("supplementary_type"),
                supplementary_note=kwargs.get("supplementary_note"),
                original_field=kwargs.get("original_field"),
                original_value=kwargs.get("original_value"),
                corrected_value=kwargs.get("corrected_value"),
            )
            self.db.add(supplementary)

        elif record_type == RecordType.SHIFT:
            shift = ShiftRecord(
                ledger_record_id=record.id,
                shift_no=kwargs.get("shift_no") or f"SHF{record.record_no}",
                shift_date=kwargs.get("shift_date") or datetime.now(),
                shift_type=kwargs.get("shift_type"),
                operator=kwargs.get("operator"),
                previous_operator=kwargs.get("previous_operator"),
                handover_note=kwargs.get("handover_note"),
            )
            self.db.add(shift)

    def _generate_record_no(self, record_type: RecordType) -> str:
        prefix = {
            RecordType.DECLARATION: "DEC",
            RecordType.TRACE_NODE: "TRC",
            RecordType.TAX_NOTICE: "TAX",
            RecordType.SUPPLEMENTARY: "SUP",
            RecordType.SHIFT: "SHF",
        }.get(record_type, "LED")

        count = self.db.query(LedgerRecord).filter(LedgerRecord.record_type == record_type).count()
        return f"{prefix}{datetime.now().strftime('%Y%m%d')}{count + 1:06d}"

    def submit_record(
        self,
        record_id: int,
        submitted_by: str,
        submitted_by_role: Role,
        note: Optional[str] = None,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        self._check_frozen(record)
        StateMachine.validate_transition(record.status, RecordStatus.SUBMITTED)

        data_before = self._record_to_dict(record)
        record.status = RecordStatus.SUBMITTED
        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.SUBMIT,
            action_by=submitted_by,
            action_by_role=submitted_by_role,
            action_note=note or "Record submitted for review",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def reject_record(
        self,
        record_id: int,
        rejected_by: str,
        rejected_by_role: Role,
        rejection_reason: str,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        self._check_frozen(record)
        StateMachine.validate_transition(record.status, RecordStatus.REJECTED)

        data_before = self._record_to_dict(record)
        record.status = RecordStatus.REJECTED
        record.change_reason_note = rejection_reason
        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.REJECT,
            action_by=rejected_by,
            action_by_role=rejected_by_role,
            action_note=f"Rejected: {rejection_reason}",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def confirm_record(
        self,
        record_id: int,
        confirmed_by: str,
        confirmed_by_role: Role,
        note: Optional[str] = None,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        self._check_frozen(record)
        StateMachine.validate_transition(record.status, RecordStatus.CONFIRMED)

        data_before = self._record_to_dict(record)
        record.status = RecordStatus.CONFIRMED
        record.final_handler = confirmed_by
        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.CONFIRM,
            action_by=confirmed_by,
            action_by_role=confirmed_by_role,
            action_note=note or "Record confirmed",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def recall_record(
        self,
        record_id: int,
        recalled_by: str,
        recalled_by_role: Role,
        reason: str,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        self._check_frozen(record)

        if record.status not in [RecordStatus.SUBMITTED, RecordStatus.REJECTED]:
            raise StateTransitionError(f"Cannot recall record in {record.status.value} state")

        data_before = self._record_to_dict(record)
        record.status = RecordStatus.DRAFT
        record.change_reason_note = reason
        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.RECALL,
            action_by=recalled_by,
            action_by_role=recalled_by_role,
            action_note=f"Recalled: {reason}",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def freeze_record(
        self,
        record_id: int,
        frozen_by: str,
        frozen_by_role: Role,
        reason: str,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        if record.status != RecordStatus.CONFIRMED:
            raise StateTransitionError("Only confirmed records can be frozen")

        data_before = self._record_to_dict(record)
        record.is_frozen = True
        record.status = RecordStatus.FROZEN
        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.FREEZE,
            action_by=frozen_by,
            action_by_role=frozen_by_role,
            action_note=f"Frozen for export: {reason}",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def unfreeze_record(
        self,
        record_id: int,
        unfrozen_by: str,
        unfrozen_by_role: Role,
        reason: str,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        if not record.is_frozen:
            raise ValueError("Record is not frozen")

        data_before = self._record_to_dict(record)
        record.is_frozen = False
        record.status = RecordStatus.CONFIRMED
        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.UNFREEZE,
            action_by=unfrozen_by,
            action_by_role=unfrozen_by_role,
            action_note=f"Unfrozen: {reason}",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def update_record(
        self,
        record_id: int,
        updated_by: str,
        updated_by_role: Role,
        change_reason=None,
        change_reason_note: Optional[str] = None,
        **kwargs,
    ) -> LedgerRecord:
        record = self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()
        if not record:
            raise ValueError(f"Record {record_id} not found")

        self._check_frozen(record)

        if record.status not in [RecordStatus.DRAFT, RecordStatus.REJECTED]:
            raise StateTransitionError(
                f"Cannot update record in {record.status.value} state"
            )

        data_before = self._record_to_dict(record)

        if "tracking_no" in kwargs:
            record.tracking_no = kwargs["tracking_no"]
        if "package_no" in kwargs:
            record.package_no = kwargs["package_no"]
        if "customs_no" in kwargs:
            record.customs_no = kwargs["customs_no"]
        if change_reason:
            record.change_reason = change_reason
        if change_reason_note:
            record.change_reason_note = change_reason_note

        if record.declaration:
            for field in [
                "hs_code", "goods_description", "quantity", "declared_value",
                "tax_amount", "duty_amount", "vat_amount", "is_exception",
                "exception_note", "exception_owner"
            ]:
                if field in kwargs:
                    setattr(record.declaration, field, kwargs[field])

        if record.tax_notice:
            for field in [
                "original_tax", "supplementary_tax", "late_fee", "total_tax", "is_paid"
            ]:
                if field in kwargs:
                    setattr(record.tax_notice, field, kwargs[field])

        data_after = self._record_to_dict(record)

        self.version_service.create_new_version(
            record=record,
            data_before=data_before,
            data_after=data_after,
            action=ActionType.UPDATE,
            action_by=updated_by,
            action_by_role=updated_by_role,
            action_note=change_reason_note or "Record updated",
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def get_record(self, record_id: int) -> Optional[LedgerRecord]:
        return self.db.query(LedgerRecord).filter(LedgerRecord.id == record_id).first()

    def get_record_by_no(self, record_no: str) -> Optional[LedgerRecord]:
        return self.db.query(LedgerRecord).filter(LedgerRecord.record_no == record_no).first()

    def list_records(
        self,
        status: Optional[RecordStatus] = None,
        record_type: Optional[RecordType] = None,
        tracking_no: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[LedgerRecord]:
        query = self.db.query(LedgerRecord)

        if status:
            query = query.filter(LedgerRecord.status == status)
        if record_type:
            query = query.filter(LedgerRecord.record_type == record_type)
        if tracking_no:
            query = query.filter(LedgerRecord.tracking_no == tracking_no)

        return query.order_by(LedgerRecord.created_at.desc()).offset(skip).limit(limit).all()
