from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import OperationGuide, User
from ..schemas import OperationGuideBase, OperationGuideResponse
from ..auth import get_current_admin, get_current_any_role

router = APIRouter()


@router.get("", response_model=list[OperationGuideResponse])
def list_guides(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(OperationGuide)
    if active_only:
        query = query.filter(OperationGuide.is_active == True)
    
    guides = query.order_by(OperationGuide.sort_order.asc()).all()
    return [OperationGuideResponse.model_validate(g) for g in guides]


@router.get("/by-position/{position_hint}", response_model=list[OperationGuideResponse])
def get_guides_by_position(
    position_hint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    guides = db.query(OperationGuide).filter(
        OperationGuide.position_hint == position_hint,
        OperationGuide.is_active == True
    ).order_by(OperationGuide.sort_order.asc()).all()
    return [OperationGuideResponse.model_validate(g) for g in guides]


@router.post("", response_model=OperationGuideResponse)
def create_guide(
    guide_data: OperationGuideBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    existing = db.query(OperationGuide).filter(
        OperationGuide.section_key == guide_data.section_key
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"section_key {guide_data.section_key} 已存在"
        )
    
    guide = OperationGuide(**guide_data.model_dump())
    db.add(guide)
    db.commit()
    db.refresh(guide)
    return OperationGuideResponse.model_validate(guide)


@router.put("/{guide_id}", response_model=OperationGuideResponse)
def update_guide(
    guide_id: int,
    guide_data: OperationGuideBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    guide = db.query(OperationGuide).filter(OperationGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="操作指引不存在"
        )
    
    for field, value in guide_data.model_dump(exclude_unset=True).items():
        setattr(guide, field, value)
    
    guide.updated_at = func.now()
    db.commit()
    db.refresh(guide)
    return OperationGuideResponse.model_validate(guide)


@router.delete("/{guide_id}")
def delete_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    guide = db.query(OperationGuide).filter(OperationGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="操作指引不存在"
        )
    
    db.delete(guide)
    db.commit()
    return {"message": "操作指引已删除"}
