from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime
import json
from models import (
    RentalContract, DepositFlow, DeviceLedger, DepositOccupation,
    OccupationStatusHistory, ConflictRecord
)
from schemas import (
    RentalContractCreate, DepositFlowCreate, DeviceLedgerCreate,
    DepositOccupationCreate
)

def generate_occupation_no(db: Session) -> str:
    last_occupation = db.query(DepositOccupation).order_by(desc(DepositOccupation.id)).first()
    next_id = (last_occupation.id + 1) if last_occupation else 1
    return f"OCC{datetime.now().strftime('%Y%m%d')}{next_id:04d}"

def create_rental_contract(db: Session, contract: RentalContractCreate):
    db_contract = RentalContract(**contract.dict())
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

def create_deposit_flow(db: Session, flow: DepositFlowCreate):
    db_flow = DepositFlow(**flow.dict())
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow

def create_device_ledger(db: Session, device: DeviceLedgerCreate):
    db_device = DeviceLedger(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def check_data_conflict(db: Session, occupation_data: DepositOccupationCreate) -> list:
    conflicts = []
    contract = db.query(RentalContract).filter(RentalContract.id == occupation_data.contract_id).first()
    if not contract:
        return conflicts
    
    total_flow_in = db.query(DepositFlow).filter(
        DepositFlow.contract_id == occupation_data.contract_id,
        DepositFlow.flow_type.in_(["deposit_paid", "transfer_in"]),
        DepositFlow.status == "confirmed"
    ).with_entities(func.sum(DepositFlow.amount)).scalar() or 0
    
    total_flow_out = db.query(DepositFlow).filter(
        DepositFlow.contract_id == occupation_data.contract_id,
        DepositFlow.flow_type.in_(["deposit_refund", "transfer_out"]),
        DepositFlow.status == "confirmed"
    ).with_entities(func.sum(DepositFlow.amount)).scalar() or 0
    
    net_flow = total_flow_in - total_flow_out
    if abs(net_flow - contract.total_deposit) > 0.01:
        conflicts.append({
            "type": "contract_vs_flow",
            "description": f"合同押金({contract.total_deposit})与流水净额({net_flow})不一致",
            "contract_data": json.dumps({"total_deposit": contract.total_deposit}, ensure_ascii=False),
            "flow_data": json.dumps({"net_flow": net_flow, "total_in": total_flow_in, "total_out": total_flow_out}, ensure_ascii=False)
        })
    
    if occupation_data.related_device_id:
        device = db.query(DeviceLedger).filter(DeviceLedger.id == occupation_data.related_device_id).first()
        if device and device.contract_id != occupation_data.contract_id:
            conflicts.append({
                "type": "contract_vs_device",
                "description": f"设备{device.device_no}所属合同与占用单合同不一致",
                "contract_data": json.dumps({"contract_id": occupation_data.contract_id}, ensure_ascii=False),
                "device_data": json.dumps({"device_no": device.device_no, "contract_id": device.contract_id}, ensure_ascii=False)
            })
    
    if occupation_data.related_device_id:
        device = db.query(DeviceLedger).filter(DeviceLedger.id == occupation_data.related_device_id).first()
        if device and occupation_data.amount > device.deposit_amount:
            conflicts.append({
                "type": "flow_vs_device",
                "description": f"占用金额({occupation_data.amount})超过设备押金({device.deposit_amount})",
                "flow_data": json.dumps({"occupation_amount": occupation_data.amount}, ensure_ascii=False),
                "device_data": json.dumps({"device_no": device.device_no, "deposit_amount": device.deposit_amount}, ensure_ascii=False)
            })
    
    return conflicts

def create_conflict_record(db: Session, occupation_id: int, conflict: dict):
    db_conflict = ConflictRecord(
        occupation_id=occupation_id,
        conflict_type=conflict["type"],
        description=conflict["description"],
        contract_data=conflict.get("contract_data"),
        flow_data=conflict.get("flow_data"),
        device_data=conflict.get("device_data")
    )
    db.add(db_conflict)
    db.commit()
    return db_conflict

def create_status_history(db: Session, occupation_id: int, from_status: str, to_status: str, changed_by: str, remark: str = None):
    db_history = OccupationStatusHistory(
        occupation_id=occupation_id,
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        remark=remark
    )
    db.add(db_history)
    db.commit()
    return db_history

def create_deposit_occupation(db: Session, occupation: DepositOccupationCreate):
    occupation_no = generate_occupation_no(db)
    db_occupation = DepositOccupation(
        **occupation.dict(),
        occupation_no=occupation_no,
        status="pending"
    )
    db.add(db_occupation)
    db.commit()
    db.refresh(db_occupation)
    
    conflicts = check_data_conflict(db, occupation)
    if conflicts:
        db_occupation.has_conflict = True
        for conflict in conflicts:
            create_conflict_record(db, db_occupation.id, conflict)
        db.commit()
        db.refresh(db_occupation)
    
    create_status_history(db, db_occupation.id, "", "pending", occupation.created_by, "创建占用单")
    
    return db_occupation

def review_occupation(db: Session, occupation_id: int, reviewed_by: str, remark: str = None):
    occupation = db.query(DepositOccupation).filter(DepositOccupation.id == occupation_id).first()
    if not occupation or occupation.status != "pending":
        return None
    
    old_status = occupation.status
    occupation.status = "reviewed"
    occupation.reviewed_at = datetime.now()
    occupation.reviewed_by = reviewed_by
    db.commit()
    db.refresh(occupation)
    
    create_status_history(db, occupation.id, old_status, "reviewed", reviewed_by, remark or "复核通过")
    
    return occupation

def confirm_occupation(db: Session, occupation_id: int, confirmed_by: str, remark: str = None):
    occupation = db.query(DepositOccupation).filter(DepositOccupation.id == occupation_id).first()
    if not occupation or occupation.status != "reviewed":
        return None
    
    old_status = occupation.status
    occupation.status = "confirmed"
    occupation.confirmed_at = datetime.now()
    occupation.confirmed_by = confirmed_by
    db.commit()
    db.refresh(occupation)
    
    create_status_history(db, occupation.id, old_status, "confirmed", confirmed_by, remark or "确认占用")
    
    return occupation

def close_occupation(db: Session, occupation_id: int, closed_by: str, remark: str = None):
    occupation = db.query(DepositOccupation).filter(DepositOccupation.id == occupation_id).first()
    if not occupation:
        return None
    
    old_status = occupation.status
    occupation.status = "closed"
    db.commit()
    db.refresh(occupation)
    
    create_status_history(db, occupation.id, old_status, "closed", closed_by, remark or "关闭占用")
    
    return occupation

def resolve_conflict(db: Session, conflict_id: int, resolution: str, resolved_by: str):
    conflict = db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()
    if not conflict:
        return None
    
    conflict.resolution = resolution
    conflict.resolved_at = datetime.now()
    conflict.resolved_by = resolved_by
    db.commit()
    db.refresh(conflict)
    
    return conflict

def get_occupation_detail(db: Session, occupation_id: int):
    occupation = db.query(DepositOccupation).filter(DepositOccupation.id == occupation_id).first()
    if not occupation:
        return None
    
    contract = db.query(RentalContract).filter(RentalContract.id == occupation.contract_id).first()
    device = db.query(DeviceLedger).filter(DeviceLedger.id == occupation.related_device_id).first() if occupation.related_device_id else None
    status_history = db.query(OccupationStatusHistory).filter(OccupationStatusHistory.occupation_id == occupation_id).order_by(OccupationStatusHistory.changed_at).all()
    conflict_records = db.query(ConflictRecord).filter(ConflictRecord.occupation_id == occupation_id).all()
    deposit_flows = db.query(DepositFlow).filter(DepositFlow.contract_id == occupation.contract_id).all()
    
    return {
        "occupation": occupation,
        "contract": contract,
        "device": device,
        "status_history": status_history,
        "conflict_records": conflict_records,
        "deposit_flows": deposit_flows
    }

def get_contract_deposit_ledger(db: Session, contract_id: int):
    contract = db.query(RentalContract).filter(RentalContract.id == contract_id).first()
    if not contract:
        return None
    
    flows = db.query(DepositFlow).filter(DepositFlow.contract_id == contract_id).order_by(DepositFlow.flow_date).all()
    
    occupations = db.query(DepositOccupation).filter(
        DepositOccupation.contract_id == contract_id,
        DepositOccupation.status.in_(["confirmed", "closed"])
    ).order_by(DepositOccupation.deduction_order, DepositOccupation.created_at).all()
    
    total_flow_in = sum(f.amount for f in flows if f.flow_type in ["deposit_paid", "transfer_in"])
    total_flow_out = sum(f.amount for f in flows if f.flow_type in ["deposit_refund", "transfer_out"])
    total_occupied = sum(o.amount for o in occupations)
    
    return {
        "contract": contract,
        "flows": flows,
        "occupations": occupations,
        "summary": {
            "contract_deposit": contract.total_deposit,
            "total_flow_in": total_flow_in,
            "total_flow_out": total_flow_out,
            "net_flow": total_flow_in - total_flow_out,
            "total_occupied": total_occupied,
            "available_deposit": (total_flow_in - total_flow_out) - total_occupied
        }
    }
