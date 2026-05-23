import json
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any

from app.models import (
    WarehouseOrder, ReturnRecord, ReturnPhoto, RepairEstimate,
    DepositDeduction, ImportRecord, AsyncTask, TaskStatus, ImportSource,
    ReplayException, ShiftRecord, ManualPriceAdjustment
)
from app import schemas


import random

def generate_no(prefix: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = random.randint(1000, 9999)
    return f"{prefix}{timestamp}{random_suffix}"


class CRUDWarehouseOrder:
    def create(self, db: Session, obj_in: schemas.WarehouseOrderCreate, import_record_id: Optional[int] = None) -> WarehouseOrder:
        db_obj = WarehouseOrder(**obj_in.model_dump(), import_record_id=import_record_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_order_no(self, db: Session, order_no: str) -> Optional[WarehouseOrder]:
        return db.query(WarehouseOrder).filter(WarehouseOrder.order_no == order_no).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, customer_id: Optional[str] = None) -> List[WarehouseOrder]:
        query = db.query(WarehouseOrder)
        if customer_id:
            query = query.filter(WarehouseOrder.customer_id == customer_id)
        return query.offset(skip).limit(limit).all()


class CRUDReturnRecord:
    def create(self, db: Session, obj_in: schemas.ReturnRecordCreate, import_record_id: Optional[int] = None) -> ReturnRecord:
        db_obj = ReturnRecord(**obj_in.model_dump(), import_record_id=import_record_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_return_no(self, db: Session, return_no: str) -> Optional[ReturnRecord]:
        return db.query(ReturnRecord).filter(ReturnRecord.return_no == return_no).first()

    def get_by_warehouse_order(self, db: Session, warehouse_order_id: int) -> List[ReturnRecord]:
        return db.query(ReturnRecord).filter(ReturnRecord.warehouse_order_id == warehouse_order_id).all()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[ReturnRecord]:
        return db.query(ReturnRecord).offset(skip).limit(limit).all()


class CRUDReturnPhoto:
    def create(self, db: Session, obj_in: schemas.ReturnPhotoCreate) -> ReturnPhoto:
        db_obj = ReturnPhoto(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_return_record(self, db: Session, return_record_id: int) -> List[ReturnPhoto]:
        return db.query(ReturnPhoto).filter(ReturnPhoto.return_record_id == return_record_id).all()


class CRUDRepairEstimate:
    def create(self, db: Session, obj_in: schemas.RepairEstimateCreate, import_record_id: Optional[int] = None) -> RepairEstimate:
        db_obj = RepairEstimate(**obj_in.model_dump(), import_record_id=import_record_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_estimate_no(self, db: Session, estimate_no: str) -> Optional[RepairEstimate]:
        return db.query(RepairEstimate).filter(RepairEstimate.estimate_no == estimate_no).first()

    def get_by_warehouse_order(self, db: Session, warehouse_order_id: int) -> List[RepairEstimate]:
        return db.query(RepairEstimate).filter(RepairEstimate.warehouse_order_id == warehouse_order_id).all()


class CRUDDepositDeduction:
    def create(self, db: Session, obj_in: schemas.DepositDeductionCreate) -> DepositDeduction:
        db_obj = DepositDeduction(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_warehouse_order(self, db: Session, warehouse_order_no: str) -> List[DepositDeduction]:
        return db.query(DepositDeduction).filter(DepositDeduction.warehouse_order_no == warehouse_order_no).all()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[DepositDeduction]:
        return db.query(DepositDeduction).offset(skip).limit(limit).all()


class CRUDImportRecord:
    def create(self, db: Session, source_type: ImportSource, source_file_name: Optional[str] = None,
               source_file_path: Optional[str] = None, source_file_hash: Optional[str] = None,
               row_number: Optional[int] = None, raw_data: Optional[str] = None,
               parsed_data: Optional[str] = None, target_table: Optional[str] = None,
               is_success: bool = True, error_message: Optional[str] = None,
               operator: Optional[str] = None) -> ImportRecord:
        import_batch_no = generate_no("IMP")
        db_obj = ImportRecord(
            import_batch_no=import_batch_no,
            source_type=source_type,
            source_file_name=source_file_name,
            source_file_path=source_file_path,
            source_file_hash=source_file_hash,
            row_number=row_number,
            raw_data=raw_data,
            parsed_data=parsed_data,
            target_table=target_table,
            is_success=is_success,
            error_message=error_message,
            operator=operator
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def check_duplicate(self, db: Session, source_file_hash: str, row_number: int, target_table: str) -> bool:
        return db.query(ImportRecord).filter(
            and_(
                ImportRecord.source_file_hash == source_file_hash,
                ImportRecord.row_number == row_number,
                ImportRecord.target_table == target_table,
                ImportRecord.is_success == True
            )
        ).first() is not None

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[ImportRecord]:
        return db.query(ImportRecord).offset(skip).limit(limit).all()


class CRUDAsyncTask:
    def create(self, db: Session, task_type: str, payload: Dict[str, Any], max_retries: int = 3) -> AsyncTask:
        task_id = generate_no("TASK")
        db_obj = AsyncTask(
            task_id=task_id,
            task_type=task_type,
            payload=json.dumps(payload),
            max_retries=max_retries
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_pending_tasks(self, db: Session, limit: int = 10) -> List[AsyncTask]:
        now = datetime.utcnow()
        return db.query(AsyncTask).filter(
            and_(
                AsyncTask.status.in_([TaskStatus.PENDING, TaskStatus.RETRY]),
                (AsyncTask.next_retry_time.is_(None) | (AsyncTask.next_retry_time <= now))
            )
        ).order_by(AsyncTask.created_at).limit(limit).all()

    def get_by_task_id(self, db: Session, task_id: str) -> Optional[AsyncTask]:
        return db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()

    def update_status(self, db: Session, task_id: str, status: TaskStatus,
                      result: Optional[Dict[str, Any]] = None, error_message: Optional[str] = None) -> Optional[AsyncTask]:
        task = self.get_by_task_id(db, task_id)
        if task:
            task.status = status
            if result:
                task.result = json.dumps(result)
            if error_message:
                task.error_message = error_message
            if status == TaskStatus.SUCCESS or status == TaskStatus.PERMANENT_FAIL:
                task.completed_at = datetime.utcnow()
            if status == TaskStatus.RETRY:
                task.retry_count += 1
                task.next_retry_time = datetime.utcnow() + timedelta(minutes=5 * task.retry_count)
            db.commit()
            db.refresh(task)
        return task

    def get_manual_tasks(self, db: Session, skip: int = 0, limit: int = 100) -> List[AsyncTask]:
        return db.query(AsyncTask).filter(AsyncTask.status == TaskStatus.MANUAL).offset(skip).limit(limit).all()


class CRUDReplayException:
    def create(self, db: Session, replay_context: str, exception_type: str,
               exception_message: str, stack_trace: Optional[str] = None,
               data_snapshot: Optional[str] = None) -> ReplayException:
        exception_no = generate_no("EXC")
        db_obj = ReplayException(
            exception_no=exception_no,
            replay_context=replay_context,
            exception_type=exception_type,
            exception_message=exception_message,
            stack_trace=stack_trace,
            data_snapshot=data_snapshot
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_unresolved(self, db: Session, skip: int = 0, limit: int = 100) -> List[ReplayException]:
        return db.query(ReplayException).filter(ReplayException.is_resolved == False).offset(skip).limit(limit).all()


class CRUDShiftRecord:
    def create(self, db: Session, shift_code: str, shift_date: datetime,
               shift_type: str, operator: str, on_duty_time: Optional[datetime] = None,
               off_duty_time: Optional[datetime] = None, remark: Optional[str] = None) -> ShiftRecord:
        db_obj = ShiftRecord(
            shift_code=shift_code,
            shift_date=shift_date,
            shift_type=shift_type,
            operator=operator,
            on_duty_time=on_duty_time,
            off_duty_time=off_duty_time,
            remark=remark
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_code(self, db: Session, shift_code: str) -> Optional[ShiftRecord]:
        return db.query(ShiftRecord).filter(ShiftRecord.shift_code == shift_code).first()


warehouse_order = CRUDWarehouseOrder()
return_record = CRUDReturnRecord()
return_photo = CRUDReturnPhoto()
repair_estimate = CRUDRepairEstimate()
deposit_deduction = CRUDDepositDeduction()
import_record = CRUDImportRecord()
async_task = CRUDAsyncTask()
replay_exception = CRUDReplayException()
shift_record = CRUDShiftRecord()


def calculate_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()
