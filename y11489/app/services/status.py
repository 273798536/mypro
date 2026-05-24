from typing import Any, Dict, Optional, Type
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.states import RecordStatus, StatusTransition
from app.models.user import User, UserRole
from app.models.inspection import InspectionRecord
from app.models.rework import ReworkOrder
from app.models.price_adjustment import PriceAdjustment
from app.services.audit import AuditService


class StatusService:
    ENTITY_CLASSES: Dict[str, Type] = {
        "inspection": InspectionRecord,
        "rework": ReworkOrder,
        "price_adjustment": PriceAdjustment,
    }

    @staticmethod
    def _get_entity_class(entity_type: str) -> Type:
        entity_class = StatusService.ENTITY_CLASSES.get(entity_type)
        if not entity_class:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported entity type: {entity_type}"
            )
        return entity_class

    @staticmethod
    def _check_role_permission(user: User, required_role_str: str) -> bool:
        try:
            required_role = UserRole(required_role_str)
            return user.has_permission(required_role)
        except ValueError:
            return False

    @staticmethod
    def transition_status(
        db: Session,
        entity_type: str,
        entity_id: int,
        new_status: str,
        user: User,
        reason: Optional[str] = None,
    ) -> Any:
        entity_class = StatusService._get_entity_class(entity_type)
        entity = db.query(entity_class).filter(entity_class.id == entity_id).first()
        
        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{entity_type} not found"
            )

        old_status = entity.status
        try:
            new_status_enum = RecordStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {new_status}"
            )

        if not StatusTransition.can_transition(old_status, new_status_enum):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {old_status.value} to {new_status}"
            )

        required_role = StatusTransition.get_required_role(old_status, new_status_enum)
        if required_role and not StatusService._check_role_permission(user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {required_role}"
            )

        old_data = {
            "status": old_status.value,
            "version": entity.version,
        }

        entity.status = new_status_enum
        entity.version += 1
        entity.updated_by = user.id

        db.commit()
        db.refresh(entity)

        new_data = {
            "status": new_status,
            "version": entity.version,
        }

        AuditService.log_action(
            db=db,
            action=f"status_change_{old_status.value}_to_{new_status}",
            entity_type=entity_type,
            entity_id=entity_id,
            user=user,
            old_values=old_data,
            new_values=new_data,
            change_reason=reason,
        )

        AuditService.record_change(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            field_name="status",
            old_value=old_status.value,
            new_value=new_status,
            user=user,
            version=entity.version,
            is_manual_change=True,
            change_reason=reason,
            status_before=old_status,
            status_after=new_status_enum,
        )

        return entity

    @staticmethod
    def freeze_entity(
        db: Session,
        entity_type: str,
        entity_id: int,
        user: User,
        reason: Optional[str] = None,
    ) -> Any:
        return StatusService.transition_status(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            new_status=RecordStatus.FROZEN.value,
            user=user,
            reason=reason,
        )

    @staticmethod
    def mark_exported(
        db: Session,
        entity_type: str,
        entity_id: int,
        user: User,
    ) -> Any:
        return StatusService.transition_status(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            new_status=RecordStatus.EXPORTED.value,
            user=user,
            reason="Exported",
        )

    @staticmethod
    def can_edit(entity: Any) -> bool:
        return StatusTransition.is_editable(entity.status)

    @staticmethod
    def is_readonly(entity: Any) -> bool:
        return StatusTransition.is_readonly(entity.status)

    @staticmethod
    def get_allowed_transitions(entity: Any) -> Dict[str, str]:
        current_status = entity.status
        allowed = StatusTransition.get_allowed_transitions(current_status)
        result = {}
        for status_enum in allowed:
            required_role = StatusTransition.get_required_role(current_status, status_enum)
            result[status_enum.value] = required_role or "any"
        return result
