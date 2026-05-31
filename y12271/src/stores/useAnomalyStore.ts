import { create } from 'zustand';
import type { AnomalyItem, AnomalyType, AnomalyStatus } from '@/types';
import { mockAnomalies } from '@/data/mockData';

interface AnomalyState {
  anomalies: AnomalyItem[];
  activeTab: AnomalyType;
  filterStatus: AnomalyStatus | 'all';
  selectedAnomalyId: string | null;
  setActiveTab: (tab: AnomalyType) => void;
  setFilterStatus: (status: AnomalyStatus | 'all') => void;
  selectAnomaly: (id: string | null) => void;
  confirmAnomaly: (id: string) => void;
  resolveAnomaly: (id: string) => void;
  getFilteredAnomalies: () => AnomalyItem[];
  getCountsByType: () => Record<AnomalyType, number>;
  getDataIntegrityLevel: () => 'good' | 'warning' | 'critical';
}

export const useAnomalyStore = create<AnomalyState>((set, get) => ({
  anomalies: mockAnomalies,
  activeTab: 'material_missing',
  filterStatus: 'all',
  selectedAnomalyId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  selectAnomaly: (id) => set({ selectedAnomalyId: id }),
  confirmAnomaly: (id) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, status: 'confirmed' as AnomalyStatus } : a
      ),
    })),
  resolveAnomaly: (id) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, status: 'resolved' as AnomalyStatus } : a
      ),
    })),
  getFilteredAnomalies: () => {
    const { anomalies, activeTab, filterStatus } = get();
    return anomalies.filter(
      (a) =>
        a.type === activeTab &&
        (filterStatus === 'all' || a.status === filterStatus)
    );
  },
  getCountsByType: () => {
    const { anomalies } = get();
    return {
      material_missing: anomalies.filter((a) => a.type === 'material_missing' && a.status !== 'resolved').length,
      seat_occlusion: anomalies.filter((a) => a.type === 'seat_occlusion' && a.status !== 'resolved').length,
      frequency_error: anomalies.filter((a) => a.type === 'frequency_error' && a.status !== 'resolved').length,
    };
  },
  getDataIntegrityLevel: () => {
    const { anomalies } = get();
    const unresolved = anomalies.filter((a) => a.status !== 'resolved');
    const highCount = unresolved.filter((a) => a.severity === 'high').length;
    if (highCount > 5) return 'critical';
    if (unresolved.length > 0) return 'warning';
    return 'good';
  },
}));
