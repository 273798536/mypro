import { useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';
import type { Anomaly, AnomalySeverity, AnomalyStatus, DisposalDirection } from '@/types';
import { anomalyTypeToLabel, anomalySeverityToLabel, disposalDirectionToLabel, anomalyStatusToLabel } from '@/utils/colorScale';

export function useAnomalyDisposal() {
  const list = useAppStore(s => s.anomaly.list);
  const filters = useAppStore(s => s.anomaly.filters);
  const activeAnomalyId = useAppStore(s => s.anomaly.activeAnomalyId);
  const setAnomalyFilters = useAppStore(s => s.setAnomalyFilters);
  const setActiveAnomaly = useAppStore(s => s.setActiveAnomaly);
  const advanceDisposalStep = useAppStore(s => s.advanceDisposalStep);

  const filteredList = useMemo(() => {
    return list.filter(a => {
      if (filters.severity && a.severity !== filters.severity) return false;
      if (filters.status && a.status !== filters.status) return false;
      return true;
    });
  }, [list, filters]);

  const stats = useMemo(() => {
    const bySeverity: Record<AnomalySeverity, number> = { red: 0, orange: 0, yellow: 0, blue: 0 };
    const byStatus: Record<AnomalyStatus, number> = { pending: 0, processing: 0, reviewing: 0, closed: 0 };
    const byDirection: Record<DisposalDirection, number> = { supplement_material: 0, adjust_caliber: 0 };
    list.forEach(a => {
      bySeverity[a.severity]++;
      byStatus[a.status]++;
      byDirection[a.disposalDirection]++;
    });
    return { bySeverity, byStatus, byDirection, total: list.length };
  }, [list]);

  const activeAnomaly = useMemo(
    () => list.find(a => a.anomalyId === activeAnomalyId) || null,
    [list, activeAnomalyId]
  );

  return {
    list,
    filteredList,
    filters,
    activeAnomaly,
    activeAnomalyId,
    setAnomalyFilters,
    setActiveAnomaly,
    advanceDisposalStep,
    stats,
    anomalyTypeToLabel,
    anomalySeverityToLabel,
    disposalDirectionToLabel,
    anomalyStatusToLabel,
  };
}

export type { Anomaly };
