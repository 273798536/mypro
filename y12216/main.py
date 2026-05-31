from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pandas as pd
import os
from database import engine, get_db, Base
from models import RentalContract, DepositFlow, DeviceLedger, DepositOccupation
from schemas import (
    RentalContractCreate, RentalContract as RentalContractSchema,
    DepositFlowCreate, DepositFlow as DepositFlowSchema,
    DeviceLedgerCreate, DeviceLedger as DeviceLedgerSchema,
    DepositOccupationCreate, DepositOccupation as DepositOccupationSchema,
    OccupationDetailResponse
)
from services import (
    create_rental_contract, create_deposit_flow, create_device_ledger,
    create_deposit_occupation, review_occupation, confirm_occupation,
    close_occupation, resolve_conflict, get_occupation_detail,
    get_contract_deposit_ledger
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="设备租赁押金占用管理系统", version="1.0.0")

@app.post("/contracts/", response_model=RentalContractSchema)
def create_contract(contract: RentalContractCreate, db: Session = Depends(get_db)):
    db_contract = db.query(RentalContract).filter(RentalContract.contract_no == contract.contract_no).first()
    if db_contract:
        raise HTTPException(status_code=400, detail="合同编号已存在")
    return create_rental_contract(db, contract)

@app.get("/contracts/")
def list_contracts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    contracts = db.query(RentalContract).offset(skip).limit(limit).all()
    return contracts

