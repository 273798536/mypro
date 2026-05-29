from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
import models
import schemas


DEDUCTION_ORDER = [
    ("utility_unpaid", "未缴水电费"),
    ("rent_free_error", "免租期误扣调整"),
    ("repair_tenant", "租客责任维修"),
    ("other_deduction", "其他扣款"),
]

DISPUTE_NEXT_VERIFIER = {
    "rent_free_error": "运营主管",
    "repair_dispute": "维修主管",
    "utility_dispute": "财务主管",
    "other_dispute": "店长",
}


def calculate_deposit_ledger(
    db: Session,
    contract_id: int,
    ledger_no: str,
    changed_by: str = "system"
) -> models.DepositLedger:
    contract = db.query(models.LeaseContract).filter(
        models.LeaseContract.id == contract_id
    ).first()
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    existing_ledger = db.query(models.DepositLedger).filter(
        models.DepositLedger.ledger_no == ledger_no
    ).first()

    is_update = existing_ledger is not None
    old_values = {}

    if is_update:
        old_values = {
            "total_deposit": existing_ledger.total_deposit,
            "total_deduction": existing_ledger.total_deduction,
            "refund_amount": existing_ledger.refund_amount,
            "status": existing_ledger.status,
            "rent_free_adjustment": existing_ledger.rent_free_adjustment,
            "is_rent_free_pending": existing_ledger.is_rent_free_pending,
        }
        ledger = existing_ledger
        for item in ledger.ledger_items:
            db.delete(item)
        ledger.ledger_items = []
    else:
        ledger = models.DepositLedger(
            ledger_no=ledger_no,
            contract_id=contract_id,
            total_deposit=contract.deposit_amount,
        )
        db.add(ledger)
        db.flush()

    ledger.total_deposit = contract.deposit_amount
    ledger_items = []
    total_deduction = 0.0
    order_idx = 1
    has_rent_free_error = False
    has_repair_dispute = False
    has_utility_dispute = False
    rent_free_adjustment = 0.0

    unpaid_bills = db.query(models.UtilityBill).filter(
        models.UtilityBill.contract_id == contract_id,
        models.UtilityBill.is_paid == False,
    ).all()
    for bill in unpaid_bills:
        if bill.total_amount > 0:
            has_utility_dispute = True
            item = models.DepositLedgerItem(
                ledger_id=ledger.id,
                item_type="utility_unpaid",
                deduction_order=order_idx,
                amount=bill.total_amount,
                description=f"{bill.bill_period}水电费未缴",
                source_type="utility_bill",
                source_id=bill.id,
                utility_bill_id=bill.id,
            )
            ledger_items.append(item)
            total_deduction += bill.total_amount
            order_idx += 1

    if contract.rent_free_days > 0 and contract.check_out_date:
        daily_rent = contract.monthly_rent / 30
        actual_rent_free = min(contract.rent_free_days, 30)
        expected_adjustment = daily_rent * actual_rent_free

        received_flows = db.query(models.DepositFlow).filter(
            models.DepositFlow.contract_id == contract_id,
            models.DepositFlow.flow_type == "deposit_received",
        ).all()

        total_received = sum(f.amount for f in received_flows)
        expected_deposit = contract.deposit_amount + expected_adjustment

        if abs(total_received - expected_deposit) > 0.01:
            has_rent_free_error = True
            rent_free_adjustment = expected_adjustment
            item = models.DepositLedgerItem(
                ledger_id=ledger.id,
                item_type="rent_free_error",
                deduction_order=order_idx,
                amount=-rent_free_adjustment,
                description=f"免租期{actual_rent_free}天误扣，应退{rent_free_adjustment:.2f}元",
                source_type="contract",
                source_id=contract.id,
            )
            ledger_items.append(item)
            total_deduction -= rent_free_adjustment
            order_idx += 1

    tenant_repairs = db.query(models.RepairOrder).filter(
        models.RepairOrder.contract_id == contract_id,
        models.RepairOrder.is_tenant_responsible == True,
        models.RepairOrder.status == "completed",
        models.RepairOrder.repair_cost > 0,
    ).all()
    for repair in tenant_repairs:
        item = models.DepositLedgerItem(
            ledger_id=ledger.id,
            item_type="repair_tenant",
            deduction_order=order_idx,
            amount=repair.repair_cost,
            description=f"{repair.repair_type}维修费用（租客责任）",
            source_type="repair_order",
            source_id=repair.id,
            repair_order_id=repair.id,
        )
        ledger_items.append(item)
        total_deduction += repair.repair_cost
        order_idx += 1

    disputed_repairs = db.query(models.RepairOrder).filter(
        models.RepairOrder.contract_id == contract_id,
        models.RepairOrder.is_tenant_responsible == None,
        models.RepairOrder.status == "completed",
        models.RepairOrder.repair_cost > 0,
    ).all()
    if disputed_repairs:
        has_repair_dispute = True

    for item in ledger_items:
        db.add(item)

    ledger.total_deduction = round(total_deduction, 2)
    ledger.refund_amount = round(ledger.total_deposit - total_deduction, 2)
    ledger.rent_free_adjustment = round(rent_free_adjustment, 2)
    ledger.is_rent_free_pending = has_rent_free_error
    ledger.disputed = has_rent_free_error or has_repair_dispute or has_utility_dispute
    ledger.calculated_at = datetime.now()

    status = "pending_confirm"
    dispute_status = None
    next_verifier = None

    if has_rent_free_error:
        status = "pending_rent_free_confirm"
        dispute_status = "rent_free_pending"
        next_verifier = DISPUTE_NEXT_VERIFIER["rent_free_error"]
    elif has_repair_dispute:
        status = "pending_repair_confirm"
        dispute_status = "repair_pending"
        next_verifier = DISPUTE_NEXT_VERIFIER["repair_dispute"]
    elif has_utility_dispute:
        status = "pending_utility_confirm"
        dispute_status = "utility_pending"
        next_verifier = DISPUTE_NEXT_VERIFIER["utility_dispute"]
    else:
        status = "calculated"
        dispute_status = "no_dispute"

    ledger.status = status
    ledger.dispute_status = dispute_status
    ledger.next_verifier = next_verifier

    if is_update:
        for field, old_val in old_values.items():
            new_val = getattr(ledger, field)
            if str(old_val) != str(new_val):
                audit_log = models.AuditLog(
                    ledger_id=ledger.id,
                    field_name=field,
                    old_value=str(old_val),
                    new_value=str(new_val),
                    changed_by=changed_by,
                    change_reason="重新计算押金账本",
                )
                db.add(audit_log)

    if has_repair_dispute and is_update:
        existing_dispute = db.query(models.Dispute).filter(
            models.Dispute.ledger_id == ledger.id,
            models.Dispute.dispute_type == "repair_dispute",
            models.Dispute.status == "pending",
        ).first()
        if not existing_dispute:
            repair_nos = ", ".join([r.order_no for r in disputed_repairs])
            dispute = models.Dispute(
                ledger_id=ledger.id,
                dispute_type="repair_dispute",
                description=f"维修工单{repair_nos}责任未明确，请维修主管核责",
                next_verifier=DISPUTE_NEXT_VERIFIER["repair_dispute"],
                raised_by=changed_by,
            )
            db.add(dispute)

    if has_utility_dispute and is_update:
        existing_dispute = db.query(models.Dispute).filter(
            models.Dispute.ledger_id == ledger.id,
            models.Dispute.dispute_type == "utility_dispute",
            models.Dispute.status == "pending",
        ).first()
        if not existing_dispute:
            bill_nos = ", ".join([b.bill_no for b in unpaid_bills])
            dispute = models.Dispute(
                ledger_id=ledger.id,
                dispute_type="utility_dispute",
                description=f"水电费账单{bill_nos}未缴，请财务主管核实",
                next_verifier=DISPUTE_NEXT_VERIFIER["utility_dispute"],
                raised_by=changed_by,
            )
            db.add(dispute)

    if has_rent_free_error and is_update:
        existing_dispute = db.query(models.Dispute).filter(
            models.Dispute.ledger_id == ledger.id,
            models.Dispute.dispute_type == "rent_free_error",
            models.Dispute.status == "pending",
        ).first()
        if not existing_dispute:
            dispute = models.Dispute(
                ledger_id=ledger.id,
                dispute_type="rent_free_error",
                description=f"免租期{contract.rent_free_days}天误扣，应调整{rent_free_adjustment:.2f}元，请运营主管确认",
                next_verifier=DISPUTE_NEXT_VERIFIER["rent_free_error"],
                raised_by=changed_by,
            )
            db.add(dispute)

    db.commit()
    db.refresh(ledger)
    return ledger


