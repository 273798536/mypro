import type { AnomalyType, AvailabilityStatus, SoundRecord } from '@/types';

export interface RecordFilters {
  anomalyTypes: AnomalyType[];
  statuses: AvailabilityStatus[];
  onlyWithAnomalies: boolean;
  keyword: string;
  batchIds: string[];
}

export function filterRecords(records: SoundRecord[], f: RecordFilters): SoundRecord[] {
  return records.filter((r) => {
    if (f.onlyWithAnomalies && r.anomalies.length === 0) return false;
    if (f.anomalyTypes.length && !r.anomalies.some((a) => f.anomalyTypes.includes(a.type))) return false;
    if (f.statuses.length && !f.statuses.includes(r.availabilityStatus)) return false;
    if (f.batchIds.length && !f.batchIds.includes(r.batchId)) return false;
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      if (
        !r.deviceCode.toLowerCase().includes(kw) &&
        !r.rawRemark.toLowerCase().includes(kw) &&
        !r.id.toLowerCase().includes(kw)
      )
        return false;
    }
    return true;
  });
}
