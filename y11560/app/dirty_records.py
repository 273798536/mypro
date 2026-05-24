from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from .models import (
    AuditBatch, CheckinRecord, DepositRecord, RoomChangeRecord,
    DirtyRecord, DirtyRecordType, RecordType, User
)


def check_missing_fields(record: Any, required_fields: List[str], record_type: RecordType, record_id: int) -> List[Dict]:
    dirty_records = []
    for field in required_fields:
        value = getattr(record, field, None)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            dirty_records.append({
                "record_type": record_type,
                "record_id": record_id,
                "dirty_type": DirtyRecordType.MISSING_FIELD,
                "description": f"缺少必填字段: {field}",
                "field_name": field,
                "original_value": None,
            })
    return dirty_records


def check_cross_day(checkin: CheckinRecord, audit_date: datetime) -> List[Dict]:
    dirty_records = []
    if checkin.checkin_time and checkin.checkout_time:
        checkin_day = checkin.checkin_time.date()
        checkout_day = checkin.checkout_time.date()
        if checkin_day != checkout_day:
            dirty_records.append({
                "record_type": RecordType.CHECKIN,
                "record_id": checkin.id,
                "dirty_type": DirtyRecordType.CROSS_DAY,
                "description": f"跨日入住: {checkin_day} 到 {checkout_day}",
                "field_name": "checkin_time/checkout_time",
                "original_value": f"{checkin.checkin_time} - {checkin.checkout_time}",
            })
    return dirty_records


def check_midnight_room_change(room_change: RoomChangeRecord) -> List[Dict]:
    dirty_records = []
    if room_change.change_time:
        change_hour = room_change.change_time.hour
        if 0 <= change_hour < 6:
            dirty_records.append({
                "record_type": RecordType.ROOM_CHANGE,
                "record_id": room_change.id,
                "dirty_type": DirtyRecordType.CROSS_DAY,
                "description": f"半夜换房: {room_change.change_time}",
                "field_name": "change_time",
                "original_value": str(room_change.change_time),
            })
    return dirty_records


def check_name_consistency(checkins: List[CheckinRecord], deposits: List[DepositRecord], room_changes: List[RoomChangeRecord]) -> List[Dict]:
    dirty_records = []
    checkin_map = {c.record_no: c for c in checkins}
    
    for deposit in deposits:
        checkin = checkin_map.get(deposit.checkin_record_no)
        if checkin and checkin.guest_name and deposit.guest_name and checkin.guest_name != deposit.guest_name:
            dirty_records.append({
                "record_type": RecordType.DEPOSIT,
                "record_id": deposit.id,
                "dirty_type": DirtyRecordType.NAME_CHANGED,
                "description": f"客人姓名不一致: 入住单={checkin.guest_name}, 押金单={deposit.guest_name}",
                "field_name": "guest_name",
                "original_value": f"入住:{checkin.guest_name}, 押金:{deposit.guest_name}",
            })
    
    for rc in room_changes:
        checkin = checkin_map.get(rc.checkin_record_no)
        if checkin and checkin.guest_name and rc.guest_name and checkin.guest_name != rc.guest_name:
            dirty_records.append({
                "record_type": RecordType.ROOM_CHANGE,
                "record_id": rc.id,
                "dirty_type": DirtyRecordType.NAME_CHANGED,
                "description": f"客人姓名不一致: 入住单={checkin.guest_name}, 换房单={rc.guest_name}",
                "field_name": "guest_name",
                "original_value": f"入住:{checkin.guest_name}, 换房:{rc.guest_name}",
            })
    
    return dirty_records


