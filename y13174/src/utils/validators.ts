import type { DeflectionRecord, RecordStatus } from '@/types';

export function isAbnormalStatus(status: RecordStatus): boolean {
  return ['NOISE_SUSPECTED', 'EXTREME_VALUE', 'PENDING_CONFIRM', 'CONFIRMED_REJECT'].includes(status);
}

export function isBoundaryRecord(record: DeflectionRecord): boolean {
  return record.isBoundary;
}

export function validateDeflectionValue(value: number, threshold: { min: number; max: number }): boolean {
  return value >= threshold.min && value <= threshold.max;
}

export function getStatusPriority(status: RecordStatus): number {
  const priorities: Record<RecordStatus, number> = {
    EXTREME_VALUE: 0,
    NOISE_SUSPECTED: 1,
    PENDING_CONFIRM: 2,
    CONFIRMED_REJECT: 3,
    CONFIRMED_PASS: 4,
    PASS: 5,
  };
  return priorities[status];
}
