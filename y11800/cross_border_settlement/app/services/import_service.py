from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import ClientOrder, BankSlip, PlatformBill
from app.schemas import (
    ClientOrderCreate, BankSlipCreate, PlatformBillCreate,
    ImportResult, BatchImportResult,
)


def _parse_date(val):
    if val is None or isinstance(val, date):
        return val
    if isinstance(val, str):
        try:
            return datetime.strptime(val, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


REQUIRED_ORDER_FIELDS = ["order_no", "client_name", "currency", "amount", "order_date"]
REQUIRED_SLIP_FIELDS = ["slip_no"]
REQUIRED_BILL_FIELDS = ["bill_no"]

SLIP_CRITICAL_FIELDS = ["currency", "amount", "slip_date"]
BILL_CRITICAL_FIELDS = ["currency", "amount", "bill_date"]


def _check_missing_fields(data: dict, required: List[str], label: str) -> List[str]:
    corrections = []
    for field in required:
        val = data.get(field)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            corrections.append(f"{label} '{data.get('order_no') or data.get('slip_no') or data.get('bill_no') or '?'}' 缺少必填字段 [{field}]，请补充后重新导入或手动修正")
    return corrections


def _check_slip_missing_fields(data: dict) -> List[str]:
    corrections = []
    no = data.get("slip_no", "?")
    for field in SLIP_CRITICAL_FIELDS:
        val = data.get(field)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            hint = {
                "currency": "无法自动匹配订单，需手动指定币种",
                "amount": "到账金额缺失，无法判断是否足额或手续费内扣",
                "slip_date": "到账日期缺失，无法校验汇率日期是否错用",
            }
            corrections.append(f"水单 '{no}' 缺少 [{field}] —— {hint.get(field, '请补充')}")
    return corrections


def _check_bill_missing_fields(data: dict) -> List[str]:
    corrections = []
    no = data.get("bill_no", "?")
    for field in BILL_CRITICAL_FIELDS:
        val = data.get(field)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            hint = {
                "currency": "无法与订单币种交叉校验",
                "amount": "平台账单金额缺失，无法比对到账差额",
                "bill_date": "账单日期缺失，无法确认结算周期",
            }
            corrections.append(f"平台账单 '{no}' 缺少 [{field}] —— {hint.get(field, '请补充')}")
    return corrections


def _detect_split(data: dict) -> List[str]:
    warnings = []
    if data.get("is_split") or data.get("split_group_id"):
        warnings.append(
            f"水单 '{data.get('slip_no', '?')}' 为拆分到账，已进入「待确认」分支，"
            f"需确认拆分组合是否对应同一订单"
        )
    return warnings


def import_orders(db: Session, orders: List[dict]) -> ImportResult:
    result = ImportResult()
    for o in orders:
        corrections = _check_missing_fields(o, REQUIRED_ORDER_FIELDS, "订单")
        result.corrections.extend(corrections)
        if corrections:
            continue

        existing = db.query(ClientOrder).filter(ClientOrder.order_no == o["order_no"]).first()
        if existing:
            result.skipped_duplicates += 1
            result.warnings.append(f"订单 '{o['order_no']}' 已存在，跳过重复导入")
            continue

        order = ClientOrder(
            order_no=o["order_no"],
            client_name=o["client_name"],
            currency=o["currency"],
            amount=float(o["amount"]),
            order_date=_parse_date(o["order_date"]),
            due_date=_parse_date(o.get("due_date")),
        )
        db.add(order)
        result.imported += 1
    db.commit()
    return result


def import_bank_slips(db: Session, slips: List[dict]) -> ImportResult:
    result = ImportResult()
    for s in slips:
        corrections = _check_missing_fields(s, REQUIRED_SLIP_FIELDS, "水单")
        result.corrections.extend(corrections)
        if corrections:
            continue

        field_corrections = _check_slip_missing_fields(s)
        result.corrections.extend(field_corrections)

        existing = db.query(BankSlip).filter(BankSlip.slip_no == s["slip_no"]).first()
        if existing:
            result.skipped_duplicates += 1
            result.warnings.append(f"水单 '{s['slip_no']}' 已存在，跳过重复导入")
            continue

        split_warnings = _detect_split(s)
        result.warnings.extend(split_warnings)

        status = "pending"
        if s.get("is_split") or s.get("split_group_id"):
            status = "pending_confirm"

        slip = BankSlip(
            slip_no=s["slip_no"],
            order_no=s.get("order_no"),
            currency=s.get("currency"),
            amount=float(s["amount"]) if s.get("amount") is not None else None,
            slip_date=_parse_date(s.get("slip_date")),
            bank_ref=s.get("bank_ref"),
            is_split=bool(s.get("is_split", False)),
            split_group_id=s.get("split_group_id"),
            fee_deducted=bool(s.get("fee_deducted", False)),
            fee_amount=float(s["fee_amount"]) if s.get("fee_amount") is not None else None,
            status=status,
        )
        db.add(slip)
        result.imported += 1
    db.commit()
    return result


def import_platform_bills(db: Session, bills: List[dict]) -> ImportResult:
    result = ImportResult()
    for b in bills:
        corrections = _check_missing_fields(b, REQUIRED_BILL_FIELDS, "平台账单")
        result.corrections.extend(corrections)
        if corrections:
            continue

        field_corrections = _check_bill_missing_fields(b)
        result.corrections.extend(field_corrections)

        existing = db.query(PlatformBill).filter(PlatformBill.bill_no == b["bill_no"]).first()
        if existing:
            result.skipped_duplicates += 1
            result.warnings.append(f"平台账单 '{b['bill_no']}' 已存在，跳过重复导入")
            continue

        bill = PlatformBill(
            bill_no=b["bill_no"],
            order_no=b.get("order_no"),
            currency=b.get("currency"),
            amount=float(b["amount"]) if b.get("amount") is not None else None,
            bill_date=_parse_date(b.get("bill_date")),
            platform_ref=b.get("platform_ref"),
        )
        db.add(bill)
        result.imported += 1
    db.commit()
    return result


def import_batch(
    db: Session,
    orders: Optional[List[dict]] = None,
    bank_slips: Optional[List[dict]] = None,
    platform_bills: Optional[List[dict]] = None,
) -> BatchImportResult:
    result = BatchImportResult()
    if orders:
        result.orders = import_orders(db, orders)
    if bank_slips:
        result.bank_slips = import_bank_slips(db, bank_slips)
    if platform_bills:
        result.platform_bills = import_platform_bills(db, platform_bills)
    return result
