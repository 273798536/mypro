from __future__ import annotations
import csv
import io
import json
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Settlement
from app.schemas import SettlementOut, SettlementDetailOut


def _build_settlement_dict(settlement: Settlement) -> dict:
    return {
        "settlement_id": settlement.id,
        "order_no": settlement.order.order_no,
        "client_name": settlement.order.client_name,
        "match_status": settlement.match_status,
        "original_amount": settlement.original_amount,
        "original_currency": settlement.currency,
        "settled_amount": settlement.settled_amount,
        "exchange_rate": settlement.exchange_rate,
        "rate_date": str(settlement.rate_date) if settlement.rate_date else None,
        "rate_date_mismatch": settlement.rate_date_mismatch,
        "fee_handling": settlement.fee_handling,
        "fee_amount": settlement.fee_amount,
        "slip_nos": [s.slip_no for s in settlement.slips],
        "bill_nos": [b.bill_no for b in settlement.bills],
        "notes": settlement.notes,
        "created_at": str(settlement.created_at),
        "updated_at": str(settlement.updated_at),
    }


def export_settlements_json(
    db: Session,
    match_status: Optional[str] = None,
    currency: Optional[str] = None,
) -> str:
    query = db.query(Settlement)
    if match_status:
        query = query.filter(Settlement.match_status == match_status)
    if currency:
        query = query.filter(Settlement.currency == currency)
    settlements = query.all()
    data = [_build_settlement_dict(s) for s in settlements]
    return json.dumps(data, ensure_ascii=False, indent=2)


def export_settlements_csv(
    db: Session,
    match_status: Optional[str] = None,
    currency: Optional[str] = None,
) -> str:
    query = db.query(Settlement)
    if match_status:
        query = query.filter(Settlement.match_status == match_status)
    if currency:
        query = query.filter(Settlement.currency == currency)
    settlements = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "settlement_id", "order_no", "client_name", "match_status",
        "original_amount", "original_currency", "settled_amount",
        "exchange_rate", "rate_date", "rate_date_mismatch",
        "fee_handling", "fee_amount", "slip_nos", "bill_nos", "notes",
    ])
    for s in settlements:
        writer.writerow([
            s.id,
            s.order.order_no,
            s.order.client_name,
            s.match_status,
            s.original_amount,
            s.currency,
            s.settled_amount or "",
            s.exchange_rate or "",
            s.rate_date or "",
            s.rate_date_mismatch,
            s.fee_handling or "",
            s.fee_amount or "",
            ";".join(sl.slip_no for sl in s.slips),
            ";".join(b.bill_no for b in s.bills),
            s.notes or "",
        ])
    return output.getvalue()
