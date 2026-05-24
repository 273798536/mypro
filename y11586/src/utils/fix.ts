import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { CheckResult, FixAction } from '../types';
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
        checkResult.contractNo,
        checkResult.sourceField,
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
    contractNo: string,
    field: string,
    newValue: any,
    reason: string
  ): Promise<void> {
    const updates: any = {};
    updates[field] = newValue;
    await this.store.updateContract(contractNo, updates, this.user, reason);
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
