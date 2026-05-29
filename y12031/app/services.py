from datetime import date, datetime as dt
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models import (
    FarmerProfile,
    QualityGrade,
    DeliveryTicket,
    FloorPriceAgreement,
    SettlementRecord,
    SettlementChangeLog,
)


def _parse_date(val):
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        return dt.strptime(val, "%Y-%m-%d").date()
    return val


def _compute_settlement_values(
    gross_weight: float,
    tare_weight: float,
    deduction_amount: float,
    price_multiplier: float,
    market_price: Optional[float],
    floor_price: Optional[float],
):
    net_weight = gross_weight - tare_weight - deduction_amount
    adjusted_weight = net_weight * price_multiplier if price_multiplier else net_weight

    if market_price is None and floor_price is None:
        applied_price = None
        price_source = "missing"
    elif market_price is None:
        applied_price = floor_price
        price_source = "floor_only"
    elif floor_price is None:
        applied_price = market_price
        price_source = "market_only"
    elif floor_price > market_price:
        applied_price = floor_price
        price_source = "floor_applied"
    else:
        applied_price = market_price
        price_source = "market_higher"

    net_amount = adjusted_weight * applied_price if applied_price is not None else None

    floor_difference = None
    if market_price is not None and floor_price is not None and floor_price > market_price:
        floor_difference = adjusted_weight * (floor_price - market_price)

    return {
        "net_weight": round(net_weight, 4),
        "adjusted_weight": round(adjusted_weight, 4),
        "market_price": market_price,
        "floor_price": floor_price,
        "applied_price": applied_price,
        "price_source": price_source,
        "net_amount": round(net_amount, 2) if net_amount is not None else None,
        "floor_difference": round(floor_difference, 2) if floor_difference is not None else None,
    }


def _generate_explanation(
    field: str,
    old_val,
    new_val,
    change_type: str,
    price_source: Optional[str] = None,
    floor_price: Optional[float] = None,
    market_price: Optional[float] = None,
    reason: Optional[str] = None,
) -> str:
    if change_type == "phase2_import":
        if field == "applied_price":
            if price_source == "floor_applied":
                return f"保底协议导入后，保底价{floor_price}高于市场价{market_price}，采用保底价结算，差额补贴{round(floor_price - market_price, 2)}元/公斤"
            elif price_source == "floor_only":
                return f"保底协议导入后，市场价缺失，采用保底价{floor_price}结算"
            elif price_source == "market_higher":
                return f"保底协议导入后，市场价{market_price}高于保底价{floor_price}，维持市场价结算"
            else:
                return f"保底协议导入后，结算价格来源变更为{price_source}"
        elif field == "net_amount":
            return f"保底协议导入后，结算金额从{old_val}变为{new_val}"
        elif field == "floor_difference":
            if new_val is not None and new_val > 0:
                return f"保底补贴金额{new_val}元（保底价高于市场价部分）"
            else:
                return "保底价未高于市场价，无补贴"
        return f"{field}从{old_val}变为{new_val}"
    elif change_type == "grade_reverification":
        return f"等级复核变更：{field}从{old_val}调整为{new_val}，原因：{reason or '未说明'}"
    elif change_type == "manual_correction":
        return f"手动修正：{field}从{old_val}调整为{new_val}，原因：{reason or '未说明'}"
    elif change_type == "deduction_dispute":
        return f"扣杂争议：{field}从{old_val}调整为{new_val}，原因：{reason or '未说明'}"
    elif change_type == "market_price_update":
        return f"市场价更新：{field}从{old_val}调整为{new_val}"
    return f"{field}从{old_val}变为{new_val}"


def _sync_settlement_fields(db: Session, settlement: SettlementRecord, new_vals: dict):
    settlement.net_weight = new_vals["net_weight"]
    settlement.adjusted_weight = new_vals["adjusted_weight"]
    settlement.market_price = new_vals["market_price"]
    settlement.floor_price = new_vals["floor_price"]
    settlement.applied_price = new_vals["applied_price"]
    settlement.price_source = new_vals["price_source"]
    settlement.net_amount = new_vals["net_amount"]
    settlement.floor_difference = new_vals["floor_difference"]


def _snapshot_settlement(settlement: SettlementRecord) -> dict:
    return {
        "net_weight": settlement.net_weight,
        "adjusted_weight": settlement.adjusted_weight,
        "market_price": settlement.market_price,
        "floor_price": settlement.floor_price,
        "applied_price": settlement.applied_price,
        "price_source": settlement.price_source,
        "net_amount": settlement.net_amount,
        "floor_difference": settlement.floor_difference,
    }