def check_amount_conflicts(checkins: List[CheckinRecord], deposits: List[DepositRecord], room_changes: List[RoomChangeRecord]) -> List[Dict]:
    dirty_records = []
    checkin_map = {c.record_no: c for c in checkins}
    
    for checkin in checkins:
        if checkin.actual_room_fee != checkin.invoice_amount:
            dirty_records.append({
                "record_type": RecordType.CHECKIN,
                "record_id": checkin.id,
                "dirty_type": DirtyRecordType.AMOUNT_CONFLICT,
                "description": f"房费与发票金额不一致: 房费={checkin.actual_room_fee}, 发票={checkin.invoice_amount}",
                "field_name": "actual_room_fee/invoice_amount",
                "original_value": f"房费:{checkin.actual_room_fee}, 发票:{checkin.invoice_amount}",
            })
    
    for deposit in deposits:
        checkin = checkin_map.get(deposit.checkin_record_no)
        if checkin and deposit.deposit_amount > 0 and checkin.actual_room_fee > 0:
            if deposit.deposit_amount < checkin.actual_room_fee * 0.3:
                dirty_records.append({
                    "record_type": RecordType.DEPOSIT,
                    "record_id": deposit.id,
                    "dirty_type": DirtyRecordType.AMOUNT_CONFLICT,
                    "description": f"押金金额过低: 押金={deposit.deposit_amount}, 房费={checkin.actual_room_fee}",
                    "field_name": "deposit_amount",
                    "original_value": f"押金:{deposit.deposit_amount}",
                })
    
    for rc in room_changes:
        calculated_diff = rc.new_room_rate - rc.old_room_rate
        if abs(calculated_diff - rc.rate_difference) > 0.01:
            dirty_records.append({
                "record_type": RecordType.ROOM_CHANGE,
                "record_id": rc.id,
                "dirty_type": DirtyRecordType.AMOUNT_CONFLICT,
                "description": f"差价计算错误: 计算值={calculated_diff}, 记录值={rc.rate_difference}",
                "field_name": "rate_difference",
                "original_value": str(rc.rate_difference),
            })
    
    return dirty_records


def detect_dirty_records_for_batch(db: Session, batch_id: int) -> List[DirtyRecord]:
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        return []
    
    checkins = db.query(CheckinRecord).filter(CheckinRecord.batch_id == batch_id).all()
    deposits = db.query(DepositRecord).filter(DepositRecord.batch_id == batch_id).all()
    room_changes = db.query(RoomChangeRecord).filter(RoomChangeRecord.batch_id == batch_id).all()
    
    all_dirty = []
    
    required_checkin_fields = ["record_no", "guest_name", "room_no", "checkin_time", "room_rate"]
    required_deposit_fields = ["record_no", "guest_name", "deposit_amount", "deposit_time"]
    required_room_change_fields = ["record_no", "old_room_no", "new_room_no", "change_time"]
    
    for checkin in checkins:
        all_dirty.extend(check_missing_fields(checkin, required_checkin_fields, RecordType.CHECKIN, checkin.id))
        all_dirty.extend(check_cross_day(checkin, batch.audit_date))
    
    for deposit in deposits:
        all_dirty.extend(check_missing_fields(deposit, required_deposit_fields, RecordType.DEPOSIT, deposit.id))
    
    for rc in room_changes:
        all_dirty.extend(check_missing_fields(rc, required_room_change_fields, RecordType.ROOM_CHANGE, rc.id))
        all_dirty.extend(check_midnight_room_change(rc))
    
    all_dirty.extend(check_name_consistency(checkins, deposits, room_changes))
    all_dirty.extend(check_amount_conflicts(checkins, deposits, room_changes))
    
    existing_dirty = db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch_id).all()
    existing_keys = {(d.record_type, d.record_id, d.dirty_type) for d in existing_dirty}
    
    new_dirty_records = []
    for dirty_data in all_dirty:
        key = (dirty_data["record_type"], dirty_data["record_id"], dirty_data["dirty_type"])
        if key not in existing_keys:
            dirty = DirtyRecord(
                batch_id=batch_id,
                **dirty_data
            )
            db.add(dirty)
            new_dirty_records.append(dirty)
    
    db.commit()
    return new_dirty_records


def resolve_dirty_record(db: Session, dirty_id: int, user: User, corrected_value: Optional[str] = None, resolution_note: str = "") -> Optional[DirtyRecord]:
    dirty = db.query(DirtyRecord).filter(DirtyRecord.id == dirty_id).first()
    if not dirty:
        return None
    
    dirty.is_resolved = True
    dirty.resolved_by = user.id
    dirty.resolved_at = datetime.now()
    dirty.resolution_note = resolution_note
    if corrected_value:
        dirty.corrected_value = corrected_value
    
    db.commit()
    db.refresh(dirty)
    return dirty


def get_batch_dirty_records(db: Session, batch_id: int, resolved: Optional[bool] = None):
    query = db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch_id)
    if resolved is not None:
        query = query.filter(DirtyRecord.is_resolved == resolved)
    return query.order_by(DirtyRecord.created_at).all()
