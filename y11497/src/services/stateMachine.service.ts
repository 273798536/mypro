import dataStore from '../database/store';
import { ReimbursementStatus, User, Reimbursement } from '../types';
import logger from '../utils/logger';

export class StateMachineService {
  private static readonly validTransitions: Record<ReimbursementStatus, ReimbursementStatus[]> = {
    [ReimbursementStatus.SUBMITTED]: [
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.PROCESSING,
      ReimbursementStatus.FAILED
    ],
    [ReimbursementStatus.QUEUED]: [
      ReimbursementStatus.PROCESSING,
      ReimbursementStatus.RETRYING,
      ReimbursementStatus.MANUAL_INTERVENTION,
      ReimbursementStatus.FAILED
    ],
    [ReimbursementStatus.PROCESSING]: [
      ReimbursementStatus.PENDING_REVIEW,
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.FAILED,
      ReimbursementStatus.DEAD_LETTER
    ],
    [ReimbursementStatus.RETRYING]: [
      ReimbursementStatus.PENDING_REVIEW,
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.MANUAL_INTERVENTION,
      ReimbursementStatus.FAILED,
      ReimbursementStatus.DEAD_LETTER
    ],
    [ReimbursementStatus.PENDING_REVIEW]: [
      ReimbursementStatus.COMPENSATED,
      ReimbursementStatus.MANUAL_INTERVENTION,
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.CLOSED
    ],
    [ReimbursementStatus.MANUAL_INTERVENTION]: [
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.PENDING_REVIEW,
      ReimbursementStatus.COMPENSATED,
      ReimbursementStatus.CLOSED,
      ReimbursementStatus.DEAD_LETTER
    ],
    [ReimbursementStatus.COMPENSATED]: [
      ReimbursementStatus.CLOSED
    ],
    [ReimbursementStatus.CLOSED]: [],
    [ReimbursementStatus.FAILED]: [
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.MANUAL_INTERVENTION,
      ReimbursementStatus.DEAD_LETTER
    ],
    [ReimbursementStatus.DEAD_LETTER]: [
      ReimbursementStatus.QUEUED,
      ReimbursementStatus.MANUAL_INTERVENTION,
      ReimbursementStatus.CLOSED
    ]
  };

  static canTransition(from: ReimbursementStatus, to: ReimbursementStatus): boolean {
    const allowedTransitions = this.validTransitions[from] || [];
    return allowedTransitions.includes(to);
  }

  static transition(
    reimbursementId: string,
    toStatus: ReimbursementStatus,
    operator: User,
    reason: string,
    remarks?: string
  ): Reimbursement | undefined {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) {
      throw new Error('报销单不存在');
    }

    if (!this.canTransition(reimbursement.status, toStatus)) {
      logger.warn(`非法状态转换: ${reimbursement.status} -> ${toStatus} for ${reimbursementId}`);
      throw new Error(`非法状态转换: 不允许从 ${reimbursement.status} 转换到 ${toStatus}`);
    }

    dataStore.addStatusLog(reimbursementId, {
      reimbursementId,
      fromStatus: reimbursement.status,
      toStatus,
      operatorId: operator.id,
      operatorName: operator.name,
      reason,
      remarks
    });

    const updates: Partial<Reimbursement> = { status: toStatus };

    switch (toStatus) {
      case ReimbursementStatus.PENDING_REVIEW:
        updates.reviewedBy = operator.id;
        updates.reviewedAt = new Date().toISOString();
        break;
      case ReimbursementStatus.COMPENSATED:
        updates.compensatedAt = new Date().toISOString();
        break;
      case ReimbursementStatus.CLOSED:
        updates.closedAt = new Date().toISOString();
        break;
    }

    return dataStore.updateReimbursement(reimbursementId, updates);
  }

  static submit(reimbursementId: string, operator: User): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.SUBMITTED,
      operator,
      '提交报销单'
    );
  }

  static queue(reimbursementId: string, operator: User, reason: string = '进入处理队列'): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.QUEUED,
      operator,
      reason
    );
  }

  static process(reimbursementId: string, operator: User): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.PROCESSING,
      operator,
      '开始稽核处理'
    );
  }

  static requestReview(reimbursementId: string, operator: User, reason: string): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.PENDING_REVIEW,
      operator,
      `提交复核: ${reason}`
    );
  }

  static requestManualIntervention(reimbursementId: string, operator: User, reason: string): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.MANUAL_INTERVENTION,
      operator,
      `需要人工干预: ${reason}`
    );
  }

  static compensate(reimbursementId: string, operator: User, remarks?: string): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.COMPENSATED,
      operator,
      '补偿入账完成',
      remarks
    );
  }

  static close(reimbursementId: string, operator: User, reason: string): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.CLOSED,
      operator,
      `关闭: ${reason}`
    );
  }

  static fail(reimbursementId: string, operator: User, reason: string): Reimbursement | undefined {
    return this.transition(
      reimbursementId,
      ReimbursementStatus.FAILED,
      operator,
      `处理失败: ${reason}`
    );
  }

  static getValidTransitions(status: ReimbursementStatus): ReimbursementStatus[] {
    return this.validTransitions[status] || [];
  }
}
