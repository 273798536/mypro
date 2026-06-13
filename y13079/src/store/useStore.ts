import { create } from 'zustand';
import type { PointData, DecisionType, PointStatus, ViewState } from '@/types';
import { phases, pointsByPhase, anomaliesByPhase, decisionsByPhase } from '@/data/mockData';

interface StoreState extends ViewState {
  phases: typeof phases;
  points: PointData[];
  anomalies: typeof anomaliesByPhase[string];
  decisions: typeof decisionsByPhase[string];

  setSelectedPointId: (id: string | null) => void;
  setCurrentPhaseId: (id: string) => void;
  setStatusFilter: (s: PointStatus | 'all') => void;
  setShowDecisionPanel: (v: boolean) => void;
  setActiveDecisionTab: (t: DecisionType) => void;
  setExpandedAnomalyId: (id: string | null) => void;
  selectNextAnomaly: () => void;
}

const INITIAL_PHASE = 'phase-3';

export const useStore = create<StoreState>((set, get) => ({
  selectedPointId: null,
  currentPhaseId: INITIAL_PHASE,
  statusFilter: 'all',
  showDecisionPanel: true,
  activeDecisionTab: 'supply',
  expandedAnomalyId: anomaliesByPhase[INITIAL_PHASE]?.[0]?.id ?? null,

  phases,
  points: pointsByPhase[INITIAL_PHASE],
  anomalies: anomaliesByPhase[INITIAL_PHASE],
  decisions: decisionsByPhase[INITIAL_PHASE],

  setSelectedPointId: (id) => set({ selectedPointId: id }),

  setCurrentPhaseId: (id) => {
    const newPoints = pointsByPhase[id] ?? [];
    const newAnomalies = anomaliesByPhase[id] ?? [];
    const newDecisions = decisionsByPhase[id] ?? [];
    set({
      currentPhaseId: id,
      points: newPoints,
      anomalies: newAnomalies,
      decisions: newDecisions,
      selectedPointId: null,
      statusFilter: 'all',
      expandedAnomalyId: newAnomalies[0]?.id ?? null,
    });
  },

  setStatusFilter: (s) => set({ statusFilter: s }),
  setShowDecisionPanel: (v) => set({ showDecisionPanel: v }),
  setActiveDecisionTab: (t) => set({ activeDecisionTab: t }),
  setExpandedAnomalyId: (id) => set({ expandedAnomalyId: id }),

  selectNextAnomaly: () => {
    const list = get().anomalies;
    if (list.length === 0) return;
    const cur = get().expandedAnomalyId;
    const idx = list.findIndex((a) => a.id === cur);
    const next = list[(idx + 1) % list.length];
    set({
      expandedAnomalyId: next.id,
      selectedPointId: next.pointIds[0] ?? null,
    });
  },
}));
