from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from . import models, schemas
import uuid


class DataValidationService:
    @staticmethod
    def validate_booking(booking: schemas.BookingCreate) -> Tuple[bool, List[str]]:
        errors = []

        if not booking.source_id:
            errors.append("source_id is required")

        if not booking.room_name:
            errors.append("room_name is required")

        if booking.start_time >= booking.end_time:
            errors.append("start_time must be before end_time")

        if booking.attendee_count is not None and booking.attendee_count < 0:
            errors.append("attendee_count cannot be negative")

        return len(errors) == 0, errors

    @staticmethod
    def validate_access(access: schemas.AccessCreate) -> Tuple[bool, List[str]]:
        errors = []

        if not access.source_id:
            errors.append("source_id is required")

        if not access.room_name:
            errors.append("room_name is required")

        return len(errors) == 0, errors

    @staticmethod
    def validate_cancel_message(msg: schemas.CancelMessageCreate) -> Tuple[bool, List[str]]:
        errors = []

        if not msg.source_id:
            errors.append("source_id is required")

        if not msg.room_name:
            errors.append("room_name is required")

        return len(errors) == 0, errors

    @staticmethod
    def validate_supplier_bill(bill: schemas.SupplierBillCreate) -> Tuple[bool, List[str]]:
        errors = []

        if not bill.source_id:
            errors.append("source_id is required")

        if not bill.room_name:
            errors.append("room_name is required")

        if bill.quantity < 0:
            errors.append("quantity cannot be negative")

        if bill.unit_price < 0:
            errors.append("unit_price cannot be negative")

        if abs(bill.total_amount - bill.quantity * bill.unit_price) > 0.01:
            errors.append(f"total_amount mismatch: expected {bill.quantity * bill.unit_price:.2f}, got {bill.total_amount}")

        return len(errors) == 0, errors


class DuplicateDetectionService:
    @staticmethod
    def find_existing_booking(db: Session, source_id: str, room_name: str, start_time: datetime) -> Optional[models.BookingRecord]:
        return db.query(models.BookingRecord).filter(
            models.BookingRecord.source_id == source_id
        ).first()

    @staticmethod
    def find_existing_access(db: Session, source_id: str) -> Optional[models.AccessRecord]:
        return db.query(models.AccessRecord).filter(
            models.AccessRecord.source_id == source_id
        ).first()

    @staticmethod
    def find_existing_cancel(db: Session, source_id: str) -> Optional[models.CancelMessage]:
        return db.query(models.CancelMessage).filter(
            models.CancelMessage.source_id == source_id
        ).first()

    @staticmethod
    def find_existing_bill(db: Session, source_id: str) -> Optional[models.SupplierBill]:
        return db.query(models.SupplierBill).filter(
            models.SupplierBill.source_id == source_id
        ).first()


class ConflictDetectionService:
    @staticmethod
    def detect_cross_day_booking(booking: schemas.BookingCreate) -> bool:
        return booking.start_time.date() != booking.end_time.date()

    @staticmethod
    def detect_room_name_change(db: Session, booking: schemas.BookingCreate) -> Tuple[bool, Optional[str]]:
        existing = DuplicateDetectionService.find_existing_booking(
            db, booking.source_id, booking.room_name, booking.start_time
        )
        if existing and existing.room_name != booking.room_name:
            return True, existing.room_name
        return False, None

    @staticmethod
    def detect_amount_conflict(db: Session, bill: schemas.SupplierBillCreate) -> Tuple[bool, Optional[float]]:
        existing = DuplicateDetectionService.find_existing_bill(db, bill.source_id)
        if existing and abs(existing.total_amount - bill.total_amount) > 0.01:
            return True, existing.total_amount
        return False, None


