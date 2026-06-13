import type { DeflectionRecord, FilterCriteria } from '@/types';

export function applyFilter(records: DeflectionRecord[], criteria: FilterCriteria): DeflectionRecord[] {
  return records.filter((record) => {
    if (criteria.dateFrom && record.detectionTime < criteria.dateFrom) return false;
    if (criteria.dateTo && record.detectionTime > criteria.dateTo) return false;
    if (criteria.beamNumber && record.beamNumber !== criteria.beamNumber) return false;
    if (criteria.detectionType && record.detectionType !== criteria.detectionType) return false;
    if (criteria.status && record.status !== criteria.status) return false;
    return true;
  });
}
