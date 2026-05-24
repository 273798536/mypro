from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.common import StatusUpdate
from app.services.auth import AuthService
from app.services.status import StatusService

router = APIRouter()


@router.post("/{entity_type}/{entity_id}")
def update_status(
    entity_type: str,
    entity_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    try:
        entity = StatusService.transition_status(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            new_status=data.new_status,
            user=current_user,
            reason=data.reason,
        )
        return {
            "success": True,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "new_status": entity.status.value,
            "version": entity.version,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{entity_type}/{entity_id}/allowed")
def get_allowed_transitions(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    entity_class = StatusService._get_entity_class(entity_type)
    entity = db.query(entity_class).filter(entity_class.id == entity_id).first()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    allowed = StatusService.get_allowed_transitions(entity)
    
    return {
        "current_status": entity.status.value,
        "allowed_transitions": allowed,
        "can_edit": StatusService.can_edit(entity),
        "is_readonly": StatusService.is_readonly(entity),
    }


@router.post("/{entity_type}/{entity_id}/freeze")
def freeze_entity(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    try:
        entity = StatusService.freeze_entity(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            user=current_user,
            reason="Manual freeze",
        )
        return {
            "success": True,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "new_status": entity.status.value,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
