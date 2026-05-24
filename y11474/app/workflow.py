from typing import Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session

from app.models import RecordStatus, UserRole, User, ReturnApplication, AuditLog
from app.security import RolePermission


class WorkflowEngine:
    TRANSITION_MAP: Dict[RecordStatus, Set[RecordStatus]] = {
        RecordStatus.DRAFT: {
            RecordStatus.SUBMITTED
        },
        RecordStatus.SUBMITTED: {
            RecordStatus.REJECTED,
            RecordStatus.SECOND_CONFIRM
        },
        RecordStatus.REJECTED: {
            RecordStatus.SUBMITTED,
            RecordStatus.DRAFT
        },
        RecordStatus.SECOND_CONFIRM: {
            RecordStatus.AUDIT_ONLY,
            RecordStatus.REJECTED
        },
        RecordStatus.AUDIT_ONLY: set()
    }

    ROLE_TRANSITION_PERMISSIONS: Dict[Tuple[RecordStatus, RecordStatus], Set[UserRole]] = {
        (RecordStatus.DRAFT, RecordStatus.SUBMITTED): {UserRole.DATA_ENTRY, UserRole.SUPERVISOR},
        (RecordStatus.SUBMITTED, RecordStatus.REJECTED): {UserRole.REVIEWER, UserRole.SUPERVISOR},
        (RecordStatus.SUBMITTED, RecordStatus.SECOND_CONFIRM): {UserRole.REVIEWER, UserRole.SUPERVISOR},
        (RecordStatus.REJECTED, RecordStatus.SUBMITTED): {UserRole.DATA_ENTRY, UserRole.SUPERVISOR},
        (RecordStatus.REJECTED, RecordStatus.DRAFT): {UserRole.DATA_ENTRY, UserRole.SUPERVISOR},
        (RecordStatus.SECOND_CONFIRM, RecordStatus.AUDIT_ONLY): {UserRole.SUPERVISOR},
        (RecordStatus.SECOND_CONFIRM, RecordStatus.REJECTED): {UserRole.SUPERVISOR},
    }

    @classmethod
    def can_transition(cls, current_status: RecordStatus, new_status: RecordStatus) -> bool:
        return new_status in cls.TRANSITION_MAP.get(current_status, set())

    @classmethod
    def can_perform_transition(
        cls,
        current_status: RecordStatus,
        new_status: RecordStatus,
        user_role: UserRole
    ) -> bool:
        if not cls.can_transition(current_status, new_status):
            return False
        
        allowed_roles = cls.ROLE_TRANSITION_PERMISSIONS.get(
            (current_status, new_status), set()
        )
        return user_role in allowed_roles

    @classmethod
    def get_allowed_transitions(
        cls,
        current_status: RecordStatus,
        user_role: UserRole
    ) -> Set[RecordStatus]:
        possible_transitions = cls.TRANSITION_MAP.get(current_status, set())
        allowed = set()
        for target in possible_transitions:
            if cls.can_perform_transition(current_status, target, user_role):
                allowed.add(target)
        return allowed

    @classmethod
    def transition(
        cls,
        db: Session,
        application: ReturnApplication,
        new_status: RecordStatus,
        user: User,
        change_reason: Optional[str] = None
    ) -> ReturnApplication:
        old_status = application.status
        
        if not cls.can_perform_transition(old_status, new_status, user.role):
            raise ValueError(
                f"角色 {user.role.value} 无权从 {old_status.value} 转换到 {new_status.value}"
            )

        application.status = new_status
        application.updated_by = user.id

        audit_log = AuditLog(
            application_id=application.id,
            user_id=user.id,
            action=f"status_change_{old_status.value}_to_{new_status.value}",
            old_status=old_status,
            new_status=new_status,
            change_reason=change_reason
        )
        db.add(audit_log)
        
        return application

    @classmethod
    def is_editable(cls, status: RecordStatus, user_role: UserRole) -> bool:
        if status == RecordStatus.AUDIT_ONLY:
            return False
        
        if status in {RecordStatus.DRAFT, RecordStatus.REJECTED}:
            return user_role in {UserRole.DATA_ENTRY, UserRole.SUPERVISOR}
        
        if status == RecordStatus.SUBMITTED:
            return user_role in {UserRole.REVIEWER, UserRole.SUPERVISOR}
        
        if status == RecordStatus.SECOND_CONFIRM:
            return user_role == UserRole.SUPERVISOR
        
        return False
