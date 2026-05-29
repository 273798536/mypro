from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    SettlementRecord,
    SettlementChangeLog,
    FarmerProfile,
    DeliveryTicket,
    FloorPriceAgreement,
    QualityGrade,
)
from app.schemas import (
    Phase1ImportRequest,
    Phase2ImportRequest,
    PhaseImportSummary,
    Phase2ImportSummary,
    PhaseImportResult,
    Phase2ImportResult,
    SettlementOut,
    ChangeLogOut,
    DeductionDisputeRequest,
    GradeReverifyRequest,
    ManualCorrectionRequest,
    SettlementComparison,
    FarmerOut,
    DeliveryTicketOut,
    FloorPriceAgreementOut,
    QualityGradeOut,
)
from app import services

router = APIRouter(prefix="/api")


@router.post("/import/phase1", response_model=PhaseImportResult)
def import_phase1(request: Phase1ImportRequest, db: Session = Depends(get_db)):
    data = {
        "grades": [g.model_dump() for g in request.grades],
        "farmers": [f.model_dump() for f in request.farmers],
        "tickets": [t.model_dump() for t in request.tickets],
    }
    summary_dict = services.import_phase1(db, data)
    summary = PhaseImportSummary(**summary_dict)

    settlements = db.query(SettlementRecord).all()
    return PhaseImportResult(
        phase="phase1",
        summary=summary,
        settlements=[SettlementOut.model_validate(s) for s in settlements],
    )


@router.post("/import/phase2", response_model=Phase2ImportResult)
def import_phase2(request: Phase2ImportRequest, db: Session = Depends(get_db)):
    data = {
        "agreements": [a.model_dump() for a in request.agreements],
    }
    summary_dict = services.import_phase2(db, data)
    summary = Phase2ImportSummary(**summary_dict)

    updated_ids = [d["settlement_id"] for d in summary_dict.get("change_details", [])]
    updated_settlements = (
        db.query(SettlementRecord).filter(SettlementRecord.id.in_(updated_ids)).all()
        if updated_ids
        else []
    )
    return Phase2ImportResult(
        phase="phase2",
        summary=summary,
        updated_settlements=[SettlementOut.model_validate(s) for s in updated_settlements],
    )


@router.get("/settlements", response_model=list[SettlementOut])
def list_settlements(
    farmer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(SettlementRecord)
    if farmer_id:
        q = q.filter(SettlementRecord.farmer_id == farmer_id)
    if status:
        q = q.filter(SettlementRecord.status == status)
    return q.all()


@router.get("/settlements/{settlement_id}", response_model=SettlementOut)
def get_settlement(settlement_id: int, db: Session = Depends(get_db)):
    settlement = db.query(SettlementRecord).filter(SettlementRecord.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")
    return settlement


@router.get("/settlements/{settlement_id}/changelog", response_model=list[ChangeLogOut])
def get_changelog(settlement_id: int, db: Session = Depends(get_db)):
    logs = db.query(SettlementChangeLog).filter(SettlementChangeLog.settlement_id == settlement_id).order_by(SettlementChangeLog.created_at).all()
    return logs


@router.post("/settlements/{settlement_id}/dispute", response_model=dict)
def deduction_dispute(settlement_id: int, request: DeductionDisputeRequest, db: Session = Depends(get_db)):
    try:
        result = services.handle_deduction_dispute(db, settlement_id, request.dispute_reason, request.operator)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@router.post("/settlements/{settlement_id}/reverify-grade", response_model=dict)
def grade_reverify(settlement_id: int, request: GradeReverifyRequest, db: Session = Depends(get_db)):
    try:
        result = services.handle_grade_reverification(db, settlement_id, request.new_grade_code, request.reason, request.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/settlements/{settlement_id}/update-market-price", response_model=dict)
def update_market_price(settlement_id: int, market_price: float, operator: str = "system", db: Session = Depends(get_db)):
    try:
        result = services.update_market_price(db, settlement_id, market_price, operator)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@router.post("/corrections/{ticket_id}", response_model=SettlementComparison)
def manual_correction(ticket_id: int, request: ManualCorrectionRequest, db: Session = Depends(get_db)):
    try:
        result = services.apply_manual_correction(db, ticket_id, request.corrections, request.reason, request.operator)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return SettlementComparison(**result)


@router.get("/farmers", response_model=list[FarmerOut])
def list_farmers(db: Session = Depends(get_db)):
    return db.query(FarmerProfile).all()


@router.get("/tickets", response_model=list[DeliveryTicketOut])
def list_tickets(db: Session = Depends(get_db)):
    return db.query(DeliveryTicket).all()


@router.get("/agreements", response_model=list[FloorPriceAgreementOut])
def list_agreements(db: Session = Depends(get_db)):
    return db.query(FloorPriceAgreement).all()


@router.get("/grades", response_model=list[QualityGradeOut])
def list_grades(db: Session = Depends(get_db)):
    return db.query(QualityGrade).all()


@router.post("/settlements/{settlement_id}/recalculate", response_model=dict)
def recalculate_settlement(settlement_id: int, db: Session = Depends(get_db)):
    settlement = db.query(SettlementRecord).filter(SettlementRecord.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")
    result = services.reevaluate_settlement(
        db=db,
        settlement=settlement,
        change_type="recalculate",
        operator="system",
    )
    return result
