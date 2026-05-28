import { AuditHistoryRepository } from '../repositories/AuditHistoryRepository.js';
import type { AuditHistory } from '../../shared/types/index.js';

export class AuditService {
  private auditHistoryRepository: AuditHistoryRepository;

  constructor() {
    this.auditHistoryRepository = new AuditHistoryRepository();
  }

  logChange(
    recordId: string,
    recordType: string,
    fieldName: string,
    oldValue: string | number | boolean | null | undefined,
    newValue: string | number | boolean | null | undefined,
    changedBy: string,
    reason: string
  ): AuditHistory {
    const oldValueStr = oldValue === null || oldValue === undefined ? '' : String(oldValue);
    const newValueStr = newValue === null || newValue === undefined ? '' : String(newValue);

    return this.auditHistoryRepository.create({
      recordId,
      recordType,
      fieldName,
      oldValue: oldValueStr,
      newValue: newValueStr,
      changedBy,
      changeReason: reason,
    });
  }

  getHistory(recordId: string, recordType?: string): AuditHistory[] {
    return this.auditHistoryRepository.findByRecord(recordId, recordType);
  }

  logChanges(
    changes: Array<{
      recordId: string;
      recordType: string;
      fieldName: string;
      oldValue: string | number | boolean | null | undefined;
      newValue: string | number | boolean | null | undefined;
    }>,
    changedBy: string,
    reason: string
  ): number {
    const records = changes.map(change => ({
      recordId: change.recordId,
      recordType: change.recordType,
      fieldName: change.fieldName,
      oldValue: change.oldValue === null || change.oldValue === undefined ? '' : String(change.oldValue),
      newValue: change.newValue === null || change.newValue === undefined ? '' : String(change.newValue),
      changedBy,
      changeReason: reason,
    }));

    return this.auditHistoryRepository.createMany(records);
  }
}

export default AuditService;
