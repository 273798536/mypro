from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd

from ..models import (
    LedgerRecord, RecordStatus, RecordType, Role,
    AuditLog, VersionDiff, ChangeReason
)
from .audit_service import RoleViewService, AuditService


class ExportService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)

    def _record_to_export_dict(
        self,
        record: LedgerRecord,
        include_history: bool = False,
        desensitize: bool = False,
    ) -> Dict[str, Any]:
        data = {
            "record_no": record.record_no,
            "version": record.version,
            "record_type": record.record_type.value,
            "status": record.status.value,
            "is_frozen": record.is_frozen,
            "tracking_no": record.tracking_no,
            "package_no": record.package_no,
            "customs_no": record.customs_no,
            "current_handler": record.current_handler,
            "final_handler": record.final_handler,
            "change_reason": record.change_reason.value if record.change_reason else None,
            "change_reason_note": record.change_reason_note,
            "import_source": record.import_source_id,
            "import_row": record.import_row_number,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        }

        if record.declaration:
            data.update({
                "declaration_no": record.declaration.declaration_no,
                "declaration_date": record.declaration.declaration_date.isoformat() if record.declaration.declaration_date else None,
                "declarant": record.declaration.declarant,
                "hs_code": record.declaration.hs_code,
                "goods_description": record.declaration.goods_description,
                "quantity": record.declaration.quantity,
                "unit": record.declaration.unit,
                "declared_value": "***" if desensitize else record.declaration.declared_value,
                "currency": record.declaration.currency,
                "weight": record.declaration.weight,
                "origin_country": record.declaration.origin_country,
                "destination_country": record.declaration.destination_country,
                "tax_amount": "***" if desensitize else record.declaration.tax_amount,
                "duty_amount": "***" if desensitize else record.declaration.duty_amount,
                "vat_amount": "***" if desensitize else record.declaration.vat_amount,
                "is_exception": record.declaration.is_exception,
                "exception_note": record.declaration.exception_note,
                "exception_owner": record.declaration.exception_owner,
            })

        if record.tax_notice:
            data.update({
                "notice_no": record.tax_notice.notice_no,
                "notice_type": record.tax_notice.notice_type.value if record.tax_notice.notice_type else None,
                "notice_date": record.tax_notice.notice_date.isoformat() if record.tax_notice.notice_date else None,
                "original_tax": "***" if desensitize else record.tax_notice.original_tax,
                "supplementary_tax": "***" if desensitize else record.tax_notice.supplementary_tax,
                "late_fee": "***" if desensitize else record.tax_notice.late_fee,
                "total_tax": "***" if desensitize else record.tax_notice.total_tax,
                "is_paid": record.tax_notice.is_paid,
                "payer": record.tax_notice.payer,
            })

        if record.trace_node:
            data.update({
                "node_type": record.trace_node.node_type.value if record.trace_node.node_type else None,
                "node_time": record.trace_node.node_time.isoformat() if record.trace_node.node_time else None,
                "node_location": record.trace_node.node_location,
                "operator": record.trace_node.operator,
                "node_note": record.trace_node.node_note,
            })

        if record.supplementary:
            data.update({
                "supplementary_no": record.supplementary.supplementary_no,
                "supplementary_date": record.supplementary.supplementary_date.isoformat() if record.supplementary.supplementary_date else None,
                "supplementary_by": record.supplementary.supplementary_by,
                "supplementary_type": record.supplementary.supplementary_type,
                "supplementary_note": record.supplementary.supplementary_note,
                "original_field": record.supplementary.original_field,
                "original_value": "***" if desensitize else record.supplementary.original_value,
                "corrected_value": "***" if desensitize else record.supplementary.corrected_value,
            })

        if record.shift:
            data.update({
                "shift_no": record.shift.shift_no,
                "shift_date": record.shift.shift_date.isoformat() if record.shift.shift_date else None,
                "shift_type": record.shift.shift_type,
                "operator": record.shift.operator,
                "previous_operator": record.shift.previous_operator,
                "handover_note": record.shift.handover_note,
            })

        if include_history:
            history = self.audit_service.get_record_history(record.id, desensitize=desensitize)
            data["change_history"] = [h.to_dict(desensitize) for h in history]

        return data

    def export_records(
        self,
        record_ids: Optional[List[int]] = None,
        status: Optional[RecordStatus] = None,
        record_type: Optional[RecordType] = None,
        tracking_no: Optional[str] = None,
        include_history: bool = False,
        desensitize: bool = False,
        role: Optional[Role] = None,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(LedgerRecord)

        if record_ids:
            query = query.filter(LedgerRecord.id.in_(record_ids))
        if status:
            query = query.filter(LedgerRecord.status == status)
        if record_type:
            query = query.filter(LedgerRecord.record_type == record_type)
        if tracking_no:
            query = query.filter(LedgerRecord.tracking_no == tracking_no)

        records = query.order_by(LedgerRecord.created_at.desc()).all()

        result = [
            self._record_to_export_dict(r, include_history=include_history, desensitize=desensitize)
            for r in records
        ]

        if role:
            result = RoleViewService.filter_records_for_role(result, role)

        return result

    def export_to_excel(
        self,
        output_path: Optional[str] = None,
        record_ids: Optional[List[int]] = None,
        status: Optional[RecordStatus] = None,
        record_type: Optional[RecordType] = None,
        include_history: bool = False,
        desensitize: bool = False,
        role: Optional[Role] = None,
    ) -> Tuple[bytes, int]:
        records = self.export_records(
            record_ids=record_ids,
            status=status,
            record_type=record_type,
            include_history=False,
            desensitize=desensitize,
            role=role,
        )

        if not records:
            return b"", 0

        main_df = pd.DataFrame(records)

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            main_df.to_excel(writer, sheet_name="台账记录", index=False)

            if include_history:
                all_history = []
                for record_data in records:
                    record_id = next(
                        (r.id for r in self.db.query(LedgerRecord).all()
                         if r.record_no == record_data["record_no"]),
                        None
                    )
                    if record_id:
                        history = self.audit_service.get_record_history(record_id, desensitize=desensitize)
                        for h in history:
                            h_dict = h.to_dict(desensitize)
                            for diff in h_dict["diffs"]:
                                all_history.append({
                                    "record_no": record_data["record_no"],
                                    "action": h_dict["action"],
                                    "action_by": h_dict["action_by"],
                                    "action_by_role": h_dict["action_by_role"],
                                    "action_time": h_dict["action_time"],
                                    "version_before": h_dict["version_before"],
                                    "version_after": h_dict["version_after"],
                                    "field_name": diff["field_name"],
                                    "old_value": diff["old_value"],
                                    "new_value": diff["new_value"],
                                    "is_sensitive": diff["is_sensitive"],
                                })

                if all_history:
                    history_df = pd.DataFrame(all_history)
                    history_df.to_excel(writer, sheet_name="变更历史", index=False)

                change_reasons = self._get_change_reasons_summary(record_ids)
                if change_reasons:
                    reasons_df = pd.DataFrame(change_reasons)
                    reasons_df.to_excel(writer, sheet_name="变更原因", index=False)

        output.seek(0)
        result = output.getvalue()

        if output_path:
            with open(output_path, "wb") as f:
                f.write(result)

        return result, len(records)

    def _get_change_reasons_summary(
        self,
        record_ids: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(LedgerRecord)
        if record_ids:
            query = query.filter(LedgerRecord.id.in_(record_ids))
        records = query.all()

        summary = []
        for record in records:
            reasons = self.audit_service.get_change_reason_summary(record.id)
            for r in reasons:
                summary.append({
                    "record_no": record.record_no,
                    "tracking_no": record.tracking_no,
                    **r,
                })

        return summary

    def generate_exception_report(
        self,
        desensitize: bool = False,
        role: Optional[Role] = None,
    ) -> Dict[str, Any]:
        records = self.db.query(LedgerRecord).all()
        exception_records = []

        for record in records:
            if record.declaration and record.declaration.is_exception:
                data = self._record_to_export_dict(record, desensitize=desensitize)
                if role:
                    data = RoleViewService.filter_record_for_role(data, role)
                exception_records.append(data)

        owner_summary = {}
        for rec in exception_records:
            owner = rec.get("exception_owner") or "未分配"
            if owner not in owner_summary:
                owner_summary[owner] = 0
            owner_summary[owner] += 1

        return {
            "total_exceptions": len(exception_records),
            "exception_by_owner": owner_summary,
            "exception_records": exception_records,
            "generated_at": datetime.now().isoformat(),
        }

    def generate_manager_dashboard(
        self,
    ) -> Dict[str, Any]:
        records = self.db.query(LedgerRecord).all()

        status_summary = {}
        type_summary = {}
        handler_summary = {}
        total_tax = 0
        total_value = 0

        for record in records:
            status = record.status.value
            status_summary[status] = status_summary.get(status, 0) + 1

            rtype = record.record_type.value
            type_summary[rtype] = type_summary.get(rtype, 0) + 1

            handler = record.current_handler or "未分配"
            handler_summary[handler] = handler_summary.get(handler, 0) + 1

            if record.declaration:
                total_tax += record.declaration.tax_amount or 0
                total_value += record.declaration.declared_value or 0

        return {
            "total_records": len(records),
            "status_summary": status_summary,
            "type_summary": type_summary,
            "handler_summary": handler_summary,
            "total_declared_value": total_value,
            "total_tax_amount": total_tax,
            "generated_at": datetime.now().isoformat(),
        }