def reevaluate_settlement(
    db: Session,
    settlement: SettlementRecord,
    change_type: str,
    operator: Optional[str] = None,
    reason: Optional[str] = None,
) -> dict:
    ticket = db.query(DeliveryTicket).filter(DeliveryTicket.id == settlement.ticket_id).first()
    grade = db.query(QualityGrade).filter(QualityGrade.id == ticket.quality_grade_id).first() if ticket.quality_grade_id else None
    agreement = db.query(FloorPriceAgreement).filter(FloorPriceAgreement.id == settlement.agreement_id).first() if settlement.agreement_id else None

    price_multiplier = grade.price_multiplier if grade else 1.0
    floor_price = agreement.floor_price if agreement else None

    old_snapshot = _snapshot_settlement(settlement)

    new_vals = _compute_settlement_values(
        gross_weight=ticket.gross_weight,
        tare_weight=ticket.tare_weight,
        deduction_amount=ticket.deduction_amount,
        price_multiplier=price_multiplier,
        market_price=ticket.market_price,
        floor_price=floor_price,
    )

    changes = []
    comparable_fields = [
        "net_weight", "adjusted_weight", "market_price", "floor_price",
        "applied_price", "price_source", "net_amount", "floor_difference",
    ]

    for field in comparable_fields:
        old_val = old_snapshot.get(field)
        new_val = new_vals.get(field)
        if old_val != new_val:
            explanation = _generate_explanation(
                field=field,
                old_val=old_val,
                new_val=new_val,
                change_type=change_type,
                price_source=new_vals["price_source"],
                floor_price=new_vals["floor_price"],
                market_price=new_vals["market_price"],
                reason=reason,
            )
            log = SettlementChangeLog(
                settlement_id=settlement.id,
                change_type=change_type,
                field_changed=field,
                old_value=str(old_val) if old_val is not None else None,
                new_value=str(new_val) if new_val is not None else None,
                explanation=explanation,
                operator=operator,
            )
            db.add(log)
            changes.append({
                "field": field,
                "old_value": old_val,
                "new_value": new_val,
                "explanation": explanation,
            })

    _sync_settlement_fields(db, settlement, new_vals)

    old_status = settlement.status
    old_verif = settlement.verification_status

    if new_vals["price_source"] == "missing":
        settlement.status = "pending_market_price"
        settlement.verification_status = "pending"
        settlement.verification_note = "市场价缺失，无法完成结算"
    else:
        if settlement.status == "pending_market_price":
            settlement.status = "draft"
        if change_type == "grade_reverification":
            settlement.verification_status = "reverified"
            settlement.verification_note = f"等级复核完成：{reason or '未说明'}"
        elif change_type == "deduction_dispute":
            settlement.verification_status = "disputed"
            settlement.status = "disputed"
            settlement.verification_note = f"扣杂争议：{reason or '未说明'}"
        elif change_type == "manual_correction":
            settlement.verification_status = "reverified"
            settlement.verification_note = f"手动修正后复核：{reason or '未说明'}"
        elif change_type == "market_price_update":
            settlement.verification_status = "verified"
            settlement.verification_note = "市场价更新后重新核算"

    for field, old_v, new_v in [
        ("status", old_status, settlement.status),
        ("verification_status", old_verif, settlement.verification_status),
    ]:
        if old_v != new_v:
            explanation = _generate_explanation(
                field=field,
                old_val=old_v,
                new_val=new_v,
                change_type=change_type,
                reason=reason,
            )
            log = SettlementChangeLog(
                settlement_id=settlement.id,
                change_type=change_type,
                field_changed=field,
                old_value=str(old_v),
                new_value=str(new_v),
                explanation=explanation,
                operator=operator,
            )
            db.add(log)
            changes.append({
                "field": field,
                "old_value": old_v,
                "new_value": new_v,
                "explanation": explanation,
            })

    db.commit()
    db.refresh(settlement)

    return {
        "settlement_id": settlement.id,
        "old_values": old_snapshot,
        "new_values": new_vals,
        "changes": changes,
    }


