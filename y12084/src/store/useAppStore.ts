import { create } from 'zustand';
import { useMemo } from 'react';
import { AppState, Building, Conflict, DataMergeConflict, Viewpoint, Filters, WindCorridor, Report, ComparisonScheme } from '@/types';
import { mockBuildings } from '@/data/buildings';
import { mockWindRoses, mockMergeConflicts } from '@/data/windRose';
import { mockCorridors } from '@/data/corridors';
import { mockRoads } from '@/data/roads';
import { detectAllConflicts } from '@/utils/collision';
import { generateReport } from '@/utils/export';

const initialConflicts = detectAllConflicts(
  mockBuildings,
  mockCorridors,
  mockWindRoses[0],
  mockRoads
);

const initialState: Omit<AppState, 'actions'> = {
  buildings: mockBuildings,
  windRoses: mockWindRoses,
  corridors: mockCorridors,
  conflicts: initialConflicts,
  mergeConflicts: mockMergeConflicts,
  roads: mockRoads,
  selectedBuildingId: null,
  selectedConflictId: null,
  activeCorridorIds: ['c-001'],
  filters: {
    heightRange: [0, 200],
    status: ['proposed', 'existing', 'under-construction'],
    plotIds: [],
    showConflictsOnly: false,
    conflictTypes: ['overlap', 'wind_gap', 'setback', 'data_merge']
  },
  viewpoints: [
    {
      id: 'vp-default',
      name: '默认视角',
      position: [80, 60, 80],
      target: [0, 0, 0],
      timestamp: Date.now()
    }
  ],
  currentViewpoint: null,
  isDataMerged: false,
  showDataMergeModal: true,
  showViewpointModal: false,
  showReportModal: false,
  comparisonSchemes: [],
  activeSchemeId: null,
  reports: []
};

