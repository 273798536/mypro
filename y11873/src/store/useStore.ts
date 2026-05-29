import { create } from 'zustand';
import type {
  Warehouse,
  Road,
  Supply,
  ImportBatch,
  ConflictAlert,
  FilterState,
} from '../types';
import { runAllConflictChecks } from '../utils/conflictDetection';
import { mockWarehouses, mockRoads } from '../data/mockData';

interface StoreState {
  warehouses: Warehouse[];
  roads: Road[];
  importBatches: ImportBatch[];
  conflictAlerts: ConflictAlert[];
  filters: FilterState;
  selectedWarehouseId: string | null;
  selectedRoadId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  importModalOpen: boolean;

  addWarehouses: (warehouses: Warehouse[]) => void;
  addRoads: (roads: Road[]) => void;
  addSupplies: (warehouseId: string, supplies: Supply[]) => void;
  addImportBatch: (batch: ImportBatch) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSelectedWarehouse: (id: string | null) => void;
  setSelectedRoad: (id: string | null) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleImportModal: () => void;
  runConflictDetection: () => void;
  runSlopeAnalysis: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  warehouses: mockWarehouses,
  roads: mockRoads,
  importBatches: [],
  conflictAlerts: [],
  filters: {
    supplyTypes: [],
    warehouseStatuses: [],
    roadStatuses: [],
  },
  selectedWarehouseId: null,
  selectedRoadId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,
  importModalOpen: false,

  addWarehouses: (warehouses) =>
    set((state) => ({
      warehouses: [...state.warehouses, ...warehouses],
    })),

  addRoads: (roads) =>
    set((state) => ({
      roads: [...state.roads, ...roads],
    })),

  addSupplies: (warehouseId, supplies) =>
    set((state) => ({
      warehouses: state.warehouses.map((w) =>
        w.id === warehouseId
          ? { ...w, supplies: [...w.supplies, ...supplies] }
          : w
      ),
    })),

  addImportBatch: (batch) =>
    set((state) => ({
      importBatches: [...state.importBatches, batch],
    })),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  setSelectedWarehouse: (id) => set({ selectedWarehouseId: id }),
  setSelectedRoad: (id) => set({ selectedRoadId: id }),
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  toggleImportModal: () =>
    set((state) => ({ importModalOpen: !state.importModalOpen })),

  runConflictDetection: () => {
    const { warehouses, roads } = get();
    const alerts = runAllConflictChecks(warehouses, roads);

    const isolatedIds = new Set(
      alerts
        .filter((a) => a.type === 'road_interrupted')
        .map((a) => a.relatedIds[0])
    );

    set((state) => ({
      conflictAlerts: alerts,
      warehouses: state.warehouses.map((w) => ({
        ...w,
        status: isolatedIds.has(w.id)
          ? 'isolated'
          : w.status === 'isolated'
            ? 'normal'
            : w.status,
      })),
    }));
  },

  runSlopeAnalysis: () => {
    const { roads } = get();
    const updatedRoads = roads.map((r) => {
      if (r.slopeAngle > 15 && r.status === 'open') {
        return {
          ...r,
          status: 'slope_limited' as const,
          slopeLimitedReason: `坡度${r.slopeAngle}°超过安全阈值15°，自动标记为坡度受限`,
        };
      }
      return r;
    });
    set({ roads: updatedRoads });
  },
}));
