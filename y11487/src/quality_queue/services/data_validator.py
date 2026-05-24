from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from dateutil import parser as date_parser

from ..models import (
    DirtyRecord, DirtyType, RecordSource,
    Inspection, ReworkOrder, MachineShift, ExceptionRecord,
    DataHistory, CompensationQueue
)
from ..utils.json_utils import to_json_serializable


class DataValidator:
    def __init__(self, db: Session):
        self.db = db

    def _create_dirty_record(self, source_type: RecordSource, dirty_type: DirtyType,
                             source_id: str, field_name: str, original_value: str,
                             raw_content: Dict[str, Any], conflict_info: Optional[Dict] = None,
                             processing_opinion: str = "") -> DirtyRecord:
        dirty = DirtyRecord(
            source_type=source_type,
            dirty_type=dirty_type,
            source_id=source_id,
            field_name=field_name,
            original_value=original_value,
            conflict_info=conflict_info,
            processing_opinion=processing_opinion,
            raw_content=raw_content
        )
        self.db.add(dirty)
        self.db.flush()
        return dirty

    def _save_data_history(self, resource_type: str, resource_id: str,
                           data_snapshot: Dict[str, Any], change_reason: str,
                           changed_by: str) -> DataHistory:
        last_history = self.db.query(DataHistory).filter(
            DataHistory.resource_type == resource_type,
            DataHistory.resource_id == resource_id
        ).order_by(DataHistory.version.desc()).first()

        version = (last_history.version + 1) if last_history else 1

        history = DataHistory(
            resource_type=resource_type,
            resource_id=resource_id,
            version=version,
            data_snapshot=to_json_serializable(data_snapshot),
            change_reason=change_reason,
            changed_by=changed_by
        )
        self.db.add(history)
        self.db.flush()
        return history

    def _recalculate_related_queue_items(self, source_type: str, source_id: str):
        if source_type == "inspection":
            queue_items = self.db.query(CompensationQueue).filter(
                CompensationQueue.inspection_id == source_id
            ).all()
            for item in queue_items:
                inspection = self.db.query(Inspection).filter(
                    Inspection.id == source_id
                ).first()
                if inspection:
                    item.compensation_quantity = inspection.defect_count
                    item.machine_no = inspection.machine_no
                    if inspection.shift:
                        item.responsible_shift_code = inspection.shift.shift_code
                        item.original_shift_code = inspection.shift.shift_code

        elif source_type == "rework":
            queue_items = self.db.query(CompensationQueue).filter(
                CompensationQueue.rework_order_id == source_id
            ).all()
            for item in queue_items:
                rework = self.db.query(ReworkOrder).filter(
                    ReworkOrder.id == source_id
                ).first()
                if rework:
                    item.defect_type = rework.defect_type
                    item.machine_no = rework.machine_no
                    item.compensation_amount = rework.compensation_amount
                    item.compensation_quantity = rework.rework_quantity
                    item.responsible_shift_code = rework.responsible_shift_code

        elif source_type == "shift":
            shift = self.db.query(MachineShift).filter(
                MachineShift.id == source_id
            ).first()
            if shift:
                queue_items = self.db.query(CompensationQueue).filter(
                    CompensationQueue.original_shift_code == shift.shift_code
                ).all()
                for item in queue_items:
                    item.original_shift_code = shift.shift_code

        self.db.flush()

    def _parse_field_value(self, field_name: str, value: str) -> Any:
        if "date" in field_name.lower() or "_at" in field_name.lower():
            try:
                return date_parser.parse(value).date()
            except:
                return value
        if "quantity" in field_name.lower() or "count" in field_name.lower():
            try:
                return int(value)
            except:
                return value
        if "amount" in field_name.lower() or "rate" in field_name.lower():
            try:
                return float(value)
            except:
                return value
        if field_name.lower() in ["is_qualified", "is_verified", "is_reworked", "is_active"]:
            return value.lower() in ["true", "1", "yes", "是"]
        return value

    def _get_source_record(self, source_type: RecordSource, source_id: str):
        if source_type == RecordSource.INSPECTION:
            return self.db.query(Inspection).filter(
                Inspection.inspection_no == source_id
            ).first()
        elif source_type == RecordSource.REWORK:
            return self.db.query(ReworkOrder).filter(
                ReworkOrder.rework_no == source_id
            ).first()
        elif source_type == RecordSource.SHIFT:
            return self.db.query(MachineShift).filter(
                MachineShift.shift_code == source_id
            ).first()
        elif source_type == RecordSource.SMS:
            return self.db.query(ExceptionRecord).filter(
                ExceptionRecord.record_no == source_id
            ).first()
        return None

    def _get_source_id_field(self, source_type: RecordSource) -> str:
        id_fields = {
            RecordSource.INSPECTION: "inspection_no",
            RecordSource.REWORK: "rework_no",
            RecordSource.SHIFT: "shift_code",
            RecordSource.SMS: "record_no",
        }
        return id_fields.get(source_type, "id")

    def validate_inspection(self, data: Dict[str, Any]) -> Tuple[bool, List[DirtyRecord]]:
        dirty_records = []
        source_id = data.get("inspection_no", "unknown")

        required_fields = ["inspection_no", "machine_no", "inspection_date", "sample_size"]
        for field in required_fields:
            if field not in data or data[field] in (None, "", 0):
                dirty = self._create_dirty_record(
                    source_type=RecordSource.INSPECTION,
                    dirty_type=DirtyType.MISSING_FIELD,
                    source_id=source_id,
                    field_name=field,
                    original_value=str(data.get(field, "")),
                    raw_content=data,
                    processing_opinion=f"缺少必填字段 {field}，请补充后重新提交"
                )
                dirty_records.append(dirty)

        if "inspection_date" in data and data["inspection_date"]:
            try:
                if isinstance(data["inspection_date"], str):
                    parsed_date = date_parser.parse(data["inspection_date"]).date()
                else:
                    parsed_date = data["inspection_date"]

                today = date.today()
                days_diff = (today - parsed_date).days

                if days_diff > 7 or days_diff < -1:
                    dirty = self._create_dirty_record(
                        source_type=RecordSource.INSPECTION,
                        dirty_type=DirtyType.CROSS_DAY,
                        source_id=source_id,
                        field_name="inspection_date",
                        original_value=str(data["inspection_date"]),
                        raw_content=data,
                        conflict_info={"days_diff": days_diff},
                        processing_opinion=f"日期异常，与今日相差 {days_diff} 天，请确认日期正确性"
                    )
                    dirty_records.append(dirty)
            except Exception as e:
                dirty = self._create_dirty_record(
                    source_type=RecordSource.INSPECTION,
                    dirty_type=DirtyType.MISSING_FIELD,
                    source_id=source_id,
                    field_name="inspection_date",
                    original_value=str(data.get("inspection_date", "")),
                    raw_content=data,
                    processing_opinion=f"日期格式错误: {str(e)}"
                )
                dirty_records.append(dirty)

        if "defect_count" in data and "sample_size" in data:
            defect_count = data.get("defect_count", 0) or 0
            sample_size = data.get("sample_size", 0) or 0
            if defect_count > sample_size:
                dirty = self._create_dirty_record(
                    source_type=RecordSource.INSPECTION,
                    dirty_type=DirtyType.QUANTITY_CONFLICT,
                    source_id=source_id,
                    field_name="defect_count,sample_size",
                    original_value=f"defect_count={defect_count},sample_size={sample_size}",
                    raw_content=data,
                    conflict_info={"defect_count": defect_count, "sample_size": sample_size},
                    processing_opinion="缺陷数不能大于抽样数，请检查数据"
                )
                dirty_records.append(dirty)

        return len(dirty_records) == 0, dirty_records

    def validate_rework_order(self, data: Dict[str, Any]) -> Tuple[bool, List[DirtyRecord]]:
        dirty_records = []
        source_id = data.get("rework_no", "unknown")

        required_fields = ["rework_no", "machine_no", "rework_date", "defect_type", "rework_quantity"]
        for field in required_fields:
            if field not in data or data[field] in (None, "", 0):
                dirty = self._create_dirty_record(
                    source_type=RecordSource.REWORK,
                    dirty_type=DirtyType.MISSING_FIELD,
                    source_id=source_id,
                    field_name=field,
                    original_value=str(data.get(field, "")),
                    raw_content=data,
                    processing_opinion=f"缺少必填字段 {field}，请补充后重新提交"
                )
                dirty_records.append(dirty)

        if "rework_operator" in data and data["rework_operator"]:
            existing_reworks = self.db.query(ReworkOrder).filter(
                ReworkOrder.rework_no != data.get("rework_no", ""),
                ReworkOrder.machine_no == data.get("machine_no"),
                ReworkOrder.rework_date == data.get("rework_date")
            ).all()

            for rw in existing_reworks:
                if rw.rework_operator and rw.rework_operator != data["rework_operator"]:
                    dirty = self._create_dirty_record(
                        source_type=RecordSource.REWORK,
                        dirty_type=DirtyType.NAME_CHANGED,
                        source_id=source_id,
                        field_name="rework_operator",
                        original_value=data["rework_operator"],
                        raw_content=data,
                        conflict_info={
                            "existing_operator": rw.rework_operator,
                            "conflict_rework_no": rw.rework_no
                        },
                        processing_opinion=f"同一机台同一日期出现不同操作员：{rw.rework_operator} vs {data['rework_operator']}，请确认"
                    )
                    dirty_records.append(dirty)
                    break

        if "compensation_amount" in data and data["compensation_amount"]:
            amount = data["compensation_amount"]
            if amount < 0:
                dirty = self._create_dirty_record(
                    source_type=RecordSource.REWORK,
                    dirty_type=DirtyType.AMOUNT_CONFLICT,
                    source_id=source_id,
                    field_name="compensation_amount",
                    original_value=str(amount),
                    raw_content=data,
                    conflict_info={"amount": amount},
                    processing_opinion="补偿金额不能为负数"
                )
                dirty_records.append(dirty)

        if "rework_quantity" in data and data["rework_quantity"]:
            qty = data["rework_quantity"]
            if qty <= 0:
                dirty = self._create_dirty_record(
                    source_type=RecordSource.REWORK,
                    dirty_type=DirtyType.QUANTITY_CONFLICT,
                    source_id=source_id,
                    field_name="rework_quantity",
                    original_value=str(qty),
                    raw_content=data,
                    conflict_info={"rework_quantity": qty},
                    processing_opinion="返工数量必须大于0"
                )
                dirty_records.append(dirty)

        return len(dirty_records) == 0, dirty_records

    def validate_machine_shift(self, data: Dict[str, Any]) -> Tuple[bool, List[DirtyRecord]]:
        dirty_records = []
        source_id = data.get("shift_code", "unknown")

        required_fields = ["shift_code", "machine_no", "shift_date", "shift_type"]
        for field in required_fields:
            if field not in data or data[field] in (None, ""):
                dirty = self._create_dirty_record(
                    source_type=RecordSource.SHIFT,
                    dirty_type=DirtyType.MISSING_FIELD,
                    source_id=source_id,
                    field_name=field,
                    original_value=str(data.get(field, "")),
                    raw_content=data,
                    processing_opinion=f"缺少必填字段 {field}，请补充后重新提交"
                )
                dirty_records.append(dirty)

        if "actual_quantity" in data and "defect_quantity" in data:
            actual = data.get("actual_quantity", 0) or 0
            defect = data.get("defect_quantity", 0) or 0
            if defect > actual:
                dirty = self._create_dirty_record(
                    source_type=RecordSource.SHIFT,
                    dirty_type=DirtyType.QUANTITY_CONFLICT,
                    source_id=source_id,
                    field_name="defect_quantity,actual_quantity",
                    original_value=f"defect={defect},actual={actual}",
                    raw_content=data,
                    conflict_info={"actual_quantity": actual, "defect_quantity": defect},
                    processing_opinion="缺陷数不能大于实际产量"
                )
                dirty_records.append(dirty)

        return len(dirty_records) == 0, dirty_records

    def correct_dirty_record(self, dirty_id: int, corrected_value: str,
                             operator: str) -> Tuple[bool, str]:
        dirty = self.db.query(DirtyRecord).filter(DirtyRecord.id == dirty_id).first()
        if not dirty:
            return False, "脏记录不存在"

        if dirty.is_corrected:
            return False, "该脏记录已修正，不能重复修正"

        source_record = self._get_source_record(dirty.source_type, dirty.source_id)
        if not source_record:
            return False, "源记录不存在，无法回写"

        old_snapshot = {}
        for column in source_record.__table__.columns:
            old_snapshot[column.name] = getattr(source_record, column.name)

        self._save_data_history(
            resource_type=dirty.source_type.value,
            resource_id=dirty.source_id,
            data_snapshot=old_snapshot,
            change_reason=f"修正脏记录: {dirty.dirty_type.value} - {dirty.field_name}",
            changed_by=operator
        )

        field_names = dirty.field_name.split(",")
        parsed_values = {}

        if len(field_names) == 1:
            field_name = field_names[0].strip()
            parsed_value = self._parse_field_value(field_name, corrected_value)
            parsed_values[field_name] = parsed_value
            if hasattr(source_record, field_name):
                setattr(source_record, field_name, parsed_value)
        else:
            import ast
            try:
                kv_pairs = corrected_value.split(",")
                for kv in kv_pairs:
                    if "=" in kv:
                        k, v = kv.split("=", 1)
                        k = k.strip()
                        v = v.strip()
                        parsed_values[k] = self._parse_field_value(k, v)
                        if hasattr(source_record, k):
                            setattr(source_record, k, parsed_values[k])
            except:
                pass

        if hasattr(source_record, "raw_data") and source_record.raw_data:
            new_raw_data = dict(source_record.raw_data)
            new_raw_data.update(parsed_values)
            source_record.raw_data = to_json_serializable(new_raw_data)

        dirty.corrected_value = corrected_value
        dirty.is_corrected = True
        dirty.corrected_by = operator
        dirty.corrected_at = datetime.now()

        self.db.flush()

        self._recalculate_related_queue_items(
            source_type=dirty.source_type.value,
            source_id=source_record.id
        )

        self.db.commit()

        return True, f"已修正并回写源记录，相关队列项已重新汇总"

    def get_dirty_records(self, source_type: Optional[RecordSource] = None,
                          dirty_type: Optional[DirtyType] = None,
                          is_corrected: Optional[bool] = None,
                          limit: int = 100, offset: int = 0) -> List[DirtyRecord]:
        query = self.db.query(DirtyRecord)

        if source_type:
            query = query.filter(DirtyRecord.source_type == source_type)
        if dirty_type:
            query = query.filter(DirtyRecord.dirty_type == dirty_type)
        if is_corrected is not None:
            query = query.filter(DirtyRecord.is_corrected == is_corrected)

        return query.order_by(DirtyRecord.created_at.desc()).offset(offset).limit(limit).all()
