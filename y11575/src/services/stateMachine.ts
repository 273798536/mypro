import { ReceiptStatus, Operator, ReconciliationReceipt, StatusTransition } from '../types';

export class StateTransitionError extends Error {
  constructor(
    public fromStatus: ReceiptStatus,
    public toStatus: ReceiptStatus,
    message: string
  ) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

export class StateMachine {
  private static readonly VALID_TRANSITIONS: Map<ReceiptStatus, ReceiptStatus[]> = new Map([
    [ReceiptStatus.DRAFT, [ReceiptStatus.SUBMITTED, ReceiptStatus.ARCHIVED]],
    [ReceiptStatus.SUBMITTED, [ReceiptStatus.PENDING_REVIEW, ReceiptStatus.WITHDRAWN, ReceiptStatus.FROZEN]],
    [ReceiptStatus.PENDING_REVIEW, [ReceiptStatus.APPROVED, ReceiptStatus.REJECTED, ReceiptStatus.MODIFIED, ReceiptStatus.FROZEN, ReceiptStatus.WITHDRAWN]],
    [ReceiptStatus.APPROVED, [ReceiptStatus.MODIFIED, ReceiptStatus.FROZEN, ReceiptStatus.ARCHIVED]],
    [ReceiptStatus.REJECTED, [ReceiptStatus.MODIFIED, ReceiptStatus.SUBMITTED, ReceiptStatus.ARCHIVED]],
    [ReceiptStatus.MODIFIED, [ReceiptStatus.PENDING_REVIEW, ReceiptStatus.FROZEN, ReceiptStatus.WITHDRAWN]],
    [ReceiptStatus.FROZEN, [ReceiptStatus.DRAFT, ReceiptStatus.SUBMITTED, ReceiptStatus.PENDING_REVIEW, ReceiptStatus.APPROVED, ReceiptStatus.REJECTED, ReceiptStatus.MODIFIED, ReceiptStatus.ARCHIVED]],
    [ReceiptStatus.ARCHIVED, []],
    [ReceiptStatus.WITHDRAWN, [ReceiptStatus.SUBMITTED, ReceiptStatus.ARCHIVED]]
  ]);

  private static readonly STATUS_NAMES: Record<ReceiptStatus, string> = {
    [ReceiptStatus.DRAFT]: '草稿',
    [ReceiptStatus.SUBMITTED]: '已提交',
    [ReceiptStatus.PENDING_REVIEW]: '待复核',
    [ReceiptStatus.APPROVED]: '已通过',
    [ReceiptStatus.REJECTED]: '已驳回',
    [ReceiptStatus.MODIFIED]: '已改判',
    [ReceiptStatus.FROZEN]: '已冻结',
    [ReceiptStatus.ARCHIVED]: '已归档',
    [ReceiptStatus.WITHDRAWN]: '已撤回'
  };

  static canTransition(from: ReceiptStatus, to: ReceiptStatus): boolean {
    const validTransitions = this.VALID_TRANSITIONS.get(from);
    return validTransitions ? validTransitions.includes(to) : false;
  }

  static getValidTransitions(status: ReceiptStatus): ReceiptStatus[] {
    return this.VALID_TRANSITIONS.get(status) || [];
  }

  static getStatusName(status: ReceiptStatus): string {
    return this.STATUS_NAMES[status] || status;
  }

  static validateTransition(
    from: ReceiptStatus,
    to: ReceiptStatus,
    receiptId?: string
  ): void {
    if (!this.canTransition(from, to)) {
      throw new StateTransitionError(
        from,
        to,
        `状态流转不允许: ${this.getStatusName(from)} -> ${this.getStatusName(to)}${receiptId ? ` (回执ID: ${receiptId})` : ''}`
      );
    }
  }

  static isFinalStatus(status: ReceiptStatus): boolean {
    return status === ReceiptStatus.ARCHIVED;
  }

  static canFreeze(status: ReceiptStatus): boolean {
    return status !== ReceiptStatus.FROZEN && status !== ReceiptStatus.ARCHIVED;
  }

  static canUnfreeze(status: ReceiptStatus): boolean {
    return status === ReceiptStatus.FROZEN;
  }

  static canWithdraw(status: ReceiptStatus): boolean {
    const withdrawable = [
      ReceiptStatus.SUBMITTED,
      ReceiptStatus.PENDING_REVIEW,
      ReceiptStatus.MODIFIED
    ];
    return withdrawable.includes(status);
  }

  static canModify(status: ReceiptStatus): boolean {
    const modifiable = [
      ReceiptStatus.PENDING_REVIEW,
      ReceiptStatus.APPROVED,
      ReceiptStatus.REJECTED
    ];
    return modifiable.includes(status);
  }

  static canArchive(status: ReceiptStatus): boolean {
    const archivable = [
      ReceiptStatus.DRAFT,
      ReceiptStatus.APPROVED,
      ReceiptStatus.REJECTED,
      ReceiptStatus.WITHDRAWN,
      ReceiptStatus.FROZEN
    ];
    return archivable.includes(status);
  }
}
