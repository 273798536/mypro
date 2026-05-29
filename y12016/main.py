from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

import models
import schemas
from database import engine, get_db
from services import (
    calculate_deposit_ledger,
    update_deposit_ledger,
    trace_ledger_by_contract,
    trace_ledger_to_flows,
    get_monthly_export,
    update_dispute,
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="长租公寓押金退还服务",
    description="统一押金账本管理，支持租约→结果正向查询和结果→流水反向追溯",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "service": "长租公寓押金退还服务",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.post("/contracts/", response_model=schemas.LeaseContract, tags=["基础数据"])
def create_contract(
    contract: schemas.LeaseContractCreate,
    db: Session = Depends(get_db),
):
    db_contract = models.LeaseContract(**contract.model_dump())
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract


@app.get("/contracts/", response_model=List[schemas.LeaseContract], tags=["基础数据"])
def list_contracts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return db.query(models.LeaseContract).offset(skip).limit(limit).all()


@app.get("/contracts/{contract_id}", response_model=schemas.LeaseContract, tags=["基础数据"])
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(models.LeaseContract).filter(
        models.LeaseContract.id == contract_id
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@app.post("/deposit-flows/", response_model=schemas.DepositFlow, tags=["基础数据"])
def create_deposit_flow(
    flow: schemas.DepositFlowCreate,
    db: Session = Depends(get_db),
):
    db_flow = models.DepositFlow(**flow.model_dump())
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow


@app.get("/deposit-flows/", response_model=List[schemas.DepositFlow], tags=["基础数据"])
def list_deposit_flows(
    contract_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.DepositFlow)
    if contract_id:
        query = query.filter(models.DepositFlow.contract_id == contract_id)
    return query.offset(skip).limit(limit).all()


@app.post("/utility-bills/", response_model=schemas.UtilityBill, tags=["基础数据"])
def create_utility_bill(
    bill: schemas.UtilityBillCreate,
    db: Session = Depends(get_db),
):
    db_bill = models.UtilityBill(**bill.model_dump())
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill


@app.get("/utility-bills/", response_model=List[schemas.UtilityBill], tags=["基础数据"])
def list_utility_bills(
    contract_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.UtilityBill)
    if contract_id:
        query = query.filter(models.UtilityBill.contract_id == contract_id)
    return query.offset(skip).limit(limit).all()


@app.post("/repair-orders/", response_model=schemas.RepairOrder, tags=["基础数据"])
def create_repair_order(
    order: schemas.RepairOrderCreate,
    db: Session = Depends(get_db),
):
    db_order = models.RepairOrder(**order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@app.get("/repair-orders/", response_model=List[schemas.RepairOrder], tags=["基础数据"])
def list_repair_orders(
    contract_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.RepairOrder)
    if contract_id:
        query = query.filter(models.RepairOrder.contract_id == contract_id)
    return query.offset(skip).limit(limit).all()


@app.post("/deposit-ledgers/calculate", response_model=schemas.DepositLedger, tags=["押金账本"])
def calculate_ledger(
    calc_data: schemas.DepositLedgerCalculate,
    db: Session = Depends(get_db),
):
    try:
        ledger = calculate_deposit_ledger(
            db=db,
            contract_id=calc_data.contract_id,
            ledger_no=calc_data.ledger_no,
            changed_by=calc_data.changed_by,
        )
        return ledger
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/deposit-ledgers/", response_model=List[schemas.DepositLedger], tags=["押金账本"])
def list_deposit_ledgers(
    contract_id: Optional[int] = None,
    status: Optional[str] = None,
    disputed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.DepositLedger)
    if contract_id:
        query = query.filter(models.DepositLedger.contract_id == contract_id)
    if status:
        query = query.filter(models.DepositLedger.status == status)
    if disputed is not None:
        query = query.filter(models.DepositLedger.disputed == disputed)
    return query.offset(skip).limit(limit).all()


@app.get("/deposit-ledgers/{ledger_id}", response_model=schemas.DepositLedger, tags=["押金账本"])
def get_deposit_ledger(ledger_id: int, db: Session = Depends(get_db)):
    ledger = db.query(models.DepositLedger).filter(
        models.DepositLedger.id == ledger_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    return ledger


@app.patch("/deposit-ledgers/{ledger_id}", response_model=schemas.DepositLedger, tags=["押金账本"])
def patch_deposit_ledger(
    ledger_id: int,
    update_data: schemas.DepositLedgerUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_deposit_ledger(db, ledger_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/deposit-ledgers/{ledger_id}/audit-logs", response_model=List[schemas.AuditLog], tags=["审计追踪"])
def get_ledger_audit_logs(ledger_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.ledger_id == ledger_id
    ).order_by(models.AuditLog.changed_at.desc()).all()
    return logs


@app.post("/disputes/", response_model=schemas.Dispute, tags=["争议处理"])
def create_dispute(
    dispute: schemas.DisputeCreate,
    db: Session = Depends(get_db),
):
    db_dispute = models.Dispute(**dispute.model_dump())
    db.add(db_dispute)
    db.commit()
    db.refresh(db_dispute)

    ledger = db.query(models.DepositLedger).filter(
        models.DepositLedger.id == dispute.ledger_id
    ).first()
    if ledger:
        ledger.disputed = True
        db.commit()

    return db_dispute


@app.patch("/disputes/{dispute_id}", response_model=schemas.Dispute, tags=["争议处理"])
def patch_dispute(
    dispute_id: int,
    update_data: schemas.DisputeUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_dispute(db, dispute_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/disputes/", response_model=List[schemas.Dispute], tags=["争议处理"])
def list_disputes(
    ledger_id: Optional[int] = None,
    status: Optional[str] = None,
    next_verifier: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.Dispute)
    if ledger_id:
        query = query.filter(models.Dispute.ledger_id == ledger_id)
    if status:
        query = query.filter(models.Dispute.status == status)
    if next_verifier:
        query = query.filter(models.Dispute.next_verifier == next_verifier)
    return query.offset(skip).limit(limit).all()


@app.get("/trace/forward/{contract_no}", response_model=schemas.TraceResult, tags=["双向追溯"])
def trace_forward(contract_no: str, db: Session = Depends(get_db)):
    try:
        return trace_ledger_by_contract(db, contract_no)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/trace/backward/{ledger_id}", tags=["双向追溯"])
def trace_backward(ledger_id: int, db: Session = Depends(get_db)):
    try:
        ledger, flows = trace_ledger_to_flows(db, ledger_id)
        return {
            "ledger": schemas.DepositLedger.model_validate(ledger),
            "related_deposit_flows": [schemas.DepositFlow.model_validate(f) for f in flows],
            "flow_mapping": [
                {
                    "item_id": item.id,
                    "item_type": item.item_type,
                    "amount": item.amount,
                    "deposit_flow_id": item.deposit_flow_id,
                    "source_type": item.source_type,
                }
                for item in ledger.ledger_items
            ],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/export/monthly", response_model=List[schemas.MonthlyExportItem], tags=["导出复盘"])
def export_monthly(
    year: int = Query(..., description="年份，如2024"),
    month: int = Query(..., ge=1, le=12, description="月份，1-12"),
    db: Session = Depends(get_db),
):
    return get_monthly_export(db, year, month)


@app.get("/export/monthly/download", tags=["导出复盘"])
def download_monthly(
    year: int = Query(..., description="年份，如2024"),
    month: int = Query(..., ge=1, le=12, description="月份，1-12"),
    db: Session = Depends(get_db),
):
    data = get_monthly_export(db, year, month)
    csv_content = "账本编号,合同编号,租客姓名,房间号,押金总额,扣款总额,应退金额,状态,是否有争议,争议数量,计算时间,确认时间\n"
    for item in data:
        csv_content += f"{item.ledger_no},{item.contract_no},{item.tenant_name},{item.room_no},"
        csv_content += f"{item.total_deposit},{item.total_deduction},{item.refund_amount},"
        csv_content += f"{item.status},{item.disputed},{item.dispute_count},"
        csv_content += f"{item.calculated_at or ''},{item.confirmed_at or ''}\n"

    return JSONResponse(
        content={
            "filename": f"deposit_ledger_{year}_{month:02d}.csv",
            "content": csv_content,
            "record_count": len(data),
        }
    )


@app.post("/repair-orders/{order_id}/confirm-responsibility", tags=["补录核责"])
def confirm_repair_responsibility(
    order_id: int,
    is_tenant_responsible: bool,
    confirmed_by: str = "system",
    db: Session = Depends(get_db),
):
    order = db.query(models.RepairOrder).filter(
        models.RepairOrder.id == order_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Repair order not found")

    old_value = order.is_tenant_responsible
    order.is_tenant_responsible = is_tenant_responsible
    db.commit()

    ledgers = db.query(models.DepositLedger).filter(
        models.DepositLedger.contract_id == order.contract_id
    ).all()
    for ledger in ledgers:
        audit_log = models.AuditLog(
            ledger_id=ledger.id,
            field_name="repair_responsibility",
            old_value=str(old_value),
            new_value=str(is_tenant_responsible),
            changed_by=confirmed_by,
            change_reason=f"维修工单{order.order_no}责任确认",
        )
        db.add(audit_log)
    db.commit()

    return {
        "message": "维修责任已确认，请重新计算押金账本",
        "order_no": order.order_no,
        "is_tenant_responsible": is_tenant_responsible,
        "related_ledger_count": len(ledgers),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
