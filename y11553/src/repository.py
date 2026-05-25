import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .models import (
    ImportTask,
    TaskStatus,
    RecordType,
    ProcessingLog,
    DuplicateRecord,
    DuplicateType,
    InventoryRecord,
    ReplenishmentPhoto,
    RefundRecord,
    PriceAdjustment,
    ImportSource,
    PendingRecord,
    PendingRecordStatus,
)
from .duplicate_detector import generate_fingerprint, generate_record_id, check_duplicate


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return {"__type__": "datetime", "value": obj.isoformat()}
        return super().default(obj)


def safe_json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, cls=DateTimeEncoder)


def safe_json_loads(s: str) -> Any:
    def datetime_hook(obj):
        if obj.get("__type__") == "datetime":
            try:
                return datetime.fromisoformat(obj["value"])
            except (ValueError, KeyError):
                return obj["value"]
        return obj

    try:
        return json.loads(s, object_hook=datetime_hook)
    except json.JSONDecodeError:
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            return {}


def _to_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            try:
                return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return datetime.utcnow()
    return datetime.utcnow()


class DataRepository:
    def __init__(self, db: Session):
        self.db = db

    def safe_commit(self):
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def create_import_task(
        self,
        record_type: RecordType,
        source_type: ImportSource = ImportSource.API,
        source_file: Optional[str] = None,
    ) -> ImportTask:
        task = ImportTask(
            task_id=f"task_{uuid.uuid4().hex[:16]}",
            source_type=source_type,
            source_file=source_file,
            record_type=record_type,
            status=TaskStatus.PENDING,
        )
        self.db.add(task)
        self.safe_commit()
        self.db.refresh(task)
        return task

    def update_task_status(
        self,
        task: ImportTask,
        status: TaskStatus,
        error_message: Optional[str] = None,
    ) -> ImportTask:
        task.status = status
        task.updated_at = datetime.utcnow()
        if error_message:
            task.error_message = error_message
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
        self.safe_commit()
        self.db.refresh(task)
        return task

    def increment_task_counts(
        self,
        task: ImportTask,
        success: int = 0,
        duplicate: int = 0,
        error: int = 0,
    ) -> ImportTask:
        task.success_count += success
        task.duplicate_count += duplicate
        task.error_count += error
        if task.total_count == 0:
            task.total_count = success + duplicate + error
        self.safe_commit()
        self.db.refresh(task)
        return task

    def add_log(
        self,
        task: ImportTask,
        message: str,
        level: str = "info",
        record_id: Optional[str] = None,
        raw_data: Optional[str] = None,
    ) -> ProcessingLog:
        log = ProcessingLog(
            task_id=task.id,
            record_id=record_id,
            record_type=task.record_type,
            level=level,
            message=message,
            raw_data=raw_data,
        )
        self.db.add(log)
        self.safe_commit()
        return log

    def add_duplicate_record(
        self,
        task: ImportTask,
        duplicate_type: DuplicateType,
        original_record_id: str,
        duplicate_record_id: str,
        fingerprint: str,
        reason: str,
        raw_data: str,
        source_row_number: Optional[int] = None,
    ) -> DuplicateRecord:
        dup = DuplicateRecord(
            task_id=task.id,
            record_type=task.record_type,
            duplicate_type=duplicate_type,
            source_row_number=source_row_number,
            original_record_id=original_record_id,
            duplicate_record_id=duplicate_record_id,
            fingerprint=fingerprint,
            reason=reason,
            raw_data=raw_data,
        )
        self.db.add(dup)
        self.safe_commit()
        return dup

    def create_inventory_record(
        self, task: ImportTask, data: Dict[str, Any], source_row: Optional[int] = None
    ) -> InventoryRecord:
        record_id = generate_record_id(data, RecordType.INVENTORY)
        fingerprint = generate_fingerprint(data, RecordType.INVENTORY)

        record = InventoryRecord(
            task_id=task.id,
            record_id=record_id,
            source_file=task.source_file,
            source_row_number=source_row,
            cabinet_id=data.get("cabinet_id"),
            cell_id=data.get("cell_id"),
            sku_id=data.get("sku_id"),
            sku_name=data.get("sku_name"),
            quantity=data.get("quantity"),
            original_quantity=data.get("quantity"),
            is_hot_cell=data.get("is_hot_cell", False),
            processing_reason=data.get("processing_reason"),
            raw_data=safe_json_dumps(data),
            fingerprint=fingerprint,
            record_time=_to_datetime(data.get("record_time")),
        )
        self.db.add(record)
        self.safe_commit()
        self.db.refresh(record)
        return record

    def create_replenishment_record(
        self, task: ImportTask, data: Dict[str, Any], source_row: Optional[int] = None
    ) -> ReplenishmentPhoto:
        record_id = generate_record_id(data, RecordType.REPLENISHMENT)
        fingerprint = generate_fingerprint(data, RecordType.REPLENISHMENT)

        record = ReplenishmentPhoto(
            task_id=task.id,
            record_id=record_id,
            source_file=task.source_file,
            source_row_number=source_row,
            cabinet_id=data.get("cabinet_id"),
            cell_id=data.get("cell_id"),
            photo_url=data.get("photo_url"),
            photo_hash=data.get("photo_hash"),
            replenishment_quantity=data.get("replenishment_quantity"),
            operator_id=data.get("operator_id"),
            raw_data=safe_json_dumps(data),
            fingerprint=fingerprint,
            record_time=_to_datetime(data.get("record_time")),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_refund_record(
        self, task: ImportTask, data: Dict[str, Any], source_row: Optional[int] = None
    ) -> RefundRecord:
        record_id = generate_record_id(data, RecordType.REFUND)
        fingerprint = generate_fingerprint(data, RecordType.REFUND)

        record = RefundRecord(
            task_id=task.id,
            record_id=record_id,
            source_file=task.source_file,
            source_row_number=source_row,
            cabinet_id=data.get("cabinet_id"),
            order_id=data.get("order_id"),
            user_id=data.get("user_id"),
            sku_id=data.get("sku_id"),
            refund_amount=data.get("refund_amount"),
            refund_reason=data.get("refund_reason"),
            raw_data=safe_json_dumps(data),
            fingerprint=fingerprint,
            record_time=_to_datetime(data.get("record_time")),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_price_adjustment_record(
        self, task: ImportTask, data: Dict[str, Any], source_row: Optional[int] = None
    ) -> PriceAdjustment:
        record_id = generate_record_id(data, RecordType.PRICE_ADJUSTMENT)
        fingerprint = generate_fingerprint(data, RecordType.PRICE_ADJUSTMENT)

        record = PriceAdjustment(
            task_id=task.id,
            record_id=record_id,
            source_file=task.source_file,
            source_row_number=source_row,
            cabinet_id=data.get("cabinet_id"),
            cell_id=data.get("cell_id"),
            sku_id=data.get("sku_id"),
            original_price=data.get("original_price"),
            new_price=data.get("new_price"),
            operator_id=data.get("operator_id"),
            approval_note=data.get("approval_note"),
            raw_data=safe_json_dumps(data),
            fingerprint=fingerprint,
            record_time=_to_datetime(data.get("record_time")),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_task_by_id(self, task_id: str) -> Optional[ImportTask]:
        return self.db.query(ImportTask).filter(ImportTask.task_id == task_id).first()

    def get_pending_tasks(self) -> List[ImportTask]:
        return self.db.query(ImportTask).filter(
            ImportTask.status.in_([TaskStatus.PENDING, TaskStatus.WAITING_RETRY])
        ).all()

    def get_task_logs(self, task_id: int) -> List[ProcessingLog]:
        return self.db.query(ProcessingLog).filter(
            ProcessingLog.task_id == task_id
        ).order_by(ProcessingLog.created_at.desc()).all()

    def get_task_duplicates(self, task_id: int) -> List[DuplicateRecord]:
        return self.db.query(DuplicateRecord).filter(
            DuplicateRecord.task_id == task_id
        ).all()

    def list_tasks(self, skip: int = 0, limit: int = 100) -> List[ImportTask]:
        return self.db.query(ImportTask).order_by(
            ImportTask.created_at.desc()
        ).offset(skip).limit(limit).all()

    def check_duplicate(self, fingerprint: str, record_type: RecordType) -> Optional[Any]:
        return check_duplicate(self.db, fingerprint, record_type)

    def create_pending_record(
        self,
        task: ImportTask,
        record_type: RecordType,
        raw_data: Dict[str, Any],
        source_row_number: int,
        fingerprint: str,
    ) -> PendingRecord:
        record = PendingRecord(
            task_id=task.id,
            source_file=task.source_file,
            source_row_number=source_row_number,
            record_type=record_type,
            raw_data=safe_json_dumps(raw_data),
            fingerprint=fingerprint,
            status=PendingRecordStatus.PENDING,
        )
        self.db.add(record)
        self.safe_commit()
        self.db.refresh(record)
        return record

    def get_pending_records(self, task_id: int) -> List[PendingRecord]:
        return self.db.query(PendingRecord).filter(
            PendingRecord.task_id == task_id
        ).order_by(PendingRecord.source_row_number).all()

    def get_pending_records_by_status(
        self, task_id: int, status: PendingRecordStatus
    ) -> List[PendingRecord]:
        return self.db.query(PendingRecord).filter(
            PendingRecord.task_id == task_id,
            PendingRecord.status == status,
        ).order_by(PendingRecord.source_row_number).all()

    def update_pending_record_status(
        self,
        record: PendingRecord,
        status: PendingRecordStatus,
        error_message: Optional[str] = None,
    ) -> PendingRecord:
        record.status = status
        record.updated_at = datetime.utcnow()
        if error_message:
            record.error_message = error_message
        if status in [PendingRecordStatus.SUCCESS, PendingRecordStatus.DUPLICATE, PendingRecordStatus.PERMANENT_FAILED]:
            record.processed_at = datetime.utcnow()
        if status == PendingRecordStatus.WAITING_RETRY:
            record.retry_times += 1
        self.safe_commit()
        self.db.refresh(record)
        return record

    def get_pending_record_count(self, task_id: int) -> Dict[str, int]:
        records = self.get_pending_records(task_id)
        counts = {
            "total": len(records),
            "pending": 0,
            "success": 0,
            "duplicate": 0,
            "error": 0,
            "waiting_retry": 0,
            "waiting_manual": 0,
            "permanent_failed": 0,
        }
        for r in records:
            counts[r.status.value] = counts.get(r.status.value, 0) + 1
        return counts
