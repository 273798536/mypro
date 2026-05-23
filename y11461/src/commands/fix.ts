import { Database, MaterialRecord, DirtyType, RecordStatus } from '../types';
import { 
  getRecordById, 
  getDirtyRecordsByRecordId, 
  getCurrentTime, 
  saveDatabase,
  addStateChange 
} from '../utils/database';

interface FixResult {
  success: boolean;
  recordId: string;
  message: string;
}

export function fixRecord(
  db: Database,
  recordId: string,
  fieldUpdates: Partial<MaterialRecord>,
  fixedBy: string,
  reason: string
): FixResult {
  const record = getRecordById(db, recordId);
  
  if (!record) {
    return { success: false, recordId, message: '记录不存在' };
  }

  for (const [key, value] of Object.entries(fieldUpdates)) {
    if (key in record) {
      (record as any)[key] = value;
    }
  }

  const dirtyRecords = getDirtyRecordsByRecordId(db, recordId);
  for (const dirty of dirtyRecords) {
    if (!dirty.resolved) {
      dirty.resolved = true;
      dirty.resolvedAt = getCurrentTime();
      dirty.resolvedBy = fixedBy;
    }
  }

  const oldStatus = record.status;
  record.status = RecordStatus.FIXED;
  record.updatedAt = getCurrentTime();
  
  addStateChange(db, record.id, oldStatus, RecordStatus.FIXED, fixedBy, reason);
  saveDatabase(db);

  return {
    success: true,
    recordId,
    message: `记录已修正，原因: ${reason}`
  };
}

export function autoFixRecord(
  db: Database,
  recordId: string,
  fixedBy: string
): FixResult {
  const record = getRecordById(db, recordId);
  
  if (!record) {
    return { success: false, recordId, message: '记录不存在' };
  }

  const dirtyRecords = getDirtyRecordsByRecordId(db, recordId);
  let fixed = false;

  for (const dirty of dirtyRecords) {
    if (dirty.resolved) continue;

    switch (dirty.dirtyType) {
      case DirtyType.AMOUNT_CONFLICT:
        record.totalAmount = record.quantity * record.unitPrice;
        dirty.resolved = true;
        dirty.resolvedAt = getCurrentTime();
        dirty.resolvedBy = fixedBy;
        fixed = true;
        break;
    }
  }

  if (fixed) {
    const oldStatus = record.status;
    record.status = RecordStatus.FIXED;
    record.updatedAt = getCurrentTime();
    
    addStateChange(db, record.id, oldStatus, RecordStatus.FIXED, fixedBy, '自动修正问题');
    saveDatabase(db);
    return { success: true, recordId, message: '已自动修正可修复的问题' };
  }

  return { success: false, recordId, message: '无可自动修正的问题' };
}

export function rejectRecord(
  db: Database,
  recordId: string,
  rejectedBy: string,
  reason: string
): FixResult {
  const record = getRecordById(db, recordId);
  
  if (!record) {
    return { success: false, recordId, message: '记录不存在' };
  }

  const oldStatus = record.status;
  record.status = RecordStatus.REJECTED;
  record.updatedAt = getCurrentTime();
  
  addStateChange(db, record.id, oldStatus, RecordStatus.REJECTED, rejectedBy, reason);
  saveDatabase(db);

  return {
    success: true,
    recordId,
    message: `记录已驳回，原因: ${reason}`
  };
}

export function approveRecord(
  db: Database,
  recordId: string,
  approvedBy: string
): FixResult {
  const record = getRecordById(db, recordId);
  
  if (!record) {
    return { success: false, recordId, message: '记录不存在' };
  }

  const dirtyRecords = getDirtyRecordsByRecordId(db, recordId);
  const unresolvedDirty = dirtyRecords.filter(d => !d.resolved);

  if (unresolvedDirty.length > 0) {
    return { 
      success: false, 
      recordId, 
      message: `存在 ${unresolvedDirty.length} 个未解决的问题，请先修正` 
    };
  }

  const oldStatus = record.status;
  record.status = RecordStatus.APPROVED;
  record.updatedAt = getCurrentTime();
  
  addStateChange(db, record.id, oldStatus, RecordStatus.APPROVED, approvedBy, '审核通过');
  saveDatabase(db);

  return { success: true, recordId, message: '记录已审核通过' };
}
