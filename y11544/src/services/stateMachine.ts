import { MaterialStatus } from '../types';

interface StateTransition {
  from: MaterialStatus | null;
  to: MaterialStatus;
  allowedRoles: string[];
}

const ALLOWED_TRANSITIONS: StateTransition[] = [
  { from: null, to: MaterialStatus.DRAFT, allowedRoles: ['operator', 'admin'] },
  { from: MaterialStatus.DRAFT, to: MaterialStatus.SUBMITTED, allowedRoles: ['operator', 'admin'] },
  { from: MaterialStatus.SUBMITTED, to: MaterialStatus.REJECTED, allowedRoles: ['reviewer', 'manager', 'admin'] },
  { from: MaterialStatus.SUBMITTED, to: MaterialStatus.SECONDARY_CONFIRMED, allowedRoles: ['reviewer', 'manager', 'admin'] },
  { from: MaterialStatus.REJECTED, to: MaterialStatus.DRAFT, allowedRoles: ['operator', 'admin'] },
  { from: MaterialStatus.REJECTED, to: MaterialStatus.SUBMITTED, allowedRoles: ['operator', 'admin'] },
  { from: MaterialStatus.SECONDARY_CONFIRMED, to: MaterialStatus.AUDIT_ONLY, allowedRoles: ['auditor', 'admin'] },
  { from: MaterialStatus.AUDIT_ONLY, to: MaterialStatus.EXPORTED, allowedRoles: ['auditor', 'admin'] },
  { from: MaterialStatus.SECONDARY_CONFIRMED, to: MaterialStatus.EXPORTED, allowedRoles: ['auditor', 'admin'] },
];

export class StateMachine {
  canTransition(from: MaterialStatus | null, to: MaterialStatus, role: string): boolean {
    return ALLOWED_TRANSITIONS.some(
      t => t.from === from && t.to === to && t.allowedRoles.includes(role)
    );
  }

  getValidTransitions(currentStatus: MaterialStatus | null, role: string): MaterialStatus[] {
    return ALLOWED_TRANSITIONS
      .filter(t => t.from === currentStatus && t.allowedRoles.includes(role))
      .map(t => t.to);
  }

  isTerminalStatus(status: MaterialStatus): boolean {
    return status === MaterialStatus.EXPORTED;
  }

  validateTransition(from: MaterialStatus | null, to: MaterialStatus, role: string): void {
    if (!this.canTransition(from, to, role)) {
      throw new Error(
        `Invalid state transition: ${from || 'null'} -> ${to} for role ${role}`
      );
    }
  }
}

export const stateMachine = new StateMachine();
