from __future__ import annotations
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import PnLAllocation, AllocationStatus, AuditTrail, AuditType
from app.schemas import PnLAllocationCreate


def create_allocation(db: Session, alloc_in: PnLAllocationCreate) -> PnLAllocation:
    alloc = PnLAllocation(**alloc_in.model_dump(), status=AllocationStatus.DRAFT)
    db.add(alloc)
    db.commit()
    db.refresh(alloc)
    return alloc


def batch_create(db: Session, items: list[PnLAllocationCreate]) -> list[PnLAllocation]:
    results = []
    for item in items:
        alloc = PnLAllocation(**item.model_dump(), status=AllocationStatus.DRAFT)
        db.add(alloc)
        results.append(alloc)
    db.commit()
    for a in results:
        db.refresh(a)
    return results


def review_allocation(db: Session, allocation_id: int, reviewer: str) -> PnLAllocation | None:
    alloc = db.query(PnLAllocation).filter(PnLAllocation.id == allocation_id).first()
    if not alloc or alloc.status != AllocationStatus.DRAFT:
        return None
    alloc.status = AllocationStatus.UNDER_REVIEW
    alloc.reviewed_by = reviewer
    alloc.reviewed_at = datetime.utcnow()
    _check_rate_date(db, alloc)
    _check_voyage_mismatch(db, alloc)
    db.commit()
    db.refresh(alloc)
    return alloc


def approve_allocation(db: Session, allocation_id: int, approver: str) -> PnLAllocation | None:
    alloc = db.query(PnLAllocation).filter(PnLAllocation.id == allocation_id).first()
    if not alloc or alloc.status != AllocationStatus.UNDER_REVIEW:
        return None
    alloc.status = AllocationStatus.APPROVED
    alloc.approved_by = approver
    alloc.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(alloc)
    return alloc


def mark_exported(db: Session, allocation_ids: list[int]) -> list[PnLAllocation]:
    allocs = db.query(PnLAllocation).filter(PnLAllocation.id.in_(allocation_ids)).all()
    for alloc in allocs:
        if alloc.status == AllocationStatus.APPROVED:
            alloc.status = AllocationStatus.EXPORTED
    db.commit()
    for a in allocs:
        db.refresh(a)
    return allocs


def list_allocations(db: Session, status: AllocationStatus | None = None) -> list[PnLAllocation]:
    q = db.query(PnLAllocation)
    if status:
        q = q.filter(PnLAllocation.status == status)
    return q.all()


def get_allocation(db: Session, allocation_id: int) -> PnLAllocation | None:
    return db.query(PnLAllocation).filter(PnLAllocation.id == allocation_id).first()


def _check_rate_date(db: Session, alloc: PnLAllocation) -> None:
    from app.models import BunkeringSlip
    slip = db.query(BunkeringSlip).filter(BunkeringSlip.id == alloc.bunkering_slip_id).first()
    if not slip:
        return
    if alloc.exchange_rate_date_used and slip.bunkering_date:
        if alloc.exchange_rate_date_used != slip.bunkering_date:
            audit = AuditTrail(
                allocation_id=alloc.id,
                audit_type=AuditType.RATE_DATE_ERROR,
                old_value=slip.bunkering_date.isoformat(),
                new_value=alloc.exchange_rate_date_used.isoformat(),
                description=f"汇率日期 {alloc.exchange_rate_date_used} 与加油日 {slip.bunkering_date} 不一致",
            )
            db.add(audit)


def _check_voyage_mismatch(db: Session, alloc: PnLAllocation) -> None:
    from app.models import BunkeringSlip
    slip = db.query(BunkeringSlip).filter(BunkeringSlip.id == alloc.bunkering_slip_id).first()
    if not slip:
        return
    if alloc.voyage_id and slip.voyage_id and alloc.voyage_id != slip.voyage_id:
        audit = AuditTrail(
            allocation_id=alloc.id,
            audit_type=AuditType.VOYAGE_MISMATCH,
            old_value=str(slip.voyage_id),
            new_value=str(alloc.voyage_id),
            description=f"损益归集航次 {alloc.voyage_id} 与加油单航次 {slip.voyage_id} 错配",
        )
        db.add(audit)