def import_phase1(db: Session, data: dict) -> dict:
    created_farmers = 0
    skipped_farmers = 0
    created_tickets = 0
    skipped_tickets = 0
    created_grades = 0
    skipped_grades = 0
    created_settlements = 0

    for g in data.get("grades", []):
        existing = db.query(QualityGrade).filter(QualityGrade.grade_code == g["grade_code"]).first()
        if existing:
            skipped_grades += 1
            continue
        grade = QualityGrade(
            grade_code=g["grade_code"],
            grade_name=g["grade_name"],
            price_multiplier=g["price_multiplier"],
            description=g.get("description"),
        )
        db.add(grade)
        created_grades += 1

    db.flush()

    for f in data.get("farmers", []):
        existing = db.query(FarmerProfile).filter(FarmerProfile.farmer_code == f["farmer_code"]).first()
        if existing:
            skipped_farmers += 1
            continue
        farmer = FarmerProfile(
            farmer_code=f["farmer_code"],
            name=f["name"],
            id_number=f.get("id_number"),
            phone=f.get("phone"),
            address=f.get("address"),
            cooperative_id=f.get("cooperative_id"),
        )
        db.add(farmer)
        created_farmers += 1

    db.flush()

    for t in data.get("tickets", []):
        existing = db.query(DeliveryTicket).filter(DeliveryTicket.ticket_no == t["ticket_no"]).first()
        if existing:
            skipped_tickets += 1
            continue

        farmer = db.query(FarmerProfile).filter(FarmerProfile.farmer_code == t["farmer_code"]).first()
        if not farmer:
            continue

        grade = db.query(QualityGrade).filter(QualityGrade.grade_code == t.get("grade_code")).first()
        grade_id = grade.id if grade else None
        price_multiplier = grade.price_multiplier if grade else 1.0

        ticket = DeliveryTicket(
            ticket_no=t["ticket_no"],
            farmer_id=farmer.id,
            product_type=t["product_type"],
            gross_weight=t["gross_weight"],
            tare_weight=t.get("tare_weight", 0.0),
            deduction_amount=t.get("deduction_amount", 0.0),
            deduction_reason=t.get("deduction_reason"),
            quality_grade_id=grade_id,
            market_price=t.get("market_price"),
            delivery_date=_parse_date(t["delivery_date"]),
        )
        db.add(ticket)
        db.flush()

        vals = _compute_settlement_values(
            gross_weight=ticket.gross_weight,
            tare_weight=ticket.tare_weight,
            deduction_amount=ticket.deduction_amount,
            price_multiplier=price_multiplier,
            market_price=ticket.market_price,
            floor_price=None,
        )

        status = "draft"
        verification_status = "pending"
        verification_note = None
        if vals["price_source"] == "missing":
            status = "pending_market_price"
            verification_note = "市场价缺失，无法完成结算"

        settlement = SettlementRecord(
            ticket_id=ticket.id,
            farmer_id=farmer.id,
            agreement_id=None,
            net_weight=vals["net_weight"],
            adjusted_weight=vals["adjusted_weight"],
            market_price=vals["market_price"],
            floor_price=vals["floor_price"],
            applied_price=vals["applied_price"],
            price_source=vals["price_source"],
            net_amount=vals["net_amount"],
            floor_difference=vals["floor_difference"],
            status=status,
            verification_status=verification_status,
            verification_note=verification_note,
        )
        db.add(settlement)
        created_settlements += 1
        created_tickets += 1

    db.commit()

    return {
        "created_farmers": created_farmers,
        "skipped_farmers": skipped_farmers,
        "created_tickets": created_tickets,
        "skipped_tickets": skipped_tickets,
        "created_settlements": created_settlements,
        "created_grades": created_grades,
        "skipped_grades": skipped_grades,
    }


def import_phase2(db: Session, data: dict) -> dict:
    created_agreements = 0
    skipped_agreements = 0
    updated_settlements = 0
    unchanged_settlements = 0
    change_details = []

    for a in data.get("agreements", []):
        existing = db.query(FloorPriceAgreement).filter(FloorPriceAgreement.agreement_no == a["agreement_no"]).first()
        if existing:
            skipped_agreements += 1
            continue

        agreement = FloorPriceAgreement(
            agreement_no=a["agreement_no"],
            product_type=a["product_type"],
            floor_price=a["floor_price"],
            start_date=_parse_date(a["start_date"]),
            end_date=_parse_date(a["end_date"]),
        )
        db.add(agreement)
        db.flush()
        created_agreements += 1

        matching_tickets = (
            db.query(DeliveryTicket)
            .filter(
                DeliveryTicket.product_type == agreement.product_type,
                DeliveryTicket.delivery_date >= agreement.start_date,
                DeliveryTicket.delivery_date <= agreement.end_date,
            )
            .all()
        )

        for ticket in matching_tickets:
            settlement = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == ticket.id).first()
            if not settlement:
                continue

            if settlement.agreement_id is not None:
                continue

            settlement.agreement_id = agreement.id

            result = reevaluate_settlement(
                db=db,
                settlement=settlement,
                change_type="phase2_import",
                operator="system",
            )

            if result["changes"]:
                updated_settlements += 1
                change_details.append({
                    "settlement_id": settlement.id,
                    "ticket_no": ticket.ticket_no,
                    "changes": result["changes"],
                })
            else:
                unchanged_settlements += 1

    db.commit()

    return {
        "created_agreements": created_agreements,
        "skipped_agreements": skipped_agreements,
        "updated_settlements": updated_settlements,
        "unchanged_settlements": unchanged_settlements,
        "change_details": change_details,
    }