def update_deposit_ledger(
    db: Session,
    ledger_id: int,
    update_data: schemas.DepositLedgerUpdate,
) -> models.DepositLedger:
    ledger = db.query(models.DepositLedger).filter(
        models.DepositLedger.id == ledger_id
    ).first()
    if not ledger:
        raise ValueError(f"Ledger {ledger_id} not found")

    changed_by = update_data.changed_by or "system"
    change_reason = update_data.change_reason or "手动更新"

    update_dict = update_data.model_dump(exclude_unset=True)
    update_dict.pop("changed_by", None)
    update_dict.pop("change_reason", None)

    for field, new_val in update_dict.items():
        old_val = getattr(ledger, field)
        if str(old_val) != str(new_val):
            audit_log = models.AuditLog(
                ledger_id=ledger.id,
                field_name=field,
                old_value=str(old_val),
                new_value=str(new_val),
                changed_by=changed_by,
                change_reason=change_reason,
            )
            db.add(audit_log)
            setattr(ledger, field, new_val)

    if update_data.status == "confirmed" and not ledger.confirmed_at:
        ledger.confirmed_at = datetime.now()

    db.commit()
    db.refresh(ledger)
    return ledger


def trace_ledger_by_contract(
    db: Session,
    contract_no: str,
) -> schemas.TraceResult:
    contract = db.query(models.LeaseContract).filter(
        models.LeaseContract.contract_no == contract_no
    ).first()
    if not contract:
        raise ValueError(f"Contract {contract_no} not found")

    ledger = db.query(models.DepositLedger).filter(
        models.DepositLedger.contract_id == contract.id
    ).order_by(models.DepositLedger.created_at.desc()).first()

    if not ledger:
        raise ValueError(f"No ledger found for contract {contract_no}")

    related_flows = db.query(models.DepositFlow).filter(
        models.DepositFlow.contract_id == contract.id
    ).all()
    related_bills = db.query(models.UtilityBill).filter(
        models.UtilityBill.contract_id == contract.id
    ).all()
    related_repairs = db.query(models.RepairOrder).filter(
        models.RepairOrder.contract_id == contract.id
    ).all()

    return schemas.TraceResult(
        ledger=schemas.DepositLedger.model_validate(ledger),
        related_flows=[schemas.DepositFlow.model_validate(f) for f in related_flows],
        related_bills=[schemas.UtilityBill.model_validate(b) for b in related_bills],
        related_repairs=[schemas.RepairOrder.model_validate(r) for r in related_repairs],
    )


