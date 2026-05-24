import { Database, CheckResult, DirtyType, RecordStatus } from '../types';
import { detectAllDirty } from '../utils/detector';
import { addDirtyRecord, getCurrentTime, saveDatabase, addStateChange } from '../utils/database';

export function checkRecords(db: Database, recheck: boolean = false): CheckResult {
  const dirtyByType: Record<DirtyType, number> = {
    [DirtyType.MISSING_FIELD]: 0,
    [DirtyType.CROSS_DATE]: 0,
    [DirtyType.NAME_CHANGED]: 0,
    [DirtyType.AMOUNT_CONFLICT]: 0,
    [DirtyType.QUANTITY_CONFLICT]: 0
  };

  const allDirtyRecords: typeof db.dirtyRecords = [];

  for (const record of db.records) {
    if (!recheck && record.status === RecordStatus.DIRTY) {
      const existingDirty = db.dirtyRecords.filter(d => 
        d.recordId === record.id && !d.resolved
      );
      allDirtyRecords.push(...existingDirty);
      for (const d of existingDirty) {
        dirtyByType[d.dirtyType]++;
      }
      continue;
    }

    db.dirtyRecords = db.dirtyRecords.filter(d => 
      !(d.recordId === record.id && !d.resolved)
    );

    const dirtyRecords = detectAllDirty(record, db);
    const fromStatus = record.status;

    if (dirtyRecords.length > 0) {
      if (record.status !== RecordStatus.DIRTY) {
        record.status = RecordStatus.DIRTY;
        record.updatedAt = getCurrentTime();
        addStateChange(
          db,
          record.id,
          fromStatus,
          RecordStatus.DIRTY,
          'system',
          `重新检测发现${dirtyRecords.length}个问题`
        );
      }
      
      for (const dirty of dirtyRecords) {
        addDirtyRecord(db, dirty);
        allDirtyRecords.push(dirty);
        dirtyByType[dirty.dirtyType]++;
      }
    } else if (record.status === RecordStatus.DIRTY) {
      record.status = RecordStatus.IMPORTED;
      record.updatedAt = getCurrentTime();
      addStateChange(
        db,
        record.id,
        fromStatus,
        RecordStatus.IMPORTED,
        'system',
        '问题已解决，数据校验通过'
      );
    }
  }

  saveDatabase(db);

  return {
    total: db.records.length,
    dirtyCount: allDirtyRecords.length,
    dirtyByType,
    dirtyRecords: allDirtyRecords
  };
}
