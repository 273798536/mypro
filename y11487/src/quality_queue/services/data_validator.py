from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from dateutil import parser as date_parser

from ..models import (
    DirtyRecord, DirtyType, RecordSource,
    Inspection, ReworkOrder, MachineShift, ExceptionRecord
)


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

        dirty.corrected_value = corrected_value
        dirty.is_corrected = True
        dirty.corrected_by = operator
        dirty.corrected_at = datetime.now()

        self.db.flush()
        return True, "已修正"

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
