from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app import models
from app.models import BatchStatus, UserRole


class StateTransitionError(Exception):
    pass


def validate_state_transition(
    current_status: BatchStatus,
    target_status: BatchStatus,
    user_role: UserRole
) -> bool:
    valid_transitions = {
        BatchStatus.CREATED: {
            BatchStatus.ATTACHMENTS_UPLOADED: {UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR},
            BatchStatus.FROZEN: {UserRole.SUPERVISOR},
            BatchStatus.WITHDRAWN: {UserRole.SUPERVISOR},
        },
        BatchStatus.ATTACHMENTS_UPLOADED: {
            BatchStatus.REVIEWING: {UserRole.REVIEWER, UserRole.SUPERVISOR},
            BatchStatus.FROZEN: {UserRole.SUPERVISOR},
            BatchStatus.WITHDRAWN: {UserRole.SUPERVISOR},
        },
        BatchStatus.REVIEWING: {
            BatchStatus.REVIEWED: {UserRole.REVIEWER, UserRole.SUPERVISOR},
            BatchStatus.ATTACHMENTS_UPLOADED: {UserRole.REVIEWER, UserRole.SUPERVISOR},
            BatchStatus.FROZEN: {UserRole.SUPERVISOR},
            BatchStatus.WITHDRAWN: {UserRole.SUPERVISOR},
        },
        BatchStatus.REVIEWED: {
            BatchStatus.REVIEWING: {UserRole.REVIEWER, UserRole.SUPERVISOR},
            BatchStatus.SETTLED: {UserRole.SUPERVISOR},
            BatchStatus.FROZEN: {UserRole.SUPERVISOR},
            BatchStatus.WITHDRAWN: {UserRole.SUPERVISOR},
        },
        BatchStatus.FROZEN: {
            BatchStatus.ARCHIVED: {UserRole.SUPERVISOR},
        },
        BatchStatus.SETTLED: {
            BatchStatus.REVIEWED: {UserRole.SUPERVISOR},
            BatchStatus.ARCHIVED: {UserRole.SUPERVISOR},
            BatchStatus.FROZEN: {UserRole.SUPERVISOR},
        },
        BatchStatus.WITHDRAWN: {
            BatchStatus.ARCHIVED: {UserRole.SUPERVISOR},
            BatchStatus.CREATED: {UserRole.SUPERVISOR},
        },
        BatchStatus.ARCHIVED: {},
    }

    if target_status not in valid_transitions.get(current_status, {}):
        return False

    allowed_roles = valid_transitions[current_status][target_status]
    return user_role in allowed_roles


def change_batch_state(
    db: Session,
    batch: models.Batch,
    target_status: BatchStatus,
    user: models.User,
    change_reason: Optional[str] = None
) -> models.Batch:
    if not validate_state_transition(batch.status, target_status, user.role):
        raise StateTransitionError(
            f"无法从状态 {batch.status.value} 转换到 {target_status.value} "
            f"(用户角色: {user.role.value})"
        )

    history = models.StatusHistory(
        batch_id=batch.id,
        from_status=batch.status,
        to_status=target_status,
        changed_by=user.id,
        change_reason=change_reason
    )
    db.add(history)

    batch.status = target_status
    db.add(batch)
    db.flush()

    return batch


def freeze_batch(
    db: Session,
    batch: models.Batch,
    user: models.User,
    reason: str
) -> models.Batch:
    if user.role != UserRole.SUPERVISOR:
        raise StateTransitionError("只有主管可以冻结批次")

    batch.before_freeze_status = batch.status
    batch.freeze_reason = reason

    history = models.StatusHistory(
        batch_id=batch.id,
        from_status=batch.status,
        to_status=BatchStatus.FROZEN,
        changed_by=user.id,
        change_reason=f"冻结: {reason}"
    )
    db.add(history)

    batch.status = BatchStatus.FROZEN
    db.add(batch)
    db.flush()

    return batch


def unfreeze_batch(
    db: Session,
    batch: models.Batch,
    user: models.User,
    reason: str
) -> models.Batch:
    if user.role != UserRole.SUPERVISOR:
        raise StateTransitionError("只有主管可以解冻批次")

    if batch.status != BatchStatus.FROZEN:
        raise StateTransitionError("只有冻结状态的批次可以解冻")

    if not batch.before_freeze_status:
        raise StateTransitionError("无法确定解冻后的状态")

    target_status = batch.before_freeze_status

    history = models.StatusHistory(
        batch_id=batch.id,
        from_status=BatchStatus.FROZEN,
        to_status=target_status,
        changed_by=user.id,
        change_reason=f"解冻: {reason}"
    )
    db.add(history)

    batch.status = target_status
    batch.before_freeze_status = None
    db.add(batch)
    db.flush()

    return batch
