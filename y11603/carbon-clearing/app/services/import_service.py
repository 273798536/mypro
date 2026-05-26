import uuid
from datetime import datetime
from decimal import Decimal
from typing import List

from sqlalchemy.orm import Session

from app.config import IMPORT_BATCH_PREFIX
from app.models.models import (
    Enterprise, EnergyReading, CreditTransaction, Invoice,
    Receipt, ClearingTable, ImportBatch
)
from app.schemas.schemas import (
    EnterpriseIn, EnergyReadingIn, CreditTransactionIn,
    InvoiceIn, ReceiptIn, ClearingTableIn
)


def _make_batch_no() -> str:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{IMPORT_BATCH_PREFIX}-{ts}-{uuid.uuid4().hex[:6]}"


def _get_or_create_enterprise(db: Session, code: str, name: str = None,
                              initial_balance: Decimal = Decimal("0")) -> Enterprise:
    ent = db.query(Enterprise).filter(Enterprise.enterprise_code == code).first()
    if ent:
        if name and ent.name != name:
            ent.name = name
        return ent
    ent = Enterprise(
        enterprise_code=code,
        name=name or code,
        initial_balance=initial_balance,
        current_balance=initial_balance,
    )
    db.add(ent)
    db.flush()
    return ent


def _create_batch(db: Session, source_type: str, source_file: str = None,
                  operator: str = None, remark: str = None) -> ImportBatch:
    batch = ImportBatch(
        batch_no=_make_batch_no(),
        source_type=source_type,
        source_file=source_file,
        operator=operator,
        remark=remark,
    )
    db.add(batch)
    db.flush()
    return batch


def import_enterprises(db: Session, items: List[EnterpriseIn],
                       operator: str = None) -> ImportBatch:
    batch = _create_batch(db, "enterprise", operator=operator)
    for item in items:
        _get_or_create_enterprise(db, item.enterprise_code, item.name, item.initial_balance)
    batch.record_count = len(items)
    db.commit()
    return batch


def import_readings(db: Session, items: List[EnergyReadingIn],
                    operator: str = None) -> ImportBatch:
    batch = _create_batch(db, "reading", operator=operator)
    for item in items:
        ent = _get_or_create_enterprise(db, item.enterprise_code)
        reading = EnergyReading(
            enterprise_id=ent.id,
            batch_id=batch.id,
            reading_date=item.reading_date,
            energy_type=item.energy_type,
            value=item.value,
            unit=item.unit,
            source=item.source,
        )
        db.add(reading)
    batch.record_count = len(items)
    db.commit()
    return batch


def import_credits(db: Session, items: List[CreditTransactionIn],
                   operator: str = None) -> ImportBatch:
    batch = _create_batch(db, "credit", operator=operator)
    for item in items:
        ent = _get_or_create_enterprise(db, item.enterprise_code)
        credit = CreditTransaction(
            enterprise_id=ent.id,
            batch_id=batch.id,
            transaction_no=item.transaction_no,
            credit_type=item.credit_type,
            amount=item.amount,
            direction=item.direction,
            transaction_date=item.transaction_date,
            source=item.source,
        )
        db.add(credit)
    batch.record_count = len(items)
    db.commit()
    return batch


def import_invoices(db: Session, items: List[InvoiceIn],
                    operator: str = None) -> ImportBatch:
    batch = _create_batch(db, "invoice", operator=operator)
    for item in items:
        ent = _get_or_create_enterprise(db, item.enterprise_code)
        invoice = Invoice(
            enterprise_id=ent.id,
            batch_id=batch.id,
            invoice_no=item.invoice_no,
            amount=item.amount,
            issue_date=item.issue_date,
            is_red_flush=item.is_red_flush,
            original_invoice_no=item.original_invoice_no,
            tax_amount=item.tax_amount,
            source=item.source,
        )
        db.add(invoice)
    batch.record_count = len(items)
    db.commit()
    return batch


def import_receipts(db: Session, items: List[ReceiptIn],
                    operator: str = None) -> ImportBatch:
    batch = _create_batch(db, "receipt", operator=operator)
    for item in items:
        ent = _get_or_create_enterprise(db, item.enterprise_code)
        receipt = Receipt(
            enterprise_id=ent.id,
            batch_id=batch.id,
            receipt_no=item.receipt_no,
            amount=item.amount,
            receipt_date=item.receipt_date,
            source=item.source,
        )
        db.add(receipt)
    batch.record_count = len(items)
    db.commit()
    return batch


def import_clearing(db: Session, items: List[ClearingTableIn],
                    operator: str = None) -> ImportBatch:
    batch = _create_batch(db, "clearing", operator=operator)
    for item in items:
        ent = _get_or_create_enterprise(db, item.enterprise_code)
        existing = (
            db.query(ClearingTable)
            .filter(ClearingTable.enterprise_id == ent.id, ClearingTable.period == item.period)
            .first()
        )
        if existing:
            existing.opening_balance = item.opening_balance
            existing.total_in = item.total_in
            existing.total_out = item.total_out
            existing.closing_balance = item.closing_balance
            existing.remark = item.remark
        else:
            ct = ClearingTable(
                enterprise_id=ent.id,
                period=item.period,
                opening_balance=item.opening_balance,
                total_in=item.total_in,
                total_out=item.total_out,
                closing_balance=item.closing_balance,
                remark=item.remark,
            )
            db.add(ct)
    batch.record_count = len(items)
    db.commit()
    return batch