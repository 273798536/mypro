from __future__ import annotations
from sqlalchemy.orm import Session
from app.models import HedgeContract, PnLAllocation, AuditTrail, AuditType
from app.schemas import HedgeContractCreate


def create_contract(db: Session, contract_in: HedgeContractCreate) -> HedgeContract:
    contract = HedgeContract(**contract_in.model_dump())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


def extend_contract(db: Session, contract_id: int, new_end_date, new_price: float) -> HedgeContract | None:
    old_contract = db.query(HedgeContract).filter(HedgeContract.id == contract_id).first()
    if not old_contract or old_contract.status != "active":
        return None
    new_version = HedgeContract(
        contract_no=old_contract.contract_no,
        version=old_contract.version + 1,
        fuel_type=old_contract.fuel_type,
        hedge_quantity_mt=old_contract.hedge_quantity_mt,
        hedge_price_usd=new_price,
        start_date=old_contract.start_date,
        end_date=new_end_date,
        is_extended=True,
        replaced_by_id=None,
        status="active",
    )
    db.add(new_version)
    db.flush()
    old_contract.replaced_by_id = new_version.id
    old_contract.status = "superseded"
    linked_allocs = db.query(PnLAllocation).filter(PnLAllocation.hedge_contract_id == contract_id).all()
    for alloc in linked_allocs:
        audit = AuditTrail(
            allocation_id=alloc.id,
            audit_type=AuditType.CONTRACT_EXT_OVERWRITE,
            old_value=f"v{old_contract.version}",
            new_value=f"v{new_version.version}",
            description=f"合约 {old_contract.contract_no} 展期，v{old_contract.version} 被 v{new_version.version} 覆盖",
        )
        db.add(audit)
    db.commit()
    db.refresh(new_version)
    return new_version


def list_contracts(db: Session, contract_no: str | None = None) -> list[HedgeContract]:
    q = db.query(HedgeContract)
    if contract_no:
        q = q.filter(HedgeContract.contract_no == contract_no)
    return q.order_by(HedgeContract.contract_no, HedgeContract.version).all()


def match_to_allocation(db: Session, allocation_id: int, contract_id: int) -> PnLAllocation | None:
    from app.models import PnLAllocation
    alloc = db.query(PnLAllocation).filter(PnLAllocation.id == allocation_id).first()
    if not alloc:
        return None
    contract = db.query(HedgeContract).filter(HedgeContract.id == contract_id).first()
    if not contract or contract.status != "active":
        return None
    alloc.hedge_contract_id = contract_id
    db.commit()
    db.refresh(alloc)
    return alloc
