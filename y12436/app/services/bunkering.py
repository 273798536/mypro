from __future__ import annotations
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import BunkeringSlip
from app.schemas import BunkeringSlipCreate


def import_slips(db: Session, slips: list[BunkeringSlipCreate]) -> list[BunkeringSlip]:
    created = []
    for slip_in in slips:
        existing = db.query(BunkeringSlip).filter(BunkeringSlip.slip_no == slip_in.slip_no).first()
        if existing:
            continue
        slip = BunkeringSlip(**slip_in.model_dump())
        db.add(slip)
        created.append(slip)
    db.commit()
    for s in created:
        db.refresh(s)
    return created


def list_slips(db: Session, voyage_id: int | None = None) -> list[BunkeringSlip]:
    q = db.query(BunkeringSlip)
    if voyage_id is not None:
        q = q.filter(BunkeringSlip.voyage_id == voyage_id)
    return q.all()


def get_slip(db: Session, slip_id: int) -> BunkeringSlip | None:
    return db.query(BunkeringSlip).filter(BunkeringSlip.id == slip_id).first()


def get_unlinked_slips(db: Session) -> list[BunkeringSlip]:
    return db.query(BunkeringSlip).filter(BunkeringSlip.voyage_id.is_(None)).all()