export const useAppStore = create<AppState & {
  actions: {
    selectBuilding: (id: string | null) => void;
    selectConflict: (id: string | null) => void;
    toggleCorridor: (id: string) => void;
    setFilters: (filters: Partial<Filters>) => void;
    saveViewpoint: (name: string, position: [number, number, number], target: [number, number, number]) => void;
    deleteViewpoint: (id: string) => void;
    restoreViewpoint: (id: string) => void;
    resolveMergeConflict: (id: string, resolution: 'use-building' | 'use-wind' | 'custom') => void;
    completeDataMerge: () => void;
    toggleDataMergeModal: (show: boolean) => void;
    toggleViewpointModal: (show: boolean) => void;
    toggleReportModal: (show: boolean) => void;
    resolveConflict: (id: string) => void;
    generateReport: (title: string) => Report;
    saveReport: (report: Report) => void;
    createComparisonScheme: (name: string, buildings: Building[], corridors: WindCorridor[]) => void;
    activateScheme: (id: string | null) => void;
    setCurrentViewpoint: (vp: Viewpoint | null) => void;
    runConflictDetection: () => void;
  };
}>((set, get) => ({
  ...initialState,

  actions: {
    selectBuilding: (id) => set({ selectedBuildingId: id }),

    selectConflict: (id) => {
      set({ selectedConflictId: id });
      if (id) {
        const conflict = get().conflicts.find(c => c.id === id);
        if (conflict && conflict.buildingIds.length > 0) {
          set({ selectedBuildingId: conflict.buildingIds[0] });
        }
      }
    },

    toggleCorridor: (id) => set((state) => {
      const activeIds = state.activeCorridorIds.includes(id)
        ? state.activeCorridorIds.filter(cid => cid !== id)
        : [...state.activeCorridorIds, id];
      return {
        activeCorridorIds: activeIds,
        corridors: state.corridors.map(c => ({
          ...c,
          highlighted: activeIds.includes(c.id)
        }))
      };
    }),

    setFilters: (newFilters) => set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),

    saveViewpoint: (name, position, target) => set((state) => {
      const newVp: Viewpoint = {
        id: `vp-${Date.now()}`,
        name,
        position,
        target,
        timestamp: Date.now()
      };
      return { viewpoints: [...state.viewpoints, newVp] };
    }),

    deleteViewpoint: (id) => set((state) => ({
      viewpoints: state.viewpoints.filter(v => v.id !== id)
    })),

    restoreViewpoint: (id) => set((state) => {
      const vp = state.viewpoints.find(v => v.id === id);
      return { currentViewpoint: vp || null };
    }),

    resolveMergeConflict: (id, resolution) => set((state) => ({
      mergeConflicts: state.mergeConflicts.map(mc =>
        mc.id === id ? { ...mc, resolved: true, resolution } : mc
      )
    })),

    completeDataMerge: () => {
      const state = get();
      const unresolved = state.mergeConflicts.filter(mc => !mc.resolved);

      if (unresolved.length > 0) {
        alert(`还有 ${unresolved.length} 个数据冲突未解决，请先处理。`);
        return;
      }

      set({
        isDataMerged: true,
        showDataMergeModal: false
      });

      get().actions.runConflictDetection();
    },

    toggleDataMergeModal: (show) => set({ showDataMergeModal: show }),
    toggleViewpointModal: (show) => set({ showViewpointModal: show }),
    toggleReportModal: (show) => set({ showReportModal: show }),

    resolveConflict: (id) => set((state) => ({
      conflicts: state.conflicts.map(c =>
        c.id === id ? { ...c, resolved: true } : c
      )
    })),

    generateReport: (title) => {
      const state = get();
      return generateReport(
        title,
        state.buildings,
        state.conflicts,
        state.corridors,
        state.currentViewpoint || undefined
      );
    },

    saveReport: (report) => set((state) => ({
      reports: [...state.reports, report]
    })),

    createComparisonScheme: (name, buildings, corridors) => set((state) => {
      const newScheme: ComparisonScheme = {
        id: `scheme-${Date.now()}`,
        name,
        buildings,
        corridors,
        createdAt: Date.now()
      };
      return { comparisonSchemes: [...state.comparisonSchemes, newScheme] };
    }),

    activateScheme: (id) => {
      if (!id) {
        set({
          activeSchemeId: null,
          buildings: mockBuildings,
          corridors: mockCorridors
        });
        return;
      }

      const scheme = get().comparisonSchemes.find(s => s.id === id);
      if (scheme) {
        set({
          activeSchemeId: id,
          buildings: scheme.buildings,
          corridors: scheme.corridors
        });
        get().actions.runConflictDetection();
      }
    },

    setCurrentViewpoint: (vp) => set({ currentViewpoint: vp }),

    runConflictDetection: () => set((state) => {
      const conflicts = detectAllConflicts(
        state.buildings,
        state.corridors,
        state.windRoses[0],
        state.roads
      );
      return { conflicts };
    })
  }
}));

export const useFilteredBuildings = (): Building[] => {
  const buildings = useAppStore(state => state.buildings);
  const filters = useAppStore(state => state.filters);
  const conflicts = useAppStore(state => state.conflicts);

  return useMemo(() => {
    return buildings.filter(building => {
      if (building.height < filters.heightRange[0] || building.height > filters.heightRange[1]) {
        return false;
      }

      if (!filters.status.includes(building.status)) {
        return false;
      }

      if (filters.plotIds.length > 0 && !filters.plotIds.includes(building.plotId)) {
        return false;
      }

      if (filters.showConflictsOnly) {
        const hasConflict = conflicts.some(c =>
          !c.resolved && c.buildingIds.includes(building.id)
        );
        if (!hasConflict) return false;
      }

      return true;
    });
  }, [buildings, filters, conflicts]);
};

export const useFilteredConflicts = (): Conflict[] => {
  const conflicts = useAppStore(state => state.conflicts);
  const filters = useAppStore(state => state.filters);

  return useMemo(() => {
    return conflicts.filter(c =>
      filters.conflictTypes.includes(c.type)
    );
  }, [conflicts, filters]);
};

export const useBuildingConflicts = (buildingId: string): Conflict[] => {
  const conflicts = useAppStore(state => state.conflicts);

  return useMemo(() => {
    return conflicts.filter(c => c.buildingIds.includes(buildingId));
  }, [conflicts, buildingId]);
};
