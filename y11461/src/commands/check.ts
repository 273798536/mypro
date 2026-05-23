import { Database, CheckResult, DirtyType, RecordStatus } from '../types';
import { detectAllDirty } from '../utils/detector';
import { addDirtyRecord, getCurrentTime, saveDatabase } from '../utils/database';

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

    if (dirtyRecords.length > 0) {
      record.status = RecordStatus.DIRTY;
      record.updatedAt = getCurrentTime();
      
      for (const dirty of dirtyRecords) {
        addDirtyRecord(db, dirty);
        allDirtyRecords.push(dirty);
        dirtyByType[dirty.dirtyType]++;
      }
    } else if (record.status === RecordStatus.DIRTY) {
      record.status = RecordStatus.IMPORTED;
      record.updatedAt = getCurrentTime();
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
