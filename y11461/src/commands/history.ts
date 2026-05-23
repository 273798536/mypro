import { Database } from '../types';
import { getStateChangesByRecordId } from '../utils/database';
import { getStatusName } from './report';

export interface HistoryEntry {
  id: string;
  recordId: string;
  batchNumber: string;
  materialName: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export function getRecordHistory(
  db: Database,
  recordId: string
): HistoryEntry[] {
  const stateChanges = getStateChangesByRecordId(db, recordId);
  const record = db.records.find(r => r.id === recordId);

  return stateChanges.map(sc => ({
    id: sc.id,
    recordId: sc.recordId,
    batchNumber: record?.batchNumber ?? '',
    materialName: record?.materialName ?? '',
    fromStatus: getStatusName(sc.fromStatus),
    toStatus: getStatusName(sc.toStatus),
    changedBy: sc.changedBy,
    changedAt: sc.changedAt,
    reason: sc.reason
  }));
}

export function getAllHistory(db: Database, limit?: number): HistoryEntry[] {
  const changes = [...db.stateChanges];
  changes.sort((a, b) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  const result = changes
    .slice(0, limit)
    .map(sc => {
      const record = db.records.find(r => r.id === sc.recordId);
      return {
        id: sc.id,
        recordId: sc.recordId,
        batchNumber: record?.batchNumber ?? '',
        materialName: record?.materialName ?? '',
        fromStatus: getStatusName(sc.fromStatus),
        toStatus: getStatusName(sc.toStatus),
        changedBy: sc.changedBy,
        changedAt: sc.changedAt,
        reason: sc.reason
      };
    });

  return result;
}
