from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from app.models.ledger import EquipmentLedger, DirtyRecordType
from decimal import Decimal


def detect_missing_fields(ledger: EquipmentLedger) -> Tuple[bool, List[str]]:
    required_fields = [
        'customer_name', 'equipment_name', 'quantity', 'unit_price',
        'rental_start_date', 'rental_end_date'
    ]
    missing = []
    for field in required_fields:
        value = getattr(ledger, field)
        if value is None or (isinstance(value, str) and value.strip() == ''):
            missing.append(field)
    return len(missing) > 0, missing


def detect_cross_day(ledger: EquipmentLedger) -> bool:
    if ledger.rental_start_date and ledger.rental_end_date:
        start_date = ledger.rental_start_date.date()
        end_date = ledger.rental_end_date.date()
        delta = end_date - start_date
        if delta.days > 1:
            return True
    return False


def detect_name_changed(
    db: Session,
    ledger: EquipmentLedger
) -> Tuple[bool, Optional[str]]:
    if not ledger.equipment_name:
        return False, None
    
    similar_records = db.query(EquipmentLedger).filter(
        EquipmentLedger.id != ledger.id,
        EquipmentLedger.customer_name == ledger.customer_name
    ).all()
    
    for record in similar_records:
        if record.equipment_name and ledger.equipment_name:
            if record.equipment_name != ledger.equipment_name:
                return True, f"与记录ID {record.id} 设备名称不一致: {record.equipment_name} vs {ledger.equipment_name}"
    return False, None


def detect_amount_conflict(ledger: EquipmentLedger) -> Tuple[bool, Optional[str]]:
    if ledger.quantity and ledger.unit_price and ledger.total_amount:
        calculated_total = Decimal(ledger.quantity) * ledger.unit_price
        if abs(calculated_total - ledger.total_amount) > Decimal('0.01'):
            return True, f"金额计算冲突: 数量×单价={calculated_total}，但记录的总金额={ledger.total_amount}"
    return False, None


def detect_quantity_conflict(
    db: Session,
    ledger: EquipmentLedger
) -> Tuple[bool, Optional[str]]:
    if not ledger.batch_number or not ledger.quantity:
        return False, None
    
    same_batch = db.query(EquipmentLedger).filter(
        EquipmentLedger.id != ledger.id,
        EquipmentLedger.batch_number == ledger.batch_number
    ).first()
    
    if same_batch and same_batch.quantity and same_batch.quantity != ledger.quantity:
        return True, f"同一批次 {ledger.batch_number} 数量冲突: 之前记录={same_batch.quantity}，当前记录={ledger.quantity}"
    return False, None


def analyze_dirty_record(
    db: Session,
    ledger: EquipmentLedger
) -> Dict[str, Any]:
    issues = []
    original_content = {}
    
    missing_detected, missing_fields = detect_missing_fields(ledger)
    if missing_detected:
        issues.append({
            'type': DirtyRecordType.MISSING_FIELD.value,
            'description': f"缺少必填字段: {', '.join(missing_fields)}",
            'fields': missing_fields
        })
        original_content['missing_fields'] = missing_fields
    
    if detect_cross_day(ledger):
        issues.append({
            'type': DirtyRecordType.CROSS_DAY.value,
            'description': "租赁起止日期跨日"
        })
    
    name_changed, name_note = detect_name_changed(db, ledger)
    if name_changed:
        issues.append({
            'type': DirtyRecordType.NAME_CHANGED.value,
            'description': name_note
        })
    
    amount_conflict, amount_note = detect_amount_conflict(ledger)
    if amount_conflict:
        issues.append({
            'type': DirtyRecordType.AMOUNT_CONFLICT.value,
            'description': amount_note
        })
    
    quantity_conflict, quantity_note = detect_quantity_conflict(db, ledger)
    if quantity_conflict:
        issues.append({
            'type': DirtyRecordType.QUANTITY_CONFLICT.value,
            'description': quantity_note
        })
    
    return {
        'is_dirty': len(issues) > 0,
        'issues': issues,
        'original_content': original_content if issues else None
    }
