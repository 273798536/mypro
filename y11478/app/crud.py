from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from typing import List, Optional, Dict, Any
from . import models, schemas
from .services import (
    DataValidationService,
    DuplicateDetectionService,
    ConflictDetectionService,
    RecordLinkingService,
    ProcessRecordService,
    generate_batch_id
)


def create_booking(db: Session, booking: schemas.BookingCreate, batch_id: str) -> models.BookingRecord:
    db_booking = models.BookingRecord(
        source_id=booking.source_id,
        room_name=booking.room_name,
        booker=booking.booker,
        department=booking.department,
        meeting_topic=booking.meeting_topic,
        start_time=booking.start_time,
        end_time=booking.end_time,
        attendee_count=booking.attendee_count,
        has_tea_break=booking.has_tea_break,
        has_equipment=booking.has_equipment,
        status=booking.status,
        raw_data=booking.raw_data
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    ProcessRecordService.create_process_log(
        db, batch_id, db_booking.id, "import", "success", "Booking record imported"
    )

    return db_booking


def update_booking(db: Session, booking_id: int, booking: schemas.BookingCreate, batch_id: str) -> models.BookingRecord:
    db_booking = db.query(models.BookingRecord).filter(models.BookingRecord.id == booking_id).first()

    old_values = {
        "room_name": db_booking.room_name,
        "status": db_booking.status,
        "start_time": db_booking.start_time.isoformat(),
        "end_time": db_booking.end_time.isoformat()
    }

    db_booking.room_name = booking.room_name
    db_booking.booker = booking.booker
    db_booking.department = booking.department
    db_booking.meeting_topic = booking.meeting_topic
    db_booking.start_time = booking.start_time
    db_booking.end_time = booking.end_time
    db_booking.attendee_count = booking.attendee_count
    db_booking.has_tea_break = booking.has_tea_break
    db_booking.has_equipment = booking.has_equipment
    db_booking.status = booking.status
    db_booking.raw_data = booking.raw_data

    db.commit()
    db.refresh(db_booking)

    audit_log = models.AuditLog(
        operation="update",
        table_name="booking_records",
        record_id=booking_id,
        old_values=old_values,
        new_values={
            "room_name": booking.room_name,
            "status": booking.status,
            "start_time": booking.start_time.isoformat(),
            "end_time": booking.end_time.isoformat()
        },
        change_reason=f"Batch import overwrite: {batch_id}",
        operator="system"
    )
    db.add(audit_log)
    db.commit()

    ProcessRecordService.create_process_log(
        db, batch_id, db_booking.id, "overwrite", "success", "Booking record overwritten"
    )

    return db_booking


def create_access_record(db: Session, access: schemas.AccessCreate, batch_id: str) -> models.AccessRecord:
    db_access = models.AccessRecord(
        source_id=access.source_id,
        room_name=access.room_name,
        card_number=access.card_number,
        person_name=access.person_name,
        access_time=access.access_time,
        access_type=access.access_type,
        raw_data=access.raw_data
    )
    db.add(db_access)
    db.commit()
    db.refresh(db_access)

    booking_id = RecordLinkingService.link_access_to_booking(db, db_access)
    if booking_id:
        db_access.booking_id = booking_id
        db.commit()

    return db_access


def create_cancel_message(db: Session, msg: schemas.CancelMessageCreate, batch_id: str) -> models.CancelMessage:
    db_cancel = models.CancelMessage(
        source_id=msg.source_id,
        room_name=msg.room_name,
        cancel_time=msg.cancel_time,
        canceler=msg.canceler,
        cancel_reason=msg.cancel_reason,
        meeting_start_time=msg.meeting_start_time,
        raw_data=msg.raw_data
    )
    db.add(db_cancel)
    db.commit()
    db.refresh(db_cancel)

    booking_id = RecordLinkingService.link_cancel_to_booking(db, db_cancel)
    if booking_id:
        db_cancel.booking_id = booking_id

        booking = db.query(models.BookingRecord).filter(models.BookingRecord.id == booking_id).first()
        if booking and booking.status != "cancelled":
            booking.status = "cancelled"

            audit_log = models.AuditLog(
                operation="update",
                table_name="booking_records",
                record_id=booking_id,
                old_values={"status": booking.status},
                new_values={"status": "cancelled"},
                change_reason="Cancel message linked",
                operator="system"
            )
            db.add(audit_log)
        db.commit()

    return db_cancel


def create_supplier_bill(db: Session, bill: schemas.SupplierBillCreate, batch_id: str) -> models.SupplierBill:
    db_bill = models.SupplierBill(
        source_id=bill.source_id,
        room_name=bill.room_name,
        supplier_name=bill.supplier_name,
        service_type=bill.service_type,
        quantity=bill.quantity,
        unit_price=bill.unit_price,
        total_amount=bill.total_amount,
        bill_date=bill.bill_date,
        meeting_date=bill.meeting_date,
        raw_data=bill.raw_data
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)

    booking_id = RecordLinkingService.link_bill_to_booking(db, db_bill)
    if booking_id:
        db_bill.booking_id = booking_id
        db.commit()

    return db_bill


def get_booking(db: Session, booking_id: int) -> Optional[models.BookingRecord]:
    return db.query(models.BookingRecord).filter(models.BookingRecord.id == booking_id).first()


def get_bookings(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    room_name: Optional[str] = None
) -> List[models.BookingRecord]:
    query = db.query(models.BookingRecord)

    if start_date:
        query = query.filter(models.BookingRecord.start_time >= start_date)
    if end_date:
        query = query.filter(models.BookingRecord.end_time <= end_date)
    if room_name:
        query = query.filter(models.BookingRecord.room_name == room_name)

    return query.order_by(models.BookingRecord.start_time.desc()).offset(skip).limit(limit).all()


def get_process_records(
    db: Session,
    booking_id: Optional[int] = None,
    batch_id: Optional[str] = None,
    is_dirty: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.ProcessRecord]:
    query = db.query(models.ProcessRecord)

    if booking_id:
        query = query.filter(models.ProcessRecord.booking_id == booking_id)
    if batch_id:
        query = query.filter(models.ProcessRecord.batch_id == batch_id)
    if is_dirty is not None:
        query = query.filter(models.ProcessRecord.is_dirty == is_dirty)

    return query.order_by(models.ProcessRecord.processed_at.desc()).offset(skip).limit(limit).all()


def get_import_history(db: Session, skip: int = 0, limit: int = 100) -> List[models.ImportHistory]:
    return db.query(models.ImportHistory).order_by(models.ImportHistory.imported_at.desc()).offset(skip).limit(limit).all()


def get_audit_logs(db: Session, skip: int = 0, limit: int = 100) -> List[models.AuditLog]:
    return db.query(models.AuditLog).order_by(models.AuditLog.operation_time.desc()).offset(skip).limit(limit).all()


def resolve_dirty_record(db: Session, process_id: int, corrected_value: Dict[str, Any], reason: str) -> Optional[models.ProcessRecord]:
    process = db.query(models.ProcessRecord).filter(models.ProcessRecord.id == process_id).first()
    if not process:
        return None

    process.corrected_value = corrected_value
    process.is_resolved = True
    process.handling_suggestion = f"Resolved: {reason}"

    audit_log = models.AuditLog(
        operation="resolve",
        table_name="process_records",
        record_id=process_id,
        old_values={"is_resolved": False},
        new_values={"is_resolved": True, "corrected_value": corrected_value},
        change_reason=reason,
        operator="manual"
    )
    db.add(audit_log)
    db.commit()
    db.refresh(process)

    return process


def batch_import_data(
    db: Session,
    import_request: schemas.ImportRequest
) -> Dict[str, Any]:
    batch_id = import_request.batch_id or generate_batch_id()
    duplicate_handling = import_request.duplicate_handling

    stats = {
        "total": 0,
        "success": 0,
        "duplicate": 0,
        "error": 0,
        "details": {
            "bookings": {"total": 0, "success": 0, "duplicate": 0, "error": 0},
            "access": {"total": 0, "success": 0, "duplicate": 0, "error": 0},
            "cancel": {"total": 0, "success": 0, "duplicate": 0, "error": 0},
            "bills": {"total": 0, "success": 0, "duplicate": 0, "error": 0}
        }
    }

    if import_request.bookings:
        for booking in import_request.bookings:
            stats["total"] += 1
            stats["details"]["bookings"]["total"] += 1

            is_valid, errors = DataValidationService.validate_booking(booking)
            if not is_valid:
                stats["error"] += 1
                stats["details"]["bookings"]["error"] += 1
                continue

            existing = DuplicateDetectionService.find_existing_booking(
                db, booking.source_id, booking.room_name, booking.start_time
            )

            if existing:
                stats["duplicate"] += 1
                stats["details"]["bookings"]["duplicate"] += 1

                if duplicate_handling == "overwrite":
                    update_booking(db, existing.id, booking, batch_id)
                    stats["success"] += 1
                    stats["details"]["bookings"]["success"] += 1
                continue

            if ConflictDetectionService.detect_cross_day_booking(booking):
                stats["error"] += 1
                stats["details"]["bookings"]["error"] += 1
                temp_booking = create_booking(db, booking, batch_id)
                ProcessRecordService.create_dirty_record(
                    db, batch_id, temp_booking.id,
                    "cross_day_booking",
                    "Booking spans multiple days",
                    {"start_time": booking.start_time.isoformat(), "end_time": booking.end_time.isoformat()},
                    "Please verify if this is intentional or split the booking"
                )
                continue

            create_booking(db, booking, batch_id)
            stats["success"] += 1
            stats["details"]["bookings"]["success"] += 1

    if import_request.access_records:
        for access in import_request.access_records:
            stats["total"] += 1
            stats["details"]["access"]["total"] += 1

            is_valid, errors = DataValidationService.validate_access(access)
            if not is_valid:
                stats["error"] += 1
                stats["details"]["access"]["error"] += 1
                continue

            existing = DuplicateDetectionService.find_existing_access(db, access.source_id)
            if existing:
                stats["duplicate"] += 1
                stats["details"]["access"]["duplicate"] += 1
                continue

            create_access_record(db, access, batch_id)
            stats["success"] += 1
            stats["details"]["access"]["success"] += 1

    if import_request.cancel_messages:
        for msg in import_request.cancel_messages:
            stats["total"] += 1
            stats["details"]["cancel"]["total"] += 1

            is_valid, errors = DataValidationService.validate_cancel_message(msg)
            if not is_valid:
                stats["error"] += 1
                stats["details"]["cancel"]["error"] += 1
                continue

            existing = DuplicateDetectionService.find_existing_cancel(db, msg.source_id)
            if existing:
                stats["duplicate"] += 1
                stats["details"]["cancel"]["duplicate"] += 1
                continue

            create_cancel_message(db, msg, batch_id)
            stats["success"] += 1
            stats["details"]["cancel"]["success"] += 1

    if import_request.supplier_bills:
        for bill in import_request.supplier_bills:
            stats["total"] += 1
            stats["details"]["bills"]["total"] += 1

            is_valid, errors = DataValidationService.validate_supplier_bill(bill)
            if not is_valid:
                stats["error"] += 1
                stats["details"]["bills"]["error"] += 1
                continue

            existing = DuplicateDetectionService.find_existing_bill(db, bill.source_id)
            if existing:
                stats["duplicate"] += 1
                stats["details"]["bills"]["duplicate"] += 1

                has_conflict, old_amount = ConflictDetectionService.detect_amount_conflict(db, bill)
                if has_conflict:
                    ProcessRecordService.create_dirty_record(
                        db, batch_id, existing.booking_id or 0,
                        "amount_conflict",
                        f"Amount conflict: old={old_amount}, new={bill.total_amount}",
                        {"old_amount": old_amount, "new_amount": bill.total_amount},
                        "Verify which amount is correct and update manually"
                    )
                continue

            create_supplier_bill(db, bill, batch_id)
            stats["success"] += 1
            stats["details"]["bills"]["success"] += 1

    import_history = models.ImportHistory(
        batch_id=batch_id,
        import_type="batch",
        source_file="api_import",
        record_count=stats["total"],
        success_count=stats["success"],
        duplicate_count=stats["duplicate"],
        error_count=stats["error"],
        duplicate_handling=duplicate_handling,
        raw_summary=stats
    )
    db.add(import_history)
    db.commit()

    return {
        "batch_id": batch_id,
        "total_records": stats["total"],
        "success_count": stats["success"],
        "duplicate_count": stats["duplicate"],
        "error_count": stats["error"],
        "duplicate_handling": duplicate_handling,
        "details": stats["details"]
    }
