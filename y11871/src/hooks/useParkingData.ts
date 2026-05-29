import { useMemo } from 'react';
import { useParkingStore, useAllPressures } from '../store/useParkingStore';
import { getDataQualitySummary } from '../utils/dataCleaner';
import { calculateOverallPressure } from '../utils/pressureCalculator';

export const useParkingData = () => {
  const { 
    records, 
    currentRecord, 
    explanation, 
    currentScenario,
    isLoading,
    filters,
    loadScenario,
    loadRawData,
  } = useParkingStore();

  const allPressures = useAllPressures();

  const peakPressure = useMemo(() => {
    if (allPressures.length === 0) return 0;
    return Math.max(...allPressures);
  }, [allPressures]);

  const averagePressure = useMemo(() => {
    if (allPressures.length === 0) return 0;
    return allPressures.reduce((sum, p) => sum + p, 0) / allPressures.length;
  }, [allPressures]);

  const peakHour = useMemo(() => {
    if (records.length === 0) return 18;
    let maxP = 0;
    let hour = 18;
    records.forEach(r => {
      const p = calculateOverallPressure(r.floors, r.entrances, r.dateType, r.hourOfDay);
      if (p > maxP) {
        maxP = p;
        hour = r.hourOfDay;
      }
    });
    return hour;
  }, [records]);

  const dataQuality = useMemo(() => {
    if (records.length === 0) return null;
    return getDataQualitySummary(records);
  }, [records]);

  const filteredFloors = useMemo(() => {
    if (!currentRecord) return [];
    return currentRecord.floors.filter(f => 
      filters.selectedFloors.includes(f.floorNumber)
    );
  }, [currentRecord, filters.selectedFloors]);

  const filteredEntrances = useMemo(() => {
    if (!currentRecord) return [];
    if (filters.selectedEntrances.length === 0) return currentRecord.entrances;
    return currentRecord.entrances.filter(e => 
      filters.selectedEntrances.includes(e.entranceName)
    );
  }, [currentRecord, filters.selectedEntrances]);

  return {
    records,
    currentRecord,
    explanation,
    currentScenario,
    isLoading,
    filters,
    allPressures,
    peakPressure,
    averagePressure,
    peakHour,
    dataQuality,
    filteredFloors,
    filteredEntrances,
    loadScenario,
    loadRawData,
  };
};
