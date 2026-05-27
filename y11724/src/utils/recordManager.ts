import type { CalcRecord, CalcParams, CalcResult } from '../types';

const STORAGE_KEY = 'droneCalcRecords';

export function loadRecords(): CalcRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load records:', e);
  }
  return [];
}

export function saveRecord(
  params: CalcParams,
  result: CalcResult,
  sourceRef: string,
  previousParams?: CalcParams
): CalcRecord {
  const corrections = previousParams ? diffParams(previousParams, params) : '初始记录';
  
  const record: CalcRecord = {
    id: Math.random().toString(36).substring(2, 10),
    timestamp: new Date().toISOString(),
    params: { ...params },
    result: { ...result },
    sourceRef,
    corrections
  };

  try {
    const records = loadRecords();
    records.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save record:', e);
  }

  return record;
}

function diffParams(oldParams: CalcParams, newParams: CalcParams): string {
  const diffs: string[] = [];
  const fields: (keyof CalcParams)[] = [
    'droneId', 'batteryId', 'payload', 'windSpeed', 
    'windDirection', 'routeDistance', 'altitude', 'returnReserveRatio'
  ];

  for (const field of fields) {
    const oldVal = oldParams[field];
    const newVal = newParams[field];
    if (oldVal !== newVal) {
      diffs.push(`${field}: ${oldVal} → ${newVal}`);
    }
  }

  return diffs.length > 0 ? diffs.join('; ') : '无变化';
}

export function deleteRecord(id: string): void {
  try {
    const records = loadRecords();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete record:', e);
  }
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear records:', e);
  }
}
