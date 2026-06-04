
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TransportPath, PathNode, Anomaly, FilterState } from '../types';
import { samplePaths } from '../data/sampleData';

interface PathState {
  paths: TransportPath[];
  selectedPathId: string | null;
  selectedNodeId: string | null;
  selectedAnomalyId: string | null;
  filters: FilterState;
  setPaths: (paths: TransportPath[]) => void;
  selectPath: (pathId: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  selectAnomaly: (anomalyId: string | null) => void;
  updateNodePosition: (pathId: string, nodeId: string, x: number, y: number) => void;
  addNodeAnnotation: (pathId: string, nodeId: string, anomalyId: string, annotation: string) => void;
  fixAnomaly: (pathId: string, nodeId: string, anomalyId: string) => void;
  flipNodeCoordinates: (pathId: string, nodeId: string) => void;
  updatePathScale: (pathId: string, ratio: string, unit: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  getSelectedPath: () => TransportPath | undefined;
  getSelectedNode: () => PathNode | undefined;
  getSelectedAnomaly: () => Anomaly | undefined;
  getFilteredPaths: () => TransportPath[];
}

export const usePathStore = create<PathState>((set, get) => ({
  paths: samplePaths,
  selectedPathId: samplePaths.find(p => p.selected)?.id || null,
  selectedNodeId: null,
  selectedAnomalyId: null,
  filters: {
    dataSources: [],
    anomalyTypes: [],
    showOnlyAnomalies: false,
  },

  setPaths: (paths) => set({ paths }),

  selectPath: (pathId) => set((state) => ({
    selectedPathId: pathId,
    selectedNodeId: null,
    selectedAnomalyId: null,
    paths: state.paths.map(p => ({
      ...p,
      selected: p.id === pathId,
    })),
  })),

  selectNode: (nodeId) => set({
    selectedNodeId: nodeId,
    selectedAnomalyId: null,
  }),

  selectAnomaly: (anomalyId) => set({ selectedAnomalyId: anomalyId }),

  updateNodePosition: (pathId, nodeId, x, y) => set((state) => ({
    paths: state.paths.map(p =>
      p.id === pathId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            nodes: p.nodes.map(n =>
              n.id === nodeId ? { ...n, x, y } : n
            ),
          }
        : p
    ),
  })),

  addNodeAnnotation: (pathId, nodeId, anomalyId, annotation) => set((state) => ({
    paths: state.paths.map(p =>
      p.id === pathId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            nodes: p.nodes.map(n =>
              n.id === nodeId
                ? {
                    ...n,
                    anomalies: n.anomalies.map(a =>
                      a.id === anomalyId ? { ...a, annotation } : a
                    ),
                  }
                : n
            ),
          }
        : p
    ),
  })),

  fixAnomaly: (pathId, nodeId, anomalyId) => set((state) => ({
    paths: state.paths.map(p =>
      p.id === pathId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            nodes: p.nodes.map(n =>
              n.id === nodeId
                ? {
                    ...n,
                    anomalies: n.anomalies.map(a =>
                      a.id === anomalyId ? { ...a, isFixed: true } : a
                    ),
                  }
                : n
            ),
          }
        : p
    ),
  })),

  flipNodeCoordinates: (pathId, nodeId) => set((state) => ({
    paths: state.paths.map(p =>
      p.id === pathId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            nodes: p.nodes.map(n =>
              n.id === nodeId ? { ...n, x: n.y, y: n.x } : n
            ),
          }
        : p
    ),
  })),

  updatePathScale: (pathId, ratio, unit) => set((state) => ({
    paths: state.paths.map(p =>
      p.id === pathId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            scale: {
              ...p.scale,
              ratio,
              unit: unit as 'meter' | 'kilometer' | 'unknown',
              isCorrect: true,
            },
          }
        : p
    ),
  })),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  getSelectedPath: () => {
    const { paths, selectedPathId } = get();
    return paths.find(p => p.id === selectedPathId);
  },

  getSelectedNode: () => {
    const path = get().getSelectedPath();
    const { selectedNodeId } = get();
    return path?.nodes.find(n => n.id === selectedNodeId);
  },

  getSelectedAnomaly: () => {
    const node = get().getSelectedNode();
    const { selectedAnomalyId } = get();
    return node?.anomalies.find(a => a.id === selectedAnomalyId);
  },

  getFilteredPaths: () => {
    const { paths, filters } = get();
    return paths.filter(path => {
      if (filters.dataSources.length > 0 && !filters.dataSources.includes(path.source.type)) {
        return false;
      }
      if (filters.showOnlyAnomalies) {
        const hasAnomalies = path.nodes.some(n =>
          n.anomalies.some(a => !a.isFixed && (
            filters.anomalyTypes.length === 0 || filters.anomalyTypes.includes(a.type)
          ))
        );
        if (!hasAnomalies) return false;
      }
      return true;
    });
  },
}));
