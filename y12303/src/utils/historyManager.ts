import { CrackPoint, HistoryRecord, ActionType } from '../types';
import { format } from 'date-fns';

export function createHistoryRecord(
  crackId: string,
  action: ActionType,
  operator: string,
  field?: string,
  oldValue?: string,
  newValue?: string,
  remark?: string,
): HistoryRecord {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    crackId,
    action,
    field,
    oldValue,
    newValue,
    operator,
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    remark,
  };
}

export function getCrackHistory(history: HistoryRecord[], crackId: string): HistoryRecord[] {
  return history.filter((h) => h.crackId === crackId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function compareCracks(
  oldCrack: CrackPoint,
  newCrack: CrackPoint,
): { field: string; oldValue: string; newValue: string }[] {
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  const fields: (keyof CrackPoint)[] = [
    'name',
    'x',
    'y',
    'z',
    'length',
    'width',
    'status',
    'riskLevel',
    'remark',
    'rainfall',
    'residentCoords',
    'isDuplicate',
  ];

  fields.forEach((field) => {
    const oldVal = String(oldCrack[field] ?? '');
    const newVal = String(newCrack[field] ?? '');
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  });

  return changes;
}
