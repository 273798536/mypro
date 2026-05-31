from __future__ import annotations
from sqlalchemy.orm import Session
from app.models import VoyagePlan, BunkeringSlip, PnLAllocation, AuditTrail, AuditType
from app.schemas import VoyagePlanCreate, ImpactItem, VoyageImpactReport


def create_voyage(db: Session, voyage_in: VoyagePlanCreate) -> VoyagePlan:
    voyage = VoyagePlan(**voyage_in.model_dump())
    db.add(voyage)
    db.commit()
    db.refresh(voyage)
    if voyage.is_supplementary:
        _link_unlinked_slips(db, voyage)
    return voyage


def _link_unlinked_slips(db: Session, voyage: VoyagePlan) -> list[ImpactItem]:
    slips = (
        db.query(BunkeringSlip)
        .filter(
            BunkeringSlip.voyage_id.is_(None),
            BunkeringSlip.vessel_name == voyage.vessel_name,
        )
        .all()
    )
    impacts: list[ImpactItem] = []
    for slip in slips:
        old_voyage = slip.voyage_id
        slip.voyage_id = voyage.id
        allocations = db.query(PnLAllocation).filter(PnLAllocation.bunkering_slip_id == slip.id).all()
        for alloc in allocations:
            alloc.voyage_id = voyage.id
            audit = AuditTrail(
                allocation_id=alloc.id,
                audit_type=AuditType.VOYAGE_MISMATCH,
                old_value=str(old_voyage) if old_voyage else "None",
                new_value=str(voyage.id),
                description=f"航次补录 {voyage.voyage_no}，加油单 {slip.slip_no} 关联航次变更",
            )
            db.add(audit)
            impacts.append(
                ImpactItem(
                    allocation_id=alloc.id,
                    bunkering_slip_no=slip.slip_no,
                    field_changed="voyage_id",
                    old_value=str(old_voyage),
                    new_value=str(voyage.id),
                )
            )
    db.commit()
    return impacts


def get_voyage_impact(db: Session, voyage_id: int) -> VoyageImpactReport | None:
    voyage = db.query(VoyagePlan).filter(VoyagePlan.id == voyage_id).first()
    if not voyage:
        return None
    audits = (
        db.query(AuditTrail)
        .filter(AuditTrail.audit_type == AuditType.VOYAGE_MISMATCH)
        .all()
    )
    items = []
    for a in audits:
        alloc = db.query(PnLAllocation).filter(PnLAllocation.id == a.allocation_id).first()
        if alloc and alloc.voyage_id == voyage_id:
            slip = db.query(BunkeringSlip).filter(BunkeringSlip.id == alloc.bunkering_slip_id).first()
            items.append(
                ImpactItem(
                    allocation_id=alloc.id,
                    bunkering_slip_no=slip.slip_no if slip else "",
                    field_changed="voyage_id",
                    old_value=a.old_value,
                    new_value=a.new_value,
                )
            )
    return VoyageImpactReport(voyage_id=voyage.id, voyage_no=voyage.voyage_no, impacted_items=items)


def list_voyages(db: Session) -> list[VoyagePlan]:
    return db.query(VoyagePlan).all()
