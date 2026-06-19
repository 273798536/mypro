from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import ManualCorrection, ReviewSession, User, SessionStatus
from ..schemas import ManualCorrectionCreate, ManualCorrectionResponse
from ..auth import get_current_reviewer, get_current_any_role

router = APIRouter()


def _enrich_correction_response(correction: ManualCorrection, db: Session) -> ManualCorrectionResponse:
    operator = db.query(User).filter(User.id == correction.operator_id).first()
    response = ManualCorrectionResponse.model_validate(correction)
    response.operator_name = operator.full_name if operator else None
    return response


@router.get("", response_model=list[ManualCorrectionResponse])
def list_corrections(
    session_id: int = None,
    include_overridden: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(ManualCorrection)
    
    if session_id:
        query = query.filter(ManualCorrection.session_id == session_id)
    if not include_overridden:
        query = query.filter(ManualCorrection.is_overridden == False)
    
    corrections = query.order_by(ManualCorrection.created_at.desc()).all()
    return [_enrich_correction_response(c, db) for c in corrections]


@router.post("", response_model=ManualCorrectionResponse)
def create_correction(
    correction_data: ManualCorrectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = db.query(ReviewSession).filter(
        ReviewSession.id == correction_data.session_id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    existing_corrections = db.query(ManualCorrection).filter(
        ManualCorrection.session_id == correction_data.session_id,
        ManualCorrection.target_item_id == correction_data.target_item_id,
        ManualCorrection.is_overridden == False
    ).all()
    
    for existing in existing_corrections:
        existing.is_overridden = True
        existing.overridden_at = func.now()
    
    correction = ManualCorrection(
        **correction_data.model_dump(),
        operator_id=current_user.id
    )
    db.add(correction)
    
    if session.status == SessionStatus.WAITING_CONFIRM:
        session.status = SessionStatus.PROCESSING
    
    session.updated_at = func.now()
    db.commit()
    db.refresh(correction)
    
    return _enrich_correction_response(correction, db)


@router.get("/{correction_id}", response_model=ManualCorrectionResponse)
def get_correction(
    correction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    correction = db.query(ManualCorrection).filter(
        ManualCorrection.id == correction_id
    ).first()
    if not correction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="修正记录不存在"
        )
    return _enrich_correction_response(correction, db)


@router.delete("/{correction_id}")
def override_correction(
    correction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    correction = db.query(ManualCorrection).filter(
        ManualCorrection.id == correction_id
    ).first()
    if not correction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="修正记录不存在"
        )
    
    if correction.is_overridden:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该修正已被覆盖"
        )
    
    correction.is_overridden = True
    correction.overridden_at = func.now()
    
    session = db.query(ReviewSession).filter(
        ReviewSession.id == correction.session_id
    ).first()
    if session:
        session.updated_at = func.now()
    
    db.commit()
    
    return {
        "message": "修正已被覆盖",
        "correction_id": correction_id,
        "overridden_at": correction.overridden_at
    }


@router.get("/session/{session_id}/history", response_model=list[ManualCorrectionResponse])
def get_correction_history(
    session_id: int,
    target_item_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(ManualCorrection).filter(
        ManualCorrection.session_id == session_id
    )
    
    if target_item_id:
        query = query.filter(ManualCorrection.target_item_id == target_item_id)
    
    corrections = query.order_by(ManualCorrection.created_at.desc()).all()
    return [_enrich_correction_response(c, db) for c in corrections]