@app.get("/contracts/{contract_id}")
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(RentalContract).filter(RentalContract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return contract

@app.post("/flows/", response_model=DepositFlowSchema)
def create_flow(flow: DepositFlowCreate, db: Session = Depends(get_db)):
    db_flow = db.query(DepositFlow).filter(DepositFlow.flow_no == flow.flow_no).first()
    if db_flow:
        raise HTTPException(status_code=400, detail="流水号已存在")
    contract = db.query(RentalContract).filter(RentalContract.id == flow.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return create_deposit_flow(db, flow)

@app.get("/flows/")
def list_flows(contract_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(DepositFlow)
    if contract_id:
        query = query.filter(DepositFlow.contract_id == contract_id)
    return query.offset(skip).limit(limit).all()

@app.post("/devices/", response_model=DeviceLedgerSchema)
def create_device(device: DeviceLedgerCreate, db: Session = Depends(get_db)):
    db_device = db.query(DeviceLedger).filter(DeviceLedger.device_no == device.device_no).first()
    if db_device:
        raise HTTPException(status_code=400, detail="设备编号已存在")
    contract = db.query(RentalContract).filter(RentalContract.id == device.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return create_device_ledger(db, device)

@app.get("/devices/")
def list_devices(contract_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(DeviceLedger)
    if contract_id:
        query = query.filter(DeviceLedger.contract_id == contract_id)
    return query.offset(skip).limit(limit).all()

@app.post("/occupations/", response_model=DepositOccupationSchema)
def create_occupation(occupation: DepositOccupationCreate, db: Session = Depends(get_db)):
    contract = db.query(RentalContract).filter(RentalContract.id == occupation.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    if occupation.related_device_id:
        device = db.query(DeviceLedger).filter(DeviceLedger.id == occupation.related_device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="设备不存在")
    return create_deposit_occupation(db, occupation)

@app.get("/occupations/")
def list_occupations(contract_id: int = None, status: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(DepositOccupation)
    if contract_id:
        query = query.filter(DepositOccupation.contract_id == contract_id)
    if status:
        query = query.filter(DepositOccupation.status == status)
    return query.order_by(DepositOccupation.created_at.desc()).offset(skip).limit(limit).all()

@app.get("/occupations/{occupation_id}", response_model=OccupationDetailResponse)
def get_occupation(occupation_id: int, db: Session = Depends(get_db)):
    detail = get_occupation_detail(db, occupation_id)
    if not detail:
        raise HTTPException(status_code=404, detail="占用单不存在")
    return detail

@app.post("/occupations/{occupation_id}/review")
def review(occupation_id: int, reviewed_by: str, remark: str = None, db: Session = Depends(get_db)):
    result = review_occupation(db, occupation_id, reviewed_by, remark)
    if not result:
        raise HTTPException(status_code=400, detail="复核失败，可能状态不正确")
    return result

@app.post("/occupations/{occupation_id}/confirm")
def confirm(occupation_id: int, confirmed_by: str, remark: str = None, db: Session = Depends(get_db)):
    result = confirm_occupation(db, occupation_id, confirmed_by, remark)
    if not result:
        raise HTTPException(status_code=400, detail="确认失败，可能状态不正确")
    return result

@app.post("/occupations/{occupation_id}/close")
def close(occupation_id: int, closed_by: str, remark: str = None, db: Session = Depends(get_db)):
    result = close_occupation(db, occupation_id, closed_by, remark)
    if not result:
        raise HTTPException(status_code=400, detail="关闭失败")
    return result

@app.post("/conflicts/{conflict_id}/resolve")
def resolve(conflict_id: int, resolution: str, resolved_by: str, db: Session = Depends(get_db)):
    result = resolve_conflict(db, conflict_id, resolution, resolved_by)
    if not result:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return result

@app.get("/contracts/{contract_id}/ledger")
def get_ledger(contract_id: int, db: Session = Depends(get_db)):
    result = get_contract_deposit_ledger(db, contract_id)
    if not result:
        raise HTTPException(status_code=404, detail="合同不存在")
    return result

@app.get("/export/occupations")
def export_occupations(contract_id: int = None, start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    query = db.query(DepositOccupation)
    if contract_id:
        query = query.filter(DepositOccupation.contract_id == contract_id)
    if start_date:
        query = query.filter(DepositOccupation.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(DepositOccupation.created_at <= datetime.fromisoformat(end_date))
    
    occupations = query.order_by(DepositOccupation.deduction_order, DepositOccupation.created_at).all()
    
    data = []
    for occ in occupations:
        contract = db.query(RentalContract).filter(RentalContract.id == occ.contract_id).first()
        device = db.query(DeviceLedger).filter(DeviceLedger.id == occ.related_device_id).first() if occ.related_device_id else None
        
        data.append({
            "占用单号": occ.occupation_no,
            "合同编号": contract.contract_no if contract else "",
            "承租方": contract.lessee if contract else "",
            "占用类型": occ.occupation_type,
            "占用原因": occ.occupation_reason,
            "金额": occ.amount,
            "抵扣顺序": occ.deduction_order,
            "状态": occ.status,
            "关联设备": device.device_no if device else "",
            "设备型号": device.device_model if device else "",
            "维修单号": occ.related_repair_order or "",
            "是否转押": "是" if occ.is_transfer else "否",
            "存在冲突": "是" if occ.has_conflict else "否",
            "创建人": occ.created_by,
            "创建时间": occ.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "复核人": occ.reviewed_by or "",
            "复核时间": occ.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if occ.reviewed_at else "",
            "确认人": occ.confirmed_by or "",
            "确认时间": occ.confirmed_at.strftime("%Y-%m-%d %H:%M:%S") if occ.confirmed_at else ""
        })
    
    df = pd.DataFrame(data)
    filename = f"押金占用报表_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    filepath = os.path.join(os.getcwd(), filename)
    df.to_excel(filepath, index=False, engine="openpyxl")
    
    return FileResponse(filepath, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=filename)

@app.get("/export/ledger/{contract_id}")
def export_ledger(contract_id: int, db: Session = Depends(get_db)):
    result = get_contract_deposit_ledger(db, contract_id)
    if not result:
        raise HTTPException(status_code=404, detail="合同不存在")
    
    flow_data = []
    for flow in result["flows"]:
        flow_data.append({
            "流水号": flow.flow_no,
            "类型": flow.flow_type,
            "金额": flow.amount,
            "日期": flow.flow_date.strftime("%Y-%m-%d"),
            "操作人": flow.operator,
            "状态": flow.status,
            "来源": flow.source,
            "备注": flow.remark or ""
        })
    
    occ_data = []
    for occ in result["occupations"]:
        device = db.query(DeviceLedger).filter(DeviceLedger.id == occ.related_device_id).first() if occ.related_device_id else None
        occ_data.append({
            "占用单号": occ.occupation_no,
            "类型": occ.occupation_type,
            "原因": occ.occupation_reason,
            "金额": occ.amount,
            "抵扣顺序": occ.deduction_order,
            "状态": occ.status,
            "设备": device.device_no if device else "",
            "创建时间": occ.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    summary_data = [
        {"项目": "合同押金", "金额": result["summary"]["contract_deposit"]},
        {"项目": "流水总收入", "金额": result["summary"]["total_flow_in"]},
        {"项目": "流水总支出", "金额": result["summary"]["total_flow_out"]},
        {"项目": "流水净额", "金额": result["summary"]["net_flow"]},
        {"项目": "已占用金额", "金额": result["summary"]["total_occupied"]},
        {"项目": "可用押金", "金额": result["summary"]["available_deposit"]}
    ]
    
    filename = f"押金账本_{result['contract'].contract_no}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    filepath = os.path.join(os.getcwd(), filename)
    
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        pd.DataFrame(summary_data).to_excel(writer, sheet_name="汇总", index=False)
        pd.DataFrame(flow_data).to_excel(writer, sheet_name="流水明细", index=False)
        pd.DataFrame(occ_data).to_excel(writer, sheet_name="占用明细", index=False)
    
    return FileResponse(filepath, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
