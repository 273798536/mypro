import { useMemo } from 'react';
import { useCashFlowStore } from './useCashFlowStore';
import { detectAnomalies, getAnomaliesForRecord, countAnomaliesByType } from '../utils/anomalyDetector';

export function useAnomalyDetection() {
  const { records, filteredRecords, selectedRecordId } = useCashFlowStore();

  const allAnomalies = useMemo(() => detectAnomalies(records), [records]);

  const filteredAnomalies = useMemo(() => detectAnomalies(filteredRecords), [filteredRecords]);

  const selectedRecordAnomalies = useMemo(() => {
    if (!selectedRecordId) return [];
    return getAnomaliesForRecord(selectedRecordId, allAnomalies);
  }, [selectedRecordId, allAnomalies]);

  const anomalyCounts = useMemo(() => countAnomaliesByType(allAnomalies), [allAnomalies]);

  const filteredAnomalyCounts = useMemo(() => countAnomaliesByType(filteredAnomalies), [filteredAnomalies]);

  return {
    allAnomalies,
    filteredAnomalies,
    selectedRecordAnomalies,
    anomalyCounts,
    filteredAnomalyCounts,
  };
}