def handle_deduction_dispute(db: Session, settlement_id: int, dispute_reason: str, operator: str) -> dict:
    settlement = db.query(SettlementRecord).filter(SettlementRecord.id == settlement_id).first()
    if not settlement:
        raise ValueError(f"结算记录{settlement_id}不存在")

    old_status = settlement.status
    old_verif = settlement.verification_status

    result = reevaluate_settlement(
        db=db,
        settlement=settlement,
        change_type="deduction_dispute",
        operator=operator,
        reason=dispute_reason,
    )

    return {
        "settlement_id": settlement_id,
        "old_status": old_status,
        "new_status": settlement.status,
        "old_verification_status": old_verif,
        "new_verification_status": settlement.verification_status,
        "verification_note": settlement.verification_note,
        "changes": result["changes"],
    }


def handle_grade_reverification(db: Session, settlement_id: int, new_grade_code: str, reason: str, operator: str) -> dict:
    settlement = db.query(SettlementRecord).filter(SettlementRecord.id == settlement_id).first()
    if not settlement:
        raise ValueError(f"结算记录{settlement_id}不存在")

    ticket = db.query(DeliveryTicket).filter(DeliveryTicket.id == settlement.ticket_id).first()
    if not ticket:
        raise ValueError("关联磅单不存在")

    new_grade = db.query(QualityGrade).filter(QualityGrade.grade_code == new_grade_code).first()
    if not new_grade:
        raise ValueError(f"质量等级{new_grade_code}不存在")

    old_grade_id = ticket.quality_grade_id
    ticket.quality_grade_id = new_grade.id
    db.flush()

    result = reevaluate_settlement(
        db=db,
        settlement=settlement,
        change_type="grade_reverification",
        operator=operator,
        reason=reason,
    )

    return {
        "settlement_id": settlement_id,
        "old_grade_id": old_grade_id,
        "new_grade_id": new_grade.id,
        "new_grade_code": new_grade_code,
        "new_verification_status": settlement.verification_status,
        "verification_note": settlement.verification_note,
        "changes": result["changes"],
    }


def apply_manual_correction(db: Session, ticket_id: int, corrections: dict, reason: str, operator: str) -> dict:
    ticket = db.query(DeliveryTicket).filter(DeliveryTicket.id == ticket_id).first()
    if not ticket:
        raise ValueError(f"交货磅单{ticket_id}不存在")

    settlement = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == ticket_id).first()
    if not settlement:
        raise ValueError("关联结算记录不存在")

    old_snapshot = _snapshot_settlement(settlement)

    allowed_fields = {"gross_weight", "tare_weight", "deduction_amount", "market_price"}
    applied = {}
    for field, value in corrections.items():
        if field in allowed_fields and hasattr(ticket, field):
            old_val = getattr(ticket, field)
            setattr(ticket, field, value)
            applied[field] = {"old": old_val, "new": value}

    db.flush()

    result = reevaluate_settlement(
        db=db,
        settlement=settlement,
        change_type="manual_correction",
        operator=operator,
        reason=reason,
    )

    new_snapshot = _snapshot_settlement(settlement)

    changed_fields = []
    comparable = ["net_weight", "adjusted_weight", "applied_price", "net_amount", "floor_difference", "price_source"]
    for f in comparable:
        changed_fields.append({
            "field": f,
            "old_value": old_snapshot.get(f),
            "new_value": new_snapshot.get(f),
            "explanation": next(
                (c["explanation"] for c in result["changes"] if c["field"] == f),
                None,
            ),
        })

    return {
        "settlement_id": settlement.id,
        "ticket_no": ticket.ticket_no,
        "old_values": old_snapshot,
        "new_values": new_snapshot,
        "changed_fields": changed_fields,
        "ticket_corrections": applied,
        "summary": f"结算员{operator}修正磅单字段{list(corrections.keys())}，原因：{reason}",
    }


def update_market_price(db: Session, settlement_id: int, market_price: float, operator: str) -> dict:
    settlement = db.query(SettlementRecord).filter(SettlementRecord.id == settlement_id).first()
    if not settlement:
        raise ValueError(f"结算记录{settlement_id}不存在")

    ticket = db.query(DeliveryTicket).filter(DeliveryTicket.id == settlement.ticket_id).first()
    if not ticket:
        raise ValueError("关联磅单不存在")

    ticket.market_price = market_price
    db.flush()

    result = reevaluate_settlement(
        db=db,
        settlement=settlement,
        change_type="market_price_update",
        operator=operator,
    )

    return {
        "settlement_id": settlement_id,
        "new_market_price": market_price,
        "new_status": settlement.status,
        "new_verification_status": settlement.verification_status,
        "changes": result["changes"],
    }
