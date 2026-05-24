from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app import models
from app.models import DirtyRecordType
from app.utils import to_json_serializable


class DirtyRecordDetector:
    def __init__(self, db: Session):
        self.db = db

    def detect_missing_fields(
        self,
        data: Dict[str, Any],
        required_fields: List[str],
        source_type: str,
        source_id: Optional[str] = None,
        batch_id: Optional[int] = None
    ) -> Optional[models.DirtyRecord]:
        missing = [field for field in required_fields if field not in data or data[field] is None]
        if missing:
            return models.DirtyRecord(
                batch_id=batch_id,
                source_type=source_type,
                source_id=source_id,
                dirty_type=DirtyRecordType.MISSING_FIELDS,
                description=f"缺少必填字段: {', '.join(missing)}",
                raw_content=to_json_serializable(data)
            )
        return None

    def detect_cross_date(
        self,
        record_date: datetime,
        batch_date: datetime,
        data: Dict[str, Any],
        source_type: str,
        source_id: Optional[str] = None,
        batch_id: Optional[int] = None,
        tolerance_days: int = 1
    ) -> Optional[models.DirtyRecord]:
        date_diff = abs((record_date.date() - batch_date.date()).days)
        if date_diff > tolerance_days:
            return models.DirtyRecord(
                batch_id=batch_id,
                source_type=source_type,
                source_id=source_id,
                dirty_type=DirtyRecordType.CROSS_DATE,
                description=f"日期跨日: 记录日期 {record_date.date()} 与批次日期 {batch_date.date()} 相差 {date_diff} 天",
                raw_content=to_json_serializable(data)
            )
        return None

    def detect_name_changed(
        self,
        current_name: str,
        existing_name: str,
        data: Dict[str, Any],
        source_type: str,
        source_id: Optional[str] = None,
        batch_id: Optional[int] = None
    ) -> Optional[models.DirtyRecord]:
        if current_name != existing_name:
            return models.DirtyRecord(
                batch_id=batch_id,
                source_type=source_type,
                source_id=source_id,
                dirty_type=DirtyRecordType.NAME_CHANGED,
                description=f"名称变更: 原名称 '{existing_name}' -> 新名称 '{current_name}'",
                raw_content=to_json_serializable(data)
            )
        return None

    def detect_amount_conflict(
        self,
        current_amount: float,
        existing_amount: float,
        data: Dict[str, Any],
        source_type: str,
        source_id: Optional[str] = None,
        batch_id: Optional[int] = None,
        tolerance: float = 0.01
    ) -> Optional[models.DirtyRecord]:
        if abs(current_amount - existing_amount) > tolerance:
            return models.DirtyRecord(
                batch_id=batch_id,
                source_type=source_type,
                source_id=source_id,
                dirty_type=DirtyRecordType.AMOUNT_CONFLICT,
                description=f"金额冲突: 原金额 {existing_amount} -> 新金额 {current_amount} (差值: {abs(current_amount - existing_amount)})",
                raw_content=to_json_serializable(data)
            )
        return None

    def detect_quantity_conflict(
        self,
        current_qty: float,
        existing_qty: float,
        data: Dict[str, Any],
        source_type: str,
        source_id: Optional[str] = None,
        batch_id: Optional[int] = None,
        tolerance: float = 0.001
    ) -> Optional[models.DirtyRecord]:
        if abs(current_qty - existing_qty) > tolerance:
            return models.DirtyRecord(
                batch_id=batch_id,
                source_type=source_type,
                source_id=source_id,
                dirty_type=DirtyRecordType.QUANTITY_CONFLICT,
                description=f"数量冲突: 原数量 {existing_qty} -> 新数量 {current_qty} (差值: {abs(current_qty - existing_qty)})",
                raw_content=to_json_serializable(data)
            )
        return None

    def add_dirty_record(self, dirty_record: models.DirtyRecord) -> models.DirtyRecord:
        self.db.add(dirty_record)
        self.db.flush()
        return dirty_record

    def resolve_dirty_record(
        self,
        dirty_record_id: int,
        processing_opinion: str,
        user_id: int
    ) -> Optional[models.DirtyRecord]:
        record = self.db.query(models.DirtyRecord).filter(
            models.DirtyRecord.id == dirty_record_id
        ).first()
        if record:
            record.is_resolved = True
            record.processing_opinion = processing_opinion
            record.resolved_by = user_id
            record.resolved_at = datetime.utcnow()
            self.db.add(record)
            self.db.flush()
        return record


def validate_sample_label(
    detector: DirtyRecordDetector,
    data: Dict[str, Any],
    batch: models.Batch,
    existing_record: Optional[models.SampleLabel] = None
) -> List[models.DirtyRecord]:
    dirty_records = []

    required_fields = ["label_code", "sample_time"]
    missing = detector.detect_missing_fields(
        data, required_fields, "sample_label",
        data.get("label_code"), batch.id
    )
    if missing:
        dirty_records.append(missing)

    if "sample_time" in data and data["sample_time"]:
        cross_date = detector.detect_cross_date(
            data["sample_time"], batch.production_date,
            data, "sample_label", data.get("label_code"), batch.id
        )
        if cross_date:
            dirty_records.append(cross_date)

    return dirty_records


def validate_temperature_record(
    detector: DirtyRecordDetector,
    data: Dict[str, Any],
    batch: models.Batch,
    existing_record: Optional[models.TemperatureRecord] = None
) -> List[models.DirtyRecord]:
    dirty_records = []

    required_fields = ["record_time", "temperature"]
    missing = detector.detect_missing_fields(
        data, required_fields, "temperature_record",
        str(data.get("record_time")), batch.id
    )
    if missing:
        dirty_records.append(missing)

    if "record_time" in data and data["record_time"]:
        cross_date = detector.detect_cross_date(
            data["record_time"], batch.production_date,
            data, "temperature_record", str(data.get("record_time")), batch.id
        )
        if cross_date:
            dirty_records.append(cross_date)

    return dirty_records


def validate_store_complaint(
    detector: DirtyRecordDetector,
    data: Dict[str, Any],
    batch: models.Batch,
    existing_record: Optional[models.StoreComplaint] = None
) -> List[models.DirtyRecord]:
    dirty_records = []

    required_fields = ["store_name", "complaint_time", "complaint_content"]
    missing = detector.detect_missing_fields(
        data, required_fields, "store_complaint",
        data.get("store_code") or data.get("store_name"), batch.id
    )
    if missing:
        dirty_records.append(missing)

    if "complaint_time" in data and data["complaint_time"]:
        cross_date = detector.detect_cross_date(
            data["complaint_time"], batch.production_date,
            data, "store_complaint", data.get("store_code"), batch.id,
            tolerance_days=7
        )
        if cross_date:
            dirty_records.append(cross_date)

    if existing_record and "amount" in data and data["amount"] is not None:
        amount_conflict = detector.detect_amount_conflict(
            data["amount"], existing_record.amount or 0,
            data, "store_complaint", data.get("store_code"), batch.id
        )
        if amount_conflict:
            dirty_records.append(amount_conflict)

    if existing_record and "quantity" in data and data["quantity"] is not None:
        qty_conflict = detector.detect_quantity_conflict(
            data["quantity"], existing_record.quantity or 0,
            data, "store_complaint", data.get("store_code"), batch.id
        )
        if qty_conflict:
            dirty_records.append(qty_conflict)

    if existing_record and "store_name" in data:
        name_changed = detector.detect_name_changed(
            data["store_name"], existing_record.store_name,
            data, "store_complaint", data.get("store_code"), batch.id
        )
        if name_changed:
            dirty_records.append(name_changed)

    return dirty_records
