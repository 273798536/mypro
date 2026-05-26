import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { CheckResult, FixAction, PaymentNode, AcceptanceRecord, RefundRecord } from '../types';
import { DataStoreManager } from './store';

export class DataFixer {
  private store: DataStoreManager;
  private user: string;

  constructor(workspace: string, user: string) {
    this.store = new DataStoreManager(workspace);
    this.user = user;
  }

  async resolveCheck(
    checkResultId: string,
    resolution: string,
    newValue?: any
  ): Promise<boolean> {
    const store = await this.store.load();
    const checkIndex = store.checkResults.findIndex(r => r.id === checkResultId);
    
    if (checkIndex === -1) {
      return false;
    }

    const checkResult = store.checkResults[checkIndex];
    const oldValue = checkResult.actualValue;

    if (newValue !== undefined && checkResult.sourceField) {
      await this.applyFieldFix(
        checkResult,
        newValue,
        resolution
      );
    }

    store.checkResults[checkIndex] = {
      ...checkResult,
      resolved: true,
      resolvedAt: dayjs().toISOString(),
      resolvedBy: this.user,
      resolution,
    };

    await this.store.addFixAction({
      checkResultId,
      fixType: checkResult.checkType,
      oldValue,
      newValue: newValue || oldValue,
      appliedAt: dayjs().toISOString(),
      appliedBy: this.user,
      reason: resolution,
    });

    await this.store.save(store);
    return true;
  }

  private async applyFieldFix(
    checkResult: CheckResult,
    newValue: any,
    reason: string
  ): Promise<void> {
    const updates: any = {};
    updates[checkResult.sourceField!] = newValue;

    if (checkResult.entityType === 'PaymentNode' && checkResult.entityId) {
      const allNodes = await this.store.getPaymentNodesByContract(checkResult.contractNo);
      const node = allNodes.find(n => n.id === checkResult.entityId);
      if (node) {
        await this.store.updatePaymentNode(node.nodeId, updates, this.user, reason);
      }
    } else if (checkResult.entityType === 'AcceptanceRecord' && checkResult.entityId) {
      const allRecords = await this.store.getAcceptanceRecordsByContract(checkResult.contractNo);
      const record = allRecords.find(r => r.id === checkResult.entityId);
      if (record) {
        await this.store.updateAcceptanceRecord(record.acceptanceId, updates, this.user, reason);
      }
    } else if (checkResult.entityType === 'RefundRecord' && checkResult.entityId) {
      const allRecords = await this.store.getRefundRecordsByContract(checkResult.contractNo);
      const record = allRecords.find(r => r.id === checkResult.entityId);
      if (record) {
        await this.store.updateRefundRecord(record.refundId, updates, this.user, reason);
      }
    } else {
      await this.store.updateContract(checkResult.contractNo, updates, this.user, reason);
    }
  }

  async updatePaymentNodeDirectly(
    nodeId: string,
    updates: Partial<PaymentNode>,
    reason: string
  ): Promise<PaymentNode | null> {
    return this.store.updatePaymentNode(nodeId, updates, this.user, reason);
  }

  async updateAcceptanceRecordDirectly(
    acceptanceId: string,
    updates: Partial<AcceptanceRecord>,
    reason: string
  ): Promise<AcceptanceRecord | null> {
    return this.store.updateAcceptanceRecord(acceptanceId, updates, this.user, reason);
  }

  async updateRefundRecordDirectly(
    refundId: string,
    updates: Partial<RefundRecord>,
    reason: string
  ): Promise<RefundRecord | null> {
    return this.store.updateRefundRecord(refundId, updates, this.user, reason);
  }

  async batchResolve(
    checkType: string,
    resolution: string,
    batchId?: string
  ): Promise<number> {
    const checks = await this.store.getCheckResults(batchId);
    const toResolve = checks.filter(r => r.checkType === checkType && !r.resolved);
    
    let resolved = 0;
    for (const check of toResolve) {
      if (await this.resolveCheck(check.id, resolution)) {
        resolved++;
      }
    }
    
    return resolved;
  }

  async getFixHistory(checkResultId?: string): Promise<FixAction[]> {
    const store = await this.store.load();
    if (checkResultId) {
      return store.fixActions.filter(a => a.checkResultId === checkResultId);
    }
    return store.fixActions;
  }

  async getFailedList(batchId?: string): Promise<CheckResult[]> {
    const checks = await this.store.getCheckResults(batchId);
    return checks.filter(r => r.severity === 'error' && !r.resolved);
  }
}
