import { create } from 'zustand';
import { Gate, Taxiway, Conflict, DataGap, ConflictType, ConflictSeverity } from '../types';
import { gates, taxiways, conflicts, dataGaps, timeRange } from '../data/mockData';

interface SandboxState {
  gates: Gate[];
  taxiways: Taxiway[];
  conflicts: Conflict[];
  dataGaps: DataGap[];
  selectedConflictId: string | null;
  highlightedGateIds: string[];
  highlightedTaxiwayIds: string[];
  currentTime: string;
  timeRange: { start: string; end: string };
  filterTypes: ConflictType[];
  filterSeverities: ConflictSeverity[];
  showDataGaps: boolean;
  
  selectConflict: (id: string | null) => void;
  highlightGates: (ids: string[]) => void;
  highlightTaxiways: (ids: string[]) => void;
  setCurrentTime: (time: string) => void;
  toggleFilterType: (type: ConflictType) => void;
  toggleFilterSeverity: (severity: ConflictSeverity) => void;
  toggleDataGaps: () => void;
  focusOnGate: (gateId: string) => void;
  focusOnTaxiway: (taxiwayId: string) => void;
  exportReport: () => string;
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  gates,
  taxiways,
  conflicts,
  dataGaps,
  selectedConflictId: null,
  highlightedGateIds: [],
  highlightedTaxiwayIds: [],
  currentTime: timeRange.start,
  timeRange,
  filterTypes: ['gate_conflict', 'taxi_crossing', 'wait_timeout'],
  filterSeverities: ['high', 'medium', 'low'],
  showDataGaps: true,

  selectConflict: (id) => {
    const state = get();
    const conflict = id ? state.conflicts.find(c => c.id === id) : null;
    
    set({
      selectedConflictId: id,
      highlightedGateIds: conflict?.gateIds || [],
      highlightedTaxiwayIds: conflict?.taxiwayIds || [],
    });
  },

  highlightGates: (ids) => set({ highlightedGateIds: ids }),
  highlightTaxiways: (ids) => set({ highlightedTaxiwayIds: ids }),
  setCurrentTime: (time) => set({ currentTime: time }),

  toggleFilterType: (type) => set((state) => ({
    filterTypes: state.filterTypes.includes(type)
      ? state.filterTypes.filter(t => t !== type)
      : [...state.filterTypes, type],
  })),

  toggleFilterSeverity: (severity) => set((state) => ({
    filterSeverities: state.filterSeverities.includes(severity)
      ? state.filterSeverities.filter(s => s !== severity)
      : [...state.filterSeverities, severity],
  })),

  toggleDataGaps: () => set((state) => ({ showDataGaps: !state.showDataGaps })),

  focusOnGate: (gateId) => {
    const state = get();
    const relatedConflicts = state.conflicts.filter(c => c.gateIds.includes(gateId));
    if (relatedConflicts.length > 0) {
      set({
        selectedConflictId: relatedConflicts[0].id,
        highlightedGateIds: [gateId],
        highlightedTaxiwayIds: relatedConflicts[0].taxiwayIds,
      });
    }
  },

  focusOnTaxiway: (taxiwayId) => {
    const state = get();
    const relatedConflicts = state.conflicts.filter(c => c.taxiwayIds.includes(taxiwayId));
    if (relatedConflicts.length > 0) {
      set({
        selectedConflictId: relatedConflicts[0].id,
        highlightedGateIds: relatedConflicts[0].gateIds,
        highlightedTaxiwayIds: [taxiwayId],
      });
    }
  },

  exportReport: () => {
    const state = get();
    const report = {
      exportTime: new Date().toISOString(),
      summary: {
        totalConflicts: state.conflicts.length,
        highSeverity: state.conflicts.filter(c => c.severity === 'high').length,
        mediumSeverity: state.conflicts.filter(c => c.severity === 'medium').length,
        lowSeverity: state.conflicts.filter(c => c.severity === 'low').length,
      },
      conflicts: state.conflicts.map(conflict => ({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        title: conflict.title,
        gates: conflict.gateIds.map(id => {
          const gate = state.gates.find(g => g.id === id);
          return { id, name: gate?.name || 'Unknown' };
        }),
        taxiways: conflict.taxiwayIds.map(id => {
          const tw = state.taxiways.find(t => t.id === id);
          return { id, name: tw?.name || 'Unknown' };
        }),
        timeRange: {
          start: conflict.startTime,
          end: conflict.endTime,
        },
        dataSources: conflict.dataSources,
      })),
      dataGaps: state.dataGaps,
    };
    
    return JSON.stringify(report, null, 2);
  },
}));
