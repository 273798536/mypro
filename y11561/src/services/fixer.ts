import { getDatabase } from '../db/database';
import { User } from '../types';

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
    
    this.db.updateDirtyRecord(dirtyId, {
      status: 'fixed',
      fixedBy: fixedBy.name,
      fixedAt: new Date().toISOString(),
      fixRemark
    });
    
    const batch = this.db.getBatch(dirtyRecord.importBatch);
    if (batch) {
      const fixedCount = this.db.getDirtyRecords(dirtyRecord.importBatch, 'fixed').length;
      this.db.updateBatch(dirtyRecord.importBatch, {
        fixedRecords: fixedCount
      });
    }
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
      if (dirty.suggestion) {
        this.fixDirtyRecord(dirty.id, `批量修复: ${dirty.suggestion}`, fixedBy);
        fixedCount++;
      }
    }
    
    const remainingCount = this.db.getDirtyRecords(batchId, 'pending').length;
    return { fixedCount, remainingCount };
  }
}
