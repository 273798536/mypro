import { ExceptionRecord } from '../types';

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  duplicateOf?: string;
  matchFields?: string[];
}

const DUPLICATE_KEY_FIELDS = [
  'source.fileName',
  'source.originalId',
  'data.timestamp',
  'data.deviceId',
  'data.recordId',
  'data.trackId'
];

export function checkDuplicate(
  newRecord: ExceptionRecord,
  existingRecords: ExceptionRecord[]
): DuplicateCheck {
  if (newRecord.source?.originalId) {
    for (const existing of existingRecords) {
      if (existing.source?.originalId === newRecord.source.originalId) {
        return {
          isDuplicate: true,
          duplicateOf: existing.id,
          matchFields: ['source.originalId']
        };
      }
    }
  }

  for (const existing of existingRecords) {
    if (existing.id === newRecord.id) {
      return {
        isDuplicate: true,
        duplicateOf: existing.id,
        matchFields: ['id']
      };
    }
  }

  for (const existing of existingRecords) {
    const matchedFields: string[] = [];

    for (const field of DUPLICATE_KEY_FIELDS) {
      const newValue = getNestedValue(newRecord, field);
      const existingValue = getNestedValue(existing, field);

      if (newValue !== undefined && existingValue !== undefined && newValue !== null && existingValue !== null) {
        if (String(newValue) === String(existingValue)) {
          matchedFields.push(field);
        }
      }
    }

    if (matchedFields.length >= 2) {
      return {
        isDuplicate: true,
        duplicateOf: existing.id,
        matchFields: matchedFields
      };
    }
  }

  return { isDuplicate: false };
}

export function checkDuplicatesBatch(
  newRecords: ExceptionRecord[],
  existingRecords: ExceptionRecord[]
): { duplicates: ExceptionRecord[]; uniqueRecords: ExceptionRecord[]; results: Map<string, DuplicateCheck> } {
  const results = new Map<string, DuplicateCheck>();
  const duplicates: ExceptionRecord[] = [];
  const uniqueRecords: ExceptionRecord[] = [];

  const seen = [...existingRecords];

  for (const record of newRecords) {
    const check = checkDuplicate(record, seen);
    results.set(record.id, check);

    if (check.isDuplicate) {
      duplicates.push({ ...record, isDuplicate: true });
    } else {
      uniqueRecords.push(record);
      seen.push(record);
    }
  }

  return { duplicates, uniqueRecords, results };
}

export function mergeDuplicateRecords(
  existing: ExceptionRecord,
  incoming: ExceptionRecord
): ExceptionRecord {
  return {
    ...existing,
    data: { ...existing.data, ...incoming.data },
    description: incoming.description || existing.description,
    updatedAt: new Date().toISOString(),
    isDuplicate: true
  };
}