def trace_ledger_to_flows(
    db: Session,
    ledger_id: int,
) -> Tuple[models.DepositLedger, List[models.DepositFlow]]:
    ledger = db.query(models.DepositLedger).filter(
        models.DepositLedger.id == ledger_id
    ).first()
    if not ledger:
        raise ValueError(f"Ledger {ledger_id} not found")

    flow_ids = set()
    for item in ledger.ledger_items:
        if item.deposit_flow_id:
            flow_ids.add(item.deposit_flow_id)

    flows = db.query(models.DepositFlow).filter(
        models.DepositFlow.id.in_(flow_ids)
    ).all() if flow_ids else []

    all_flows = db.query(models.DepositFlow).filter(
        models.DepositFlow.contract_id == ledger.contract_id
    ).all()

    return ledger, all_flows


def get_monthly_export(
    db: Session,
    year: int,
    month: int,
) -> List[schemas.MonthlyExportItem]:
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    ledgers = db.query(models.DepositLedger).filter(
        models.DepositLedger.calculated_at >= start_date,
        models.DepositLedger.calculated_at < end_date,
    ).all()

    result = []
    for ledger in ledgers:
        contract = db.query(models.LeaseContract).filter(
            models.LeaseContract.id == ledger.contract_id
        ).first()
        dispute_count = len(ledger.disputes)
        result.append(schemas.MonthlyExportItem(
            ledger_no=ledger.ledger_no,
            contract_no=contract.contract_no if contract else "",
            tenant_name=contract.tenant_name if contract else "",
            room_no=contract.room_no if contract else "",
            total_deposit=ledger.total_deposit,
            total_deduction=ledger.total_deduction,
            refund_amount=ledger.refund_amount,
            status=ledger.status,
            disputed=ledger.disputed,
            dispute_count=dispute_count,
            calculated_at=ledger.calculated_at,
            confirmed_at=ledger.confirmed_at,
        ))
    return result


def create_audit_log(
    db: Session,
    ledger_id: int,
    field_name: str,
    old_value: Optional[str],
    new_value: Optional[str],
    changed_by: str,
    change_reason: str,
) -> models.AuditLog:
    audit_log = models.AuditLog(
        ledger_id=ledger_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
        change_reason=change_reason,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log


def update_dispute(
    db: Session,
    dispute_id: int,
    update_data: schemas.DisputeUpdate,
) -> models.Dispute:
    dispute = db.query(models.Dispute).filter(
        models.Dispute.id == dispute_id
    ).first()
    if not dispute:
        raise ValueError(f"Dispute {dispute_id} not found")

    if update_data.status:
        dispute.status = update_data.status
        if update_data.status == "resolved":
            dispute.resolved_at = datetime.now()
    if update_data.next_verifier:
        dispute.next_verifier = update_data.next_verifier
    if update_data.resolution:
        dispute.resolution = update_data.resolution

    db.commit()
    db.refresh(dispute)
    return dispute
