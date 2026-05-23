from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.models.ledger import EquipmentLedger, DuplicateHandling
from decimal import Decimal


def find_duplicate_by_batch(
    db: Session,
    batch_number: str,
    exclude_id: Optional[int] = None
) -> Optional[EquipmentLedger]:
    query = db.query(EquipmentLedger).filter(
        EquipmentLedger.batch_number == batch_number
    )
    if exclude_id:
        query = query.filter(EquipmentLedger.id != exclude_id)
    return query.first()


def find_similar_records(
    db: Session,
    ledger: EquipmentLedger,
    exclude_id: Optional[int] = None
) -> list:
    query = db.query(EquipmentLedger).filter(
        EquipmentLedger.customer_name == ledger.customer_name,
        EquipmentLedger.equipment_name == ledger.equipment_name
    )
    if exclude_id:
        query = query.filter(EquipmentLedger.id != exclude_id)
    if ledger.rental_start_date:
        query = query.filter(
            EquipmentLedger.rental_start_date == ledger.rental_start_date
        )
    return query.all()


def calculate_summary_totals(
    db: Session,
    is_duplicate: Optional[bool] = None,
    duplicate_handling: Optional[DuplicateHandling] = None
) -> Dict[str, Any]:
    query = db.query(EquipmentLedger)
    
    if is_duplicate is not None:
        query = query.filter(EquipmentLedger.is_duplicate == is_duplicate)
    
    if duplicate_handling:
        query = query.filter(EquipmentLedger.duplicate_handling == duplicate_handling)
    
    records = query.all()
    
    total_quantity = 0
    total_amount = Decimal('0')
    total_deposit = Decimal('0')
    total_deducted = Decimal('0')
    valid_count = 0
    
    for record in records:
        if record.is_duplicate and record.duplicate_handling == DuplicateHandling.IGNORE:
            continue
        
        if record.quantity:
            total_quantity += record.quantity
        if record.total_amount:
            total_amount += record.total_amount
        if record.deposit_amount:
            total_deposit += record.deposit_amount
        if record.deposit_deducted:
            total_deducted += record.deposit_deducted
        valid_count += 1
    
    return {
        'total_records': valid_count,
        'total_quantity': total_quantity,
        'total_amount': total_amount,
        'total_deposit': total_deposit,
        'total_deducted': total_deducted
    }


def handle_duplicate(
    db: Session,
    ledger: EquipmentLedger,
    original_ledger: EquipmentLedger,
    handling: DuplicateHandling,
    duplicate_note: str,
    user_id: int
) -> EquipmentLedger:
    ledger.is_duplicate = True
    ledger.duplicate_handling = handling
    ledger.duplicate_note = duplicate_note
    ledger.original_batch_number = original_ledger.batch_number
    
    if handling == DuplicateHandling.OVERWRITE:
        if original_ledger.quantity:
            original_ledger.quantity = ledger.quantity
        if original_ledger.unit_price:
            original_ledger.unit_price = ledger.unit_price
        if original_ledger.total_amount:
            original_ledger.total_amount = ledger.total_amount
        if original_ledger.deposit_amount:
            original_ledger.deposit_amount = ledger.deposit_amount
        if original_ledger.deposit_deducted:
            original_ledger.deposit_deducted = ledger.deposit_deducted
        if original_ledger.actual_return_date:
            original_ledger.actual_return_date = ledger.actual_return_date
    
    db.commit()
    return ledger
