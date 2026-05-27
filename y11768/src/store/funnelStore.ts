import { create } from 'zustand';
import type { Application, Anomaly, FilterState, FunnelLayerData } from '@/data/types';
import { applications as rawApps, FUNNEL_NODE_ORDER } from '@/data/mockData';
import { detectAnomalies } from '@/utils/anomalyDetection';

interface FunnelStore {
  applications: Application[];
  filteredApplications: Application[];
  funnelData: FunnelLayerData[];
  filters: FilterState;
  anomalies: Anomaly[];
  selectedNodeIndex: number | null;
  hoveredNodeIndex: number | null;
  selectedApplication: Application | null;

  setFilter: (filterType: keyof FilterState, values: string[]) => void;
  resetFilters: () => void;
  selectNode: (index: number | null) => void;
  hoverNode: (index: number | null) => void;
  selectApplication: (app: Application | null) => void;
  getFilteredFunnelData: () => FunnelLayerData[];
}

const emptyFilters: FilterState = {
  channels: [],
  products: [],
  rejectionReasons: [],
};

function computeFunnelData(apps: Application[]): FunnelLayerData[] {
  return FUNNEL_NODE_ORDER.map((nodeName) => {
    let enterCount = 0;
    let passCount = 0;
    let rejectCount = 0;

    for (const app of apps) {
      const nodesForName = app.nodes.filter(n => n.nodeName === nodeName);
      for (const node of nodesForName) {
        enterCount += node.enterCount;
        passCount += node.passCount;
        rejectCount += node.rejectCount;
      }
    }

    const conversionRate = enterCount > 0 ? passCount / enterCount : 0;

    return {
      nodeName,
      enterCount,
      passCount,
      rejectCount,
      conversionRate,
    };
  });
}

function applyFilters(apps: Application[], filters: FilterState): Application[] {
  let result = apps;

  if (filters.channels.length > 0) {
    result = result.filter(app => filters.channels.includes(app.channelCode));
  }
  if (filters.products.length > 0) {
    result = result.filter(app => filters.products.includes(app.productCode));
  }
  if (filters.rejectionReasons.length > 0) {
    result = result.filter(app =>
      app.rejections.some(r => filters.rejectionReasons.includes(r.code))
    );
  }

  return result;
}

export const useFunnelStore = create<FunnelStore>((set, get) => {
  const anomalies = detectAnomalies(rawApps);
  const initialFunnel = computeFunnelData(rawApps);

  return {
    applications: rawApps,
    filteredApplications: rawApps,
    funnelData: initialFunnel,
    filters: { ...emptyFilters },
    anomalies,
    selectedNodeIndex: null,
    hoveredNodeIndex: null,
    selectedApplication: null,

    setFilter: (filterType, values) => {
      const newFilters = { ...get().filters, [filterType]: values };
      const filtered = applyFilters(get().applications, newFilters);
      const newFunnelData = computeFunnelData(filtered);
      set({
        filters: newFilters,
        filteredApplications: filtered,
        funnelData: newFunnelData,
        selectedNodeIndex: null,
      });
    },

    resetFilters: () => {
      const filtered = get().applications;
      const newFunnelData = computeFunnelData(filtered);
      set({
        filters: { ...emptyFilters },
        filteredApplications: filtered,
        funnelData: newFunnelData,
        selectedNodeIndex: null,
      });
    },

    selectNode: (index) => set({ selectedNodeIndex: index }),
    hoverNode: (index) => set({ hoveredNodeIndex: index }),
    selectApplication: (app) => set({ selectedApplication: app }),

    getFilteredFunnelData: () => get().funnelData,
  };
});
