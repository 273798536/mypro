import { v4 as uuidv4 } from 'uuid';
import * as deepDiff from 'deep-diff';
import { ExceptionStatus, ActionType, StateTransition } from '../types';

type TransitionRule = {
  from: ExceptionStatus[];
  to: ExceptionStatus;
  action: ActionType;
  allowedRoles: string[];
};

const TRANSITION_RULES: TransitionRule[] = [
  {
    from: [ExceptionStatus.DRAFT],
    to: ExceptionStatus.PENDING_REVIEW,
    action: ActionType.BATCH_CREATE,
    allowedRoles: ['admin', 'training_admin', 'hrbp']
  },
  {
    from: [ExceptionStatus.PENDING_REVIEW, ExceptionStatus.SUPPLEMENT_REQUIRED],
    to: ExceptionStatus.REVIEWING,
    action: ActionType.REVIEW,
    allowedRoles: ['admin', 'hrbp', 'dept_manager', 'auditor']
  },
  {
    from: [ExceptionStatus.PENDING_REVIEW, ExceptionStatus.REVIEWING, ExceptionStatus.SUPPLEMENT_REQUIRED],
    to: ExceptionStatus.APPROVED,
    action: ActionType.REVIEW,
    allowedRoles: ['admin', 'hrbp', 'auditor']
  },
  {
    from: [ExceptionStatus.PENDING_REVIEW, ExceptionStatus.REVIEWING, ExceptionStatus.SUPPLEMENT_REQUIRED],
    to: ExceptionStatus.REJECTED,
    action: ActionType.REVIEW,
    allowedRoles: ['admin', 'hrbp', 'auditor']
  },
  {
    from: [ExceptionStatus.REVIEWING, ExceptionStatus.PENDING_REVIEW],
    to: ExceptionStatus.SUPPLEMENT_REQUIRED,
    action: ActionType.REVIEW,
    allowedRoles: ['admin', 'hrbp', 'auditor']
  },
  {
    from: [ExceptionStatus.SUPPLEMENT_REQUIRED],
    to: ExceptionStatus.PENDING_REVIEW,
    action: ActionType.ATTACHMENT_UPLOAD,
    allowedRoles: ['admin', 'training_admin', 'employee', 'dept_manager']
  },
  {
    from: [
      ExceptionStatus.PENDING_REVIEW,
      ExceptionStatus.REVIEWING,
      ExceptionStatus.APPROVED,
      ExceptionStatus.REJECTED,
      ExceptionStatus.SUPPLEMENT_REQUIRED
    ],
    to: ExceptionStatus.FROZEN,
    action: ActionType.FREEZE,
    allowedRoles: ['admin', 'hrbp', 'auditor']
  },
  {
    from: [ExceptionStatus.FROZEN],
    to: ExceptionStatus.PENDING_REVIEW,
    action: ActionType.UNFREEZE,
    allowedRoles: ['admin', 'hrbp', 'auditor']
  },
  {
    from: [ExceptionStatus.APPROVED, ExceptionStatus.REJECTED, ExceptionStatus.FROZEN],
    to: ExceptionStatus.SETTLED,
    action: ActionType.SETTLE,
    allowedRoles: ['admin', 'hrbp']
  },
  {
    from: [
      ExceptionStatus.DRAFT,
      ExceptionStatus.PENDING_REVIEW,
      ExceptionStatus.REVIEWING,
      ExceptionStatus.SUPPLEMENT_REQUIRED
    ],
    to: ExceptionStatus.WITHDRAWN,
    action: ActionType.WITHDRAW,
    allowedRoles: ['admin', 'training_admin']
  },
  {
    from: [ExceptionStatus.WITHDRAWN],
    to: ExceptionStatus.PENDING_REVIEW,
    action: ActionType.REACTIVATE,
    allowedRoles: ['admin', 'training_admin']
  },
  {
    from: [ExceptionStatus.SETTLED, ExceptionStatus.WITHDRAWN],
    to: ExceptionStatus.ARCHIVED,
    action: ActionType.ARCHIVE,
    allowedRoles: ['admin', 'hrbp']
  },
  {
    from: [
      ExceptionStatus.REVIEWING,
      ExceptionStatus.APPROVED,
      ExceptionStatus.REJECTED
    ],
    to: ExceptionStatus.PENDING_REVIEW,
    action: ActionType.REVISE,
    allowedRoles: ['admin', 'auditor']
  }
];

export class StateMachineService {
  canTransition(
    currentStatus: ExceptionStatus,
    targetStatus: ExceptionStatus,
    action: ActionType,
    userRole: string
  ): boolean {
    return TRANSITION_RULES.some(
      rule =>
        rule.from.includes(currentStatus) &&
        rule.to === targetStatus &&
        rule.action === action &&
        rule.allowedRoles.includes(userRole)
    );
  }

  getValidTransitions(
    currentStatus: ExceptionStatus,
    userRole: string
  ): Array<{ action: ActionType; to: ExceptionStatus }> {
    return TRANSITION_RULES
      .filter(
        rule => rule.from.includes(currentStatus) && rule.allowedRoles.includes(userRole)
      )
      .map(rule => ({ action: rule.action, to: rule.to }));
  }

  createTransition(
    fromStatus: ExceptionStatus,
    toStatus: ExceptionStatus,
    action: ActionType,
    changedBy: string,
    changeReason: string,
    snapshotBefore: any,
    snapshotAfter: any
  ): StateTransition {
    const diff = deepDiff.diff(snapshotBefore, snapshotAfter);

    return {
      fromStatus,
      toStatus,
      triggeredBy: action,
      changedBy,
      changeReason,
      changedAt: new Date(),
      snapshotBefore: this.sanitizeSnapshot(snapshotBefore),
      snapshotAfter: this.sanitizeSnapshot(snapshotAfter),
      diff
    };
  }

  private sanitizeSnapshot(snapshot: any): any {
    const { stateTransitions, reviewHistory, ...rest } = snapshot;
    return rest;
  }

  validateManualOverride(
    currentStatus: ExceptionStatus,
    targetStatus: ExceptionStatus,
    userRole: string
  ): boolean {
    if (userRole !== 'admin' && userRole !== 'auditor') {
      return false;
    }

    const allowedOverrides: Array<{ from: ExceptionStatus; to: ExceptionStatus }> = [
      { from: ExceptionStatus.PENDING_REVIEW, to: ExceptionStatus.APPROVED },
      { from: ExceptionStatus.PENDING_REVIEW, to: ExceptionStatus.REJECTED },
      { from: ExceptionStatus.REVIEWING, to: ExceptionStatus.PENDING_REVIEW },
      { from: ExceptionStatus.APPROVED, to: ExceptionStatus.REJECTED },
      { from: ExceptionStatus.REJECTED, to: ExceptionStatus.APPROVED }
    ];

    return allowedOverrides.some(
      o => o.from === currentStatus && o.to === targetStatus
    );
  }

  canFreeze(currentStatus: ExceptionStatus, userRole: string): boolean {
    return this.canTransition(
      currentStatus,
      ExceptionStatus.FROZEN,
      ActionType.FREEZE,
      userRole
    );
  }

  canSettle(currentStatus: ExceptionStatus, userRole: string): boolean {
    return this.canTransition(
      currentStatus,
      ExceptionStatus.SETTLED,
      ActionType.SETTLE,
      userRole
    );
  }
}

export const stateMachine = new StateMachineService();
