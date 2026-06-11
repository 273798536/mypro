import { create } from 'zustand';
import type { PointData, DecisionType, PointStatus, ViewState } from '@/types';
import { phases, pointsByPhase, anomalies, decisions } from '@/data/mockData';

interface StoreState extends ViewState {
  phases: typeof phases;
  points: PointData[];
  anomalies: typeof anomalies;
  decisions: typeof decisions;

  setSelectedPointId: (id: string | null) => void;
  setCurrentPhaseId: (id: string) => void;
  setStatusFilter: (s: PointStatus | 'all') => void;
  setShowDecisionPanel: (v: boolean) => void;
  setActiveDecisionTab: (t: DecisionType) => void;
  setExpandedAnomalyId: (id: string | null) => void;
  selectNextAnomaly: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  selectedPointId: null,
  currentPhaseId: 'phase-3',
  statusFilter: 'all',
  showDecisionPanel: true,
  activeDecisionTab: 'supply',
  expandedAnomalyId: anomalies[0]?.id ?? null,

  phases,
  points: pointsByPhase['phase-3'],
  anomalies,
  decisions,

  setSelectedPointId: (id) => set({ selectedPointId: id }),
  setCurrentPhaseId: (id) =>
    set({
      currentPhaseId: id,
      points: pointsByPhase[id] ?? [],
      selectedPointId: null,
    }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setShowDecisionPanel: (v) => set({ showDecisionPanel: v }),
  setActiveDecisionTab: (t) => set({ activeDecisionTab: t }),
  setExpandedAnomalyId: (id) => set({ expandedAnomalyId: id }),
  selectNextAnomaly: () => {
    const list = get().anomalies;
    const cur = get().expandedAnomalyId;
    const idx = list.findIndex((a) => a.id === cur);
    const next = list[(idx + 1) % list.length];
    set({
      expandedAnomalyId: next.id,
      selectedPointId: next.pointIds[0] ?? null,
    });
  },
}));
