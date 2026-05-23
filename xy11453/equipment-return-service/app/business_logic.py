import json
import traceback
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app import crud, schemas
from app.models import WarehouseOrder, ReturnRecord, RepairEstimate, DepositDeduction
from app.schemas import DeductionResult
from app.crud import generate_no


def calculate_deposit_deduction(
    db: Session,
    warehouse_order_no: str,
    return_record_ids: List[int],
    operator: str = None
) -> DeductionResult:
    try:
        warehouse_order = crud.warehouse_order.get_by_order_no(db, warehouse_order_no)
        if not warehouse_order:
            raise ValueError(f"Warehouse order not found: {warehouse_order_no}")

        return_records = db.query(ReturnRecord).filter(
            ReturnRecord.id.in_(return_record_ids)
        ).all()
        
        if not return_records:
            raise ValueError("No return records found")

        repair_estimates = db.query(RepairEstimate).filter(
            RepairEstimate.warehouse_order_id == warehouse_order.id
        ).all()

        detail_items = []
        total_deduction = 0.0
        evidence_parts = []

        total_returned = sum(r.return_quantity for r in return_records)
        evidence_parts.append(f"出库单[{warehouse_order_no}]押金={warehouse_order.deposit_amount}元")
        evidence_parts.append(f"本次归还{len(return_records)}批，共{total_returned}台")

        for return_record in return_records:
            batch_info = f"批次{return_record.batch_number}: 归还{return_record.return_quantity}台"
            if return_record.is_partial:
                batch_info += "(分批归还)"
            evidence_parts.append(batch_info)

            if return_record.condition_status and return_record.condition_status != "good":
                damage_fee = 0
                related_estimates = [e for e in repair_estimates if e.return_record_id == return_record.id]
                
                for estimate in related_estimates:
                    if estimate.is_customer_liable and estimate.status == "approved":
                        damage_fee += estimate.estimate_amount
                        detail_items.append({
                            "type": "repair",
                            "return_no": return_record.return_no,
                            "estimate_no": estimate.estimate_no,
                            "amount": estimate.estimate_amount,
                            "description": f"{estimate.damage_type}: {estimate.damage_description}"
                        })
                        evidence_parts.append(
                            f"估价单[{estimate.estimate_no}]: {estimate.damage_type}={estimate.estimate_amount}元"
                        )
                
                if damage_fee > 0:
                    total_deduction += damage_fee

        if total_returned < warehouse_order.quantity:
            missing_count = warehouse_order.quantity - total_returned
            missing_fee = missing_count * (warehouse_order.deposit_amount / warehouse_order.quantity)
            total_deduction += missing_fee
            detail_items.append({
                "type": "missing",
                "amount": missing_fee,
                "description": f"缺少{missing_count}台设备",
                "missing_count": missing_count
            })
            evidence_parts.append(f"设备缺失{missing_count}台，扣减{missing_fee}元")

        if total_deduction > warehouse_order.deposit_amount:
            total_deduction = warehouse_order.deposit_amount
            evidence_parts.append(f"扣减封顶：不超过押金总额")

        evidence_chain = " | ".join(evidence_parts)

        for return_record in return_records:
            deduction_no = generate_no("DED")
            deduction = schemas.DepositDeductionCreate(
                deduction_no=deduction_no,
                return_record_id=return_record.id,
                warehouse_order_no=warehouse_order_no,
                customer_id=warehouse_order.customer_id,
                deduction_type="comprehensive",
                deduction_amount=total_deduction if return_record.id == return_records[0].id else 0,
                deduction_reason="设备归还验收扣款",
                evidence_chain=evidence_chain,
                calculation_rule=json.dumps({
                    "total_deposit": warehouse_order.deposit_amount,
                    "returned_quantity": total_returned,
                    "total_quantity": warehouse_order.quantity,
                    "damage_fee_total": sum(d["amount"] for d in detail_items if d["type"] == "repair"),
                    "missing_fee_total": sum(d["amount"] for d in detail_items if d["type"] == "missing")
                }),
                operator=operator
            )
            crud.deposit_deduction.create(db, deduction)

        return DeductionResult(
            deduction_no=deduction_no,
            total_deduction=total_deduction,
            detail_items=detail_items,
            evidence_chain=evidence_chain
        )

    except Exception as e:
        try:
            db.rollback()
        except:
            pass
        crud.replay_exception.create(
            db,
            replay_context=f"calculate_deposit_deduction: {warehouse_order_no}",
            exception_type=type(e).__name__,
            exception_message=str(e),
            stack_trace=traceback.format_exc(),
            data_snapshot=json.dumps({
                "warehouse_order_no": warehouse_order_no,
                "return_record_ids": return_record_ids
            })
        )
        db.commit()
        raise


def reconcile_partial_returns(
    db: Session,
    warehouse_order_no: str
) -> Dict[str, Any]:
    warehouse_order = crud.warehouse_order.get_by_order_no(db, warehouse_order_no)
    if not warehouse_order:
        raise ValueError(f"Warehouse order not found: {warehouse_order_no}")

    return_records = crud.return_record.get_by_warehouse_order(db, warehouse_order.id)
    partial_returns = [r for r in return_records if r.is_partial]
    
    total_returned = sum(r.return_quantity for r in return_records)
    batches = sorted(set(r.batch_number for r in return_records))

    existing_deductions = crud.deposit_deduction.get_by_warehouse_order(db, warehouse_order_no)
    
    return {
        "order_no": warehouse_order_no,
        "total_quantity": warehouse_order.quantity,
        "total_returned": total_returned,
        "remaining_quantity": warehouse_order.quantity - total_returned,
        "is_fully_returned": total_returned >= warehouse_order.quantity,
        "batches_count": len(batches),
        "batches": batches,
        "partial_returns_count": len(partial_returns),
        "existing_deductions_count": len(existing_deductions),
        "total_deducted": sum(d.deduction_amount for d in existing_deductions)
    }