class RecordLinkingService:
    @staticmethod
    def link_access_to_booking(db: Session, access: models.AccessRecord) -> Optional[int]:
        bookings = db.query(models.BookingRecord).filter(
            models.BookingRecord.room_name == access.room_name,
            models.BookingRecord.start_time <= access.access_time,
            models.BookingRecord.end_time >= access.access_time
        ).all()

        if len(bookings) == 1:
            return bookings[0].id
        return None

    @staticmethod
    def link_cancel_to_booking(db: Session, cancel: models.CancelMessage) -> Optional[int]:
        query = db.query(models.BookingRecord).filter(
            models.BookingRecord.room_name == cancel.room_name
        )

        if cancel.meeting_start_time:
            query = query.filter(
                models.BookingRecord.start_time >= cancel.meeting_start_time - timedelta(minutes=30),
                models.BookingRecord.start_time <= cancel.meeting_start_time + timedelta(minutes=30)
            )
        else:
            query = query.filter(
                models.BookingRecord.start_time >= cancel.cancel_time - timedelta(hours=24),
                models.BookingRecord.start_time <= cancel.cancel_time + timedelta(hours=24)
            )

        bookings = query.all()
        if len(bookings) == 1:
            return bookings[0].id
        return None

    @staticmethod
    def link_bill_to_booking(db: Session, bill: models.SupplierBill) -> Optional[int]:
        query = db.query(models.BookingRecord).filter(
            models.BookingRecord.room_name == bill.room_name
        )

        if bill.meeting_date:
            query = query.filter(
                models.BookingRecord.start_time >= datetime.combine(bill.meeting_date, datetime.min.time()),
                models.BookingRecord.start_time <= datetime.combine(bill.meeting_date, datetime.max.time())
            )

        bookings = query.all()
        if len(bookings) == 1:
            return bookings[0].id
        return None


class ProcessRecordService:
    @staticmethod
    def create_dirty_record(
        db: Session,
        batch_id: str,
        booking_id: int,
        error_type: str,
        error_message: str,
        original_value: Dict[str, Any],
        handling_suggestion: str
    ) -> models.ProcessRecord:
        process_record = models.ProcessRecord(
            batch_id=batch_id,
            booking_id=booking_id,
            process_type="validation",
            status="error",
            error_type=error_type,
            error_message=error_message,
            original_value=original_value,
            handling_suggestion=handling_suggestion,
            is_dirty=True,
            is_resolved=False
        )
        db.add(process_record)
        db.commit()
        db.refresh(process_record)
        return process_record

    @staticmethod
    def create_process_log(
        db: Session,
        batch_id: str,
        booking_id: int,
        process_type: str,
        status: str,
        message: str = None
    ) -> models.ProcessRecord:
        process_record = models.ProcessRecord(
            batch_id=batch_id,
            booking_id=booking_id,
            process_type=process_type,
            status=status,
            error_message=message,
            is_dirty=False,
            is_resolved=True
        )
        db.add(process_record)
        db.commit()
        db.refresh(process_record)
        return process_record


class ReconciliationService:
    @staticmethod
    def reconcile_booking(db: Session, booking: models.BookingRecord) -> Dict[str, Any]:
        has_access = len(booking.access_records) > 0
        has_cancel = len(booking.cancel_messages) > 0
        has_bill = len(booking.supplier_bills) > 0

        tea_break_cost = sum(
            bill.total_amount for bill in booking.supplier_bills
            if "tea" in bill.service_type.lower() or "茶歇" in bill.service_type
        )
        equipment_cost = sum(
            bill.total_amount for bill in booking.supplier_bills
            if "equip" in bill.service_type.lower() or "设备" in bill.service_type
        )
        total_cost = sum(bill.total_amount for bill in booking.supplier_bills)

        is_exception = False
        exception_type = None
        exception_description = None

        if has_cancel and has_bill:
            is_exception = True
            exception_type = "cancel_with_bill"
            exception_description = "会议已取消但产生了供应商费用"
        elif not has_cancel and not has_access and has_bill:
            is_exception = True
            exception_type = "no_access_with_bill"
            exception_description = "无门禁记录但产生了供应商费用"
        elif booking.status == "cancelled" and has_bill:
            is_exception = True
            exception_type = "cancelled_with_cost"
            exception_description = "预约状态为取消但仍有费用产生"
        elif has_cancel and booking.status != "cancelled":
            is_exception = True
            exception_type = "cancel_message_mismatch"
            exception_description = "有取消消息但预约状态未更新"

        return {
            "booking_id": booking.id,
            "room_name": booking.room_name,
            "meeting_topic": booking.meeting_topic,
            "start_time": booking.start_time,
            "booking_status": booking.status,
            "has_access_record": has_access,
            "has_cancel_message": has_cancel,
            "has_supplier_bill": has_bill,
            "tea_break_cost": tea_break_cost,
            "equipment_cost": equipment_cost,
            "total_cost": total_cost,
            "is_exception": is_exception,
            "exception_type": exception_type,
            "exception_description": exception_description
        }


def generate_batch_id() -> str:
    return f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
