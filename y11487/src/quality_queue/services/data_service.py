from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
import json
import csv
from io import StringIO

from ..models import (
    Inspection, ReworkOrder, MachineShift, ExceptionRecord,
    RecordSource, CompensationQueue, SessionLocal
)
from ..utils.json_utils import to_json_serializable
from .data_validator import DataValidator


class DataService:
    def __init__(self, db: Session):
        self.db = db
        self.validator = DataValidator(db)

    def create_machine_shift(self, data: Dict[str, Any]) -> Tuple[Optional[MachineShift], List[Any]]:
        is_valid, dirty_records = self.validator.validate_machine_shift(data)

        if isinstance(data.get("shift_date"), str):
            from dateutil import parser
            data["shift_date"] = parser.parse(data["shift_date"]).date()
        if "start_time" in data and isinstance(data["start_time"], str):
            from dateutil import parser
            data["start_time"] = parser.parse(data["start_time"])
        if "end_time" in data and isinstance(data["end_time"], str):
            from dateutil import parser
            data["end_time"] = parser.parse(data["end_time"])

        shift = MachineShift(
            shift_code=data["shift_code"],
            machine_no=data.get("machine_no", ""),
            shift_date=data.get("shift_date"),
            shift_type=data.get("shift_type", ""),
            operator=data.get("operator", ""),
            team_leader=data.get("team_leader", ""),
            start_time=data.get("start_time"),
            end_time=data.get("end_time"),
            target_quantity=data.get("target_quantity", 0),
            actual_quantity=data.get("actual_quantity", 0),
            defect_quantity=data.get("defect_quantity", 0),
            base_yield_rate=data.get("base_yield_rate", 0.0),
            raw_data=to_json_serializable(data)
        )

        self.db.add(shift)
        self.db.flush()
        return shift, dirty_records

    def create_inspection(self, data: Dict[str, Any]) -> Tuple[Optional[Inspection], List[Any]]:
        is_valid, dirty_records = self.validator.validate_inspection(data)

        shift = None
        if "shift_code" in data and data["shift_code"]:
            shift = self.db.query(MachineShift).filter(
                MachineShift.shift_code == data["shift_code"]
            ).first()

        if isinstance(data.get("inspection_date"), str):
            from dateutil import parser
            data["inspection_date"] = parser.parse(data["inspection_date"]).date()

        inspection = Inspection(
            inspection_no=data["inspection_no"],
            shift_id=shift.id if shift else None,
            machine_no=data.get("machine_no", ""),
            inspection_date=data.get("inspection_date"),
            inspector=data.get("inspector", ""),
            batch_no=data.get("batch_no", ""),
            style_no=data.get("style_no", ""),
            fabric_type=data.get("fabric_type", ""),
            sample_size=data.get("sample_size", 0),
            defect_count=data.get("defect_count", 0),
            defect_rate=data.get("defect_rate", 0.0),
            is_qualified=data.get("is_qualified", True),
            raw_data=to_json_serializable(data)
        )

        self.db.add(inspection)
        self.db.flush()
        return inspection, dirty_records

    def create_rework_order(self, data: Dict[str, Any]) -> Tuple[Optional[ReworkOrder], List[Any]]:
        is_valid, dirty_records = self.validator.validate_rework_order(data)

        inspection = None
        if "inspection_no" in data and data["inspection_no"]:
            inspection = self.db.query(Inspection).filter(
                Inspection.inspection_no == data["inspection_no"]
            ).first()

        shift = None
        if "shift_code" in data and data["shift_code"]:
            shift = self.db.query(MachineShift).filter(
                MachineShift.shift_code == data["shift_code"]
            ).first()

        parent_rework = None
        if "parent_rework_no" in data and data["parent_rework_no"]:
            parent_rework = self.db.query(ReworkOrder).filter(
                ReworkOrder.rework_no == data["parent_rework_no"]
            ).first()

        if isinstance(data.get("rework_date"), str):
            from dateutil import parser
            data["rework_date"] = parser.parse(data["rework_date"]).date()

        rework_order = ReworkOrder(
            rework_no=data["rework_no"],
            inspection_id=inspection.id if inspection else None,
            shift_id=shift.id if shift else None,
            parent_rework_id=parent_rework.id if parent_rework else None,
            rework_date=data.get("rework_date"),
            machine_no=data.get("machine_no", ""),
            defect_type=data.get("defect_type", ""),
            defect_description=data.get("defect_description", ""),
            rework_quantity=data.get("rework_quantity", 0),
            rework_operator=data.get("rework_operator", ""),
            rework_team=data.get("rework_team", ""),
            compensation_amount=data.get("compensation_amount", 0.0),
            is_reworked=data.get("is_reworked", False),
            rework_pass_count=data.get("rework_pass_count", 0),
            rework_fail_count=data.get("rework_fail_count", 0),
            rework_count=data.get("rework_count", 1),
            responsible_shift_code=data.get("responsible_shift_code", ""),
            raw_data=to_json_serializable(data)
        )

        self.db.add(rework_order)
        self.db.flush()
        return rework_order, dirty_records

    def create_exception_record(self, data: Dict[str, Any]) -> ExceptionRecord:
        inspection = None
        if "inspection_no" in data and data["inspection_no"]:
            inspection = self.db.query(Inspection).filter(
                Inspection.inspection_no == data["inspection_no"]
            ).first()

        rework_order = None
        if "rework_no" in data and data["rework_no"]:
            rework_order = self.db.query(ReworkOrder).filter(
                ReworkOrder.rework_no == data["rework_no"]
            ).first()

        shift = None
        if "shift_code" in data and data["shift_code"]:
            shift = self.db.query(MachineShift).filter(
                MachineShift.shift_code == data["shift_code"]
            ).first()

        if isinstance(data.get("record_date"), str):
            from dateutil import parser
            data["record_date"] = parser.parse(data["record_date"]).date()

        if isinstance(data.get("sent_at"), str):
            from dateutil import parser
            data["sent_at"] = parser.parse(data["sent_at"])

        record = ExceptionRecord(
            record_no=data.get("record_no", self._generate_record_no()),
            source=RecordSource(data.get("source", "sms")),
            inspection_id=inspection.id if inspection else None,
            rework_order_id=rework_order.id if rework_order else None,
            shift_id=shift.id if shift else None,
            record_date=data.get("record_date"),
            machine_no=data.get("machine_no", ""),
            defect_type=data.get("defect_type", ""),
            description=data.get("description", ""),
            photo_path=data.get("photo_path", ""),
            sms_content=data.get("sms_content", ""),
            sender=data.get("sender", ""),
            sent_at=data.get("sent_at"),
            is_verified=data.get("is_verified", False),
            verified_by=data.get("verified_by", ""),
            raw_data=to_json_serializable(data)
        )

        self.db.add(record)
        self.db.flush()
        return record

    def _generate_record_no(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        import random
        suffix = f"{random.randint(1000, 9999):04d}"
        return f"EX{timestamp}{suffix}"


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_queue_to_csv(self, status: Optional[str] = None) -> str:
        from ..models import QueueStatus
        query = self.db.query(CompensationQueue)
        if status:
            query = query.filter(CompensationQueue.status == QueueStatus(status))

        queue_items = query.all()

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "队列编号", "状态", "重试分类", "机台号", "责任班次", "原始班次",
            "缺陷类型", "补偿金额", "补偿数量", "重试次数", "创建时间", "更新时间"
        ])

        for item in queue_items:
            writer.writerow([
                item.queue_no,
                item.status.value if item.status else "",
                item.retry_category.value if item.retry_category else "",
                item.machine_no or "",
                item.responsible_shift_code or "",
                item.original_shift_code or "",
                item.defect_type or "",
                item.compensation_amount,
                item.compensation_quantity,
                item.retry_count,
                item.created_at.isoformat() if item.created_at else "",
                item.updated_at.isoformat() if item.updated_at else "",
            ])

        return output.getvalue()

    def export_queue_to_excel(self, filepath: str, status: Optional[str] = None) -> bool:
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill

            wb = Workbook()
            ws = wb.active
            ws.title = "补偿队列"

            headers = [
                "队列编号", "状态", "重试分类", "机台号", "责任班次", "原始班次",
                "缺陷类型", "补偿金额", "补偿数量", "重试次数", "创建时间", "更新时间"
            ]

            header_fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
            header_font = Font(bold=True)

            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.fill = header_fill
                cell.font = header_font

            from ..models import QueueStatus
            query = self.db.query(CompensationQueue)
            if status:
                query = query.filter(CompensationQueue.status == QueueStatus(status))

            queue_items = query.all()

            for row, item in enumerate(queue_items, 2):
                ws.cell(row=row, column=1, value=item.queue_no)
                ws.cell(row=row, column=2, value=item.status.value if item.status else "")
                ws.cell(row=row, column=3, value=item.retry_category.value if item.retry_category else "")
                ws.cell(row=row, column=4, value=item.machine_no or "")
                ws.cell(row=row, column=5, value=item.responsible_shift_code or "")
                ws.cell(row=row, column=6, value=item.original_shift_code or "")
                ws.cell(row=row, column=7, value=item.defect_type or "")
                ws.cell(row=row, column=8, value=item.compensation_amount)
                ws.cell(row=row, column=9, value=item.compensation_quantity)
                ws.cell(row=row, column=10, value=item.retry_count)
                ws.cell(row=row, column=11, value=item.created_at.isoformat() if item.created_at else "")
                ws.cell(row=row, column=12, value=item.updated_at.isoformat() if item.updated_at else "")

            for col in range(1, len(headers) + 1):
                ws.column_dimensions[chr(64 + col)].width = 18

            wb.save(filepath)
            return True
        except Exception as e:
            print(f"Export error: {e}")
            return False

    def get_queue_detail(self, queue_id: int) -> Dict[str, Any]:
        item = self.db.query(CompensationQueue).filter(
            CompensationQueue.id == queue_id
        ).first()

        if not item:
            return {}

        result = {
            "id": item.id,
            "queue_no": item.queue_no,
            "status": item.status.value if item.status else None,
            "retry_category": item.retry_category.value if item.retry_category else None,
            "machine_no": item.machine_no,
            "responsible_shift_code": item.responsible_shift_code,
            "original_shift_code": item.original_shift_code,
            "defect_type": item.defect_type,
            "compensation_amount": item.compensation_amount,
            "compensation_quantity": item.compensation_quantity,
            "retry_count": item.retry_count,
            "max_retries": item.max_retries,
            "last_error": item.last_error,
            "manual_handler": item.manual_handler,
            "manual_note": item.manual_note,
            "compensated_at": item.compensated_at.isoformat() if item.compensated_at else None,
            "compensated_by": item.compensated_by,
            "closed_at": item.closed_at.isoformat() if item.closed_at else None,
            "closed_by": item.closed_by,
            "close_reason": item.close_reason,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            "raw_context": item.raw_context,
            "sources": {},
            "audit_logs": []
        }

        if item.inspection:
            result["sources"]["inspection"] = {
                "inspection_no": item.inspection.inspection_no,
                "batch_no": item.inspection.batch_no,
                "inspector": item.inspection.inspector,
                "defect_count": item.inspection.defect_count,
            }

        if item.rework_order:
            result["sources"]["rework_order"] = {
                "rework_no": item.rework_order.rework_no,
                "defect_type": item.rework_order.defect_type,
                "rework_count": item.rework_order.rework_count,
                "rework_operator": item.rework_order.rework_operator,
            }

        if item.exception_record:
            result["sources"]["exception"] = {
                "record_no": item.exception_record.record_no,
                "source": item.exception_record.source.value,
                "description": item.exception_record.description,
                "has_photo": bool(item.exception_record.photo_path),
                "has_sms": bool(item.exception_record.sms_content),
            }

        for log in item.audit_logs:
            result["audit_logs"].append({
                "action": log.action,
                "operator": log.operator,
                "operator_role": log.operator_role,
                "is_allowed": log.is_allowed,
                "deny_reason": log.deny_reason,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "old_value": log.old_value,
                "new_value": log.new_value,
            })

        return result
