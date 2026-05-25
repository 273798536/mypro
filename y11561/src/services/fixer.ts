import { getDatabase } from '../db/database';
import { User, RecordStatus } from '../types';

export class RecordFixer {
  private db = getDatabase();
  
  fixDirtyRecord(
    dirtyId: string,
    fixRemark: string,
    fixedBy: User,
    newValue?: string
  ): void {
    const dirtyRecord = this.db.getDirtyRecords().find(d => d.id === dirtyId);
    if (!dirtyRecord) {
      throw new Error('脏记录不存在');
    }
    
    if (dirtyRecord.status !== 'pending') {
      throw new Error('该记录已处理');
    }
    
    if (newValue && dirtyRecord.fieldName) {
      this.applyFixToSourceRecord(dirtyRecord.recordId, dirtyRecord.recordType, dirtyRecord.fieldName, newValue);
    }
    
    this.db.addStatusChange(
      dirtyRecord.recordId,
      dirtyRecord.recordType,
      'dirty',
      'fixed',
      fixedBy.name,
      fixedBy.role,
      fixRemark,
      dirtyRecord.importBatch
    );
    
    this.db.updateDirtyRecord(dirtyId, {
      status: 'fixed',
      fixedBy: fixedBy.name,
      fixedAt: new Date().toISOString(),
      fixRemark: newValue ? `${fixRemark} (修正值: ${newValue})` : fixRemark
    });
    
    const batch = this.db.getBatch(dirtyRecord.importBatch);
    if (batch) {
      const fixedCount = this.db.getDirtyRecords(dirtyRecord.importBatch, 'fixed').length;
      this.db.updateBatch(dirtyRecord.importBatch, {
        fixedRecords: fixedCount
      });
    }
  }
  
  private applyFixToSourceRecord(
    recordId: string,
    recordType: string,
    fieldName: string,
    newValue: string
  ): void {
    const parsedValue = this.parseValue(fieldName, newValue);
    
    switch (recordType) {
      case 'checkin':
        this.db.updateCheckinRecord(recordId, { [fieldName]: parsedValue } as any);
        break;
      case 'deposit':
        this.db.updateDepositRecord(recordId, { [fieldName]: parsedValue } as any);
        break;
      case 'roomChange':
        this.db.updateRoomChangeRecord(recordId, { [fieldName]: parsedValue } as any);
        break;
      case 'shift':
        this.db.updateShiftRecord(recordId, { [fieldName]: parsedValue } as any);
        break;
    }
  }
  
  private parseValue(fieldName: string, value: string): unknown {
    const numericFields = [
      'roomRate', 'depositAmount', 'amount', 'oldRoomRate', 'newRoomRate',
      'checkinCount', 'checkoutCount', 'totalDeposit', 'totalRefund', 'totalRevenue'
    ];
    
    if (numericFields.includes(fieldName)) {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }
    
    return value;
  }
  
  ignoreDirtyRecord(
    dirtyId: string,
    ignoreRemark: string,
    ignoredBy: User
  ): void {
    const dirtyRecord = this.db.getDirtyRecords().find(d => d.id === dirtyId);
    if (!dirtyRecord) {
      throw new Error('脏记录不存在');
    }
    
    this.db.addStatusChange(
      dirtyRecord.recordId,
      dirtyRecord.recordType,
      'dirty',
      'rejected',
      ignoredBy.name,
      ignoredBy.role,
      `忽略: ${ignoreRemark}`,
      dirtyRecord.importBatch
    );
    
    this.db.updateDirtyRecord(dirtyId, {
      status: 'ignored',
      fixedBy: ignoredBy.name,
      fixedAt: new Date().toISOString(),
      fixRemark: `忽略: ${ignoreRemark}`
    });
  }
  
  batchFix(
    batchId: string,
    fixedBy: User
  ): { fixedCount: number; remainingCount: number } {
    const dirtyRecords = this.db.getDirtyRecords(batchId, 'pending');
    let fixedCount = 0;
    
    for (const dirty of dirtyRecords) {
      if (dirty.suggestion && dirty.expectedValue) {
        this.fixDirtyRecord(dirty.id, `批量修复: ${dirty.suggestion}`, fixedBy, dirty.expectedValue);
        fixedCount++;
      }
    }
    
    const remainingCount = this.db.getDirtyRecords(batchId, 'pending').length;
    return { fixedCount, remainingCount };
  }
}
