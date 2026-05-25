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

    @staticmethod
    def detect_quantity_conflict(db: Session, bill: schemas.SupplierBillCreate) -> Tuple[bool, Optional[float]]:
        existing = DuplicateDetectionService.find_existing_bill(db, bill.source_id)
        if existing and abs(existing.quantity - bill.quantity) > 0.001:
            return True, existing.quantity
        return False, None


class RecordLinkingService:
    @staticmethod
    def link_access_to_booking(db: Session, access: models.AccessRecord) -> Optional[int]:
        bookings = db.query(models.BookingRecord).filter(
            models.BookingRecord.room_name == access.room_name,
            models.BookingRecord.start_time - timedelta(minutes=60) <= access.access_time,
            models.BookingRecord.end_time + timedelta(minutes=30) >= access.access_time
        ).all()

        if len(bookings) == 1:
            return bookings[0].id
        elif len(bookings) > 1:
            best_match = min(bookings, key=lambda b: abs((b.start_time - access.access_time).total_seconds()))
            return best_match.id
        return None

    @staticmethod
    def link_cancel_to_booking(db: Session, cancel: models.CancelMessage) -> Optional[int]:
        query = db.query(models.BookingRecord).filter(
            models.BookingRecord.room_name == cancel.room_name
        )

        if cancel.meeting_start_time:
            query = query.filter(
                models.BookingRecord.start_time >= cancel.meeting_start_time - timedelta(hours=2),
                models.BookingRecord.start_time <= cancel.meeting_start_time + timedelta(hours=2)
            )
        else:
            query = query.filter(
                models.BookingRecord.start_time >= cancel.cancel_time - timedelta(hours=48),
                models.BookingRecord.start_time <= cancel.cancel_time + timedelta(hours=24)
            )

        bookings = query.all()
        if len(bookings) == 1:
            return bookings[0].id
        elif len(bookings) > 1:
            target_time = cancel.meeting_start_time or cancel.cancel_time
            best_match = min(bookings, key=lambda b: abs((b.start_time - target_time).total_seconds()))
            return best_match.id
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
        elif len(bookings) > 1:
            target_date = bill.meeting_date.date() if bill.meeting_date else bill.bill_date.date()
            same_day_bookings = [b for b in bookings if b.start_time.date() == target_date]

            if same_day_bookings:
                is_tea = "tea" in bill.service_type.lower() or "茶歇" in bill.service_type
                is_equip = "equip" in bill.service_type.lower() or "设备" in bill.service_type

                if is_tea:
                    tea_bookings = [b for b in same_day_bookings if b.has_tea_break]
                    if len(tea_bookings) == 1:
                        return tea_bookings[0].id
                    elif tea_bookings:
                        return tea_bookings[0].id

                if is_equip:
                    equip_bookings = [b for b in same_day_bookings if b.has_equipment]
                    if len(equip_bookings) == 1:
                        return equip_bookings[0].id
                    elif equip_bookings:
                        return equip_bookings[0].id

                return same_day_bookings[0].id
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
    def distribute_bills_globally(db: Session) -> Dict[str, int]:
        unlinked_bills = db.query(models.SupplierBill).filter(
            models.SupplierBill.booking_id.is_(None)
        ).all()

        bills_by_room_date = {}
        for bill in unlinked_bills:
            bill_date = bill.meeting_date or bill.bill_date
            key = (bill.room_name, bill_date.date())
            if key not in bills_by_room_date:
                bills_by_room_date[key] = {"tea": [], "equip": [], "other": []}

            is_tea = "tea" in bill.service_type.lower() or "茶歇" in bill.service_type
            is_equip = "equip" in bill.service_type.lower() or "设备" in bill.service_type

            if is_tea:
                bills_by_room_date[key]["tea"].append(bill)
            elif is_equip:
                bills_by_room_date[key]["equip"].append(bill)
            else:
                bills_by_room_date[key]["other"].append(bill)

        total_linked = 0
        for (room_name, bill_date), bill_groups in bills_by_room_date.items():
            bookings = db.query(models.BookingRecord).filter(
                models.BookingRecord.room_name == room_name,
                models.BookingRecord.start_time >= datetime.combine(bill_date, datetime.min.time()),
                models.BookingRecord.start_time <= datetime.combine(bill_date, datetime.max.time())
            ).order_by(models.BookingRecord.start_time).all()

            tea_bookings = [b for b in bookings if b.has_tea_break]
            equip_bookings = [b for b in bookings if b.has_equipment]

            tea_matched = set()
            for bill in bill_groups["tea"]:
                candidates = [b for b in tea_bookings if b.id not in tea_matched]
                if candidates:
                    match_by_attendee = [b for b in candidates if abs(b.attendee_count - bill.quantity) < 3]
                    if match_by_attendee:
                        bill.booking_id = match_by_attendee[0].id
                        tea_matched.add(match_by_attendee[0].id)
                    else:
                        bill.booking_id = candidates[0].id
                        tea_matched.add(candidates[0].id)
                    total_linked += 1

            equip_matched = set()
            for bill in bill_groups["equip"]:
                candidates = [b for b in equip_bookings if b.id not in equip_matched]
                if len(candidates) > 1:
                    candidates_no_tea = [b for b in candidates if not b.has_tea_break]
                    if candidates_no_tea:
                        candidates = candidates_no_tea
                if candidates:
                    bill.booking_id = candidates[0].id
                    equip_matched.add(candidates[0].id)
                    total_linked += 1

            other_bookings = bookings
            for i, bill in enumerate(bill_groups["other"]):
                if i < len(other_bookings):
                    bill.booking_id = other_bookings[i].id
                    total_linked += 1

            remaining_unlinked = [
                b for b in bill_groups["tea"] + bill_groups["equip"] + bill_groups["other"]
                if b.booking_id is None
            ]
            if remaining_unlinked and bookings:
                for bill in remaining_unlinked:
                    is_tea = "tea" in bill.service_type.lower() or "茶歇" in bill.service_type
                    is_equip = "equip" in bill.service_type.lower() or "设备" in bill.service_type
                    for booking in bookings:
                        if is_tea and booking.has_tea_break:
                            continue
                        if is_equip and booking.has_equipment:
                            continue
                        bill.booking_id = booking.id
                        total_linked += 1
                        break
                    else:
                        bill.booking_id = bookings[0].id
                        total_linked += 1

        if total_linked > 0:
            db.commit()

        return {"bills_linked": total_linked}

    @staticmethod
    def relink_all_for_booking(db: Session, booking: models.BookingRecord) -> Dict[str, int]:
        access_count = 0
        for access in db.query(models.AccessRecord).filter(
            models.AccessRecord.booking_id.is_(None),
            models.AccessRecord.room_name == booking.room_name,
            models.AccessRecord.access_time >= booking.start_time - timedelta(minutes=60),
            models.AccessRecord.access_time <= booking.end_time + timedelta(minutes=30)
        ).all():
            access.booking_id = booking.id
            access_count += 1

        cancel_count = 0
        for cancel in db.query(models.CancelMessage).filter(
            models.CancelMessage.booking_id.is_(None),
            models.CancelMessage.room_name == booking.room_name,
            models.CancelMessage.meeting_start_time.isnot(None)
        ).all():
            if abs((cancel.meeting_start_time - booking.start_time).total_seconds()) < 3600:
                cancel.booking_id = booking.id
                cancel_count += 1
                if booking.status != "cancelled":
                    booking.status = "cancelled"

        if access_count or cancel_count:
            db.commit()

        return {"access": access_count, "cancel": cancel_count, "bill": 0}

    @staticmethod
    def reconcile_booking(db: Session, booking: models.BookingRecord, auto_relink: bool = True) -> Dict[str, Any]:
        if auto_relink:
            ReconciliationService.relink_all_for_booking(db, booking)
            ReconciliationService.distribute_bills_globally(db)
            db.refresh(booking)

        has_access = len(booking.access_records) > 0
        has_cancel = len(booking.cancel_messages) > 0
        related_bills = booking.supplier_bills
        has_bill = len(related_bills) > 0

        tea_break_cost = sum(
            bill.total_amount for bill in related_bills
            if "tea" in bill.service_type.lower() or "茶歇" in bill.service_type
        )
        equipment_cost = sum(
            bill.total_amount for bill in related_bills
            if "equip" in bill.service_type.lower() or "设备" in bill.service_type
        )
        total_cost = sum(bill.total_amount for bill in related_bills)

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
            "exception_description": exception_description,
            "linked_access_count": len(booking.access_records),
            "linked_bill_count": len(booking.supplier_bills)
        }


def generate_batch_id() -> str:
    return f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
