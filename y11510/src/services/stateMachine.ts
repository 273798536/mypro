import { ExceptionStatus, ActionType, Role } from '../types';

interface TransitionRule {
  from: ExceptionStatus[];
  to: ExceptionStatus;
  allowedRoles: Role[];
  action: ActionType;
}

export const stateTransitions: TransitionRule[] = [
  {
    from: [ExceptionStatus.PENDING_REVIEW],
    to: ExceptionStatus.APPROVED,
    allowedRoles: [Role.ADMIN, Role.REVIEWER],
    action: ActionType.REVIEW_DECISION,
  },
  {
    from: [ExceptionStatus.PENDING_REVIEW],
    to: ExceptionStatus.REJECTED,
    allowedRoles: [Role.ADMIN, Role.REVIEWER],
    action: ActionType.REVIEW_DECISION,
  },
  {
    from: [
      ExceptionStatus.PENDING_REVIEW,
      ExceptionStatus.APPROVED,
      ExceptionStatus.REJECTED,
    ],
    to: ExceptionStatus.FROZEN,
    allowedRoles: [Role.ADMIN],
    action: ActionType.FREEZE_SETTLEMENT,
  },
  {
    from: [ExceptionStatus.FROZEN],
    to: ExceptionStatus.PENDING_REVIEW,
    allowedRoles: [Role.ADMIN],
    action: ActionType.UNFREEZE,
  },
  {
    from: [ExceptionStatus.FROZEN],
    to: ExceptionStatus.APPROVED,
    allowedRoles: [Role.ADMIN],
    action: ActionType.UNFREEZE,
  },
  {
    from: [ExceptionStatus.FROZEN],
    to: ExceptionStatus.REJECTED,
    allowedRoles: [Role.ADMIN],
    action: ActionType.UNFREEZE,
  },
  {
    from: [ExceptionStatus.APPROVED],
    to: ExceptionStatus.SETTLED,
    allowedRoles: [Role.ADMIN, Role.REVIEWER],
    action: ActionType.STATUS_UPDATE,
  },
  {
    from: [
      ExceptionStatus.PENDING_REVIEW,
      ExceptionStatus.APPROVED,
      ExceptionStatus.REJECTED,
    ],
    to: ExceptionStatus.ARCHIVED,
    allowedRoles: [Role.ADMIN],
    action: ActionType.CANCEL_ARCHIVE,
  },
  {
    from: [
      ExceptionStatus.PENDING_REVIEW,
      ExceptionStatus.APPROVED,
      ExceptionStatus.REJECTED,
      ExceptionStatus.FROZEN,
    ],
    to: ExceptionStatus.CANCELLED,
    allowedRoles: [Role.ADMIN],
    action: ActionType.CANCEL_ARCHIVE,
  },
];

export class StateMachine {
  canTransition(
    currentStatus: ExceptionStatus,
    targetStatus: ExceptionStatus,
    role: Role
  ): boolean {
    const transition = stateTransitions.find(
      (t) => t.from.includes(currentStatus) && t.to === targetStatus
    );

    if (!transition) {
      return false;
    }

    return transition.allowedRoles.includes(role);
  }

  getAllowedTransitions(
    currentStatus: ExceptionStatus,
    role: Role
  ): ExceptionStatus[] {
    return stateTransitions
      .filter(
        (t) => t.from.includes(currentStatus) && t.allowedRoles.includes(role)
      )
      .map((t) => t.to);
  }

  getTransitionAction(
    currentStatus: ExceptionStatus,
    targetStatus: ExceptionStatus
  ): ActionType | null {
    const transition = stateTransitions.find(
      (t) => t.from.includes(currentStatus) && t.to === targetStatus
    );
    return transition?.action || null;
  }

  validateManualEdit(status: ExceptionStatus, role: Role): boolean {
    const editableStatuses = [
      ExceptionStatus.PENDING_REVIEW,
      ExceptionStatus.FROZEN,
    ];
    const editRoles = [Role.ADMIN, Role.REVIEWER];

    return editableStatuses.includes(status) && editRoles.includes(role);
  }

  canFreeze(status: ExceptionStatus, role: Role): boolean {
    return (
      status !== ExceptionStatus.FROZEN &&
      status !== ExceptionStatus.SETTLED &&
      status !== ExceptionStatus.ARCHIVED &&
      status !== ExceptionStatus.CANCELLED &&
      role === Role.ADMIN
    );
  }

  canUnfreeze(status: ExceptionStatus, role: Role): boolean {
    return status === ExceptionStatus.FROZEN && role === Role.ADMIN;
  }
}

export const stateMachine = new StateMachine();
