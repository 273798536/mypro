import { create } from 'zustand';
import { produce } from 'immer';
import type {
  AppState,
  WalletNode,
  TransferEdge,
  FilterCriteria,
  RiskLevel,
  Correction,
} from '@/types';
import { generateMockData, DEFAULT_FILTERS } from '@/data/mockData';
import { detectPendingItems, filterData } from '@/data/riskDetector';

const initialData = generateMockData(80, 200);
const initialFiltered = filterData(initialData.nodes, initialData.edges, DEFAULT_FILTERS);
const initialPending = detectPendingItems(initialData.nodes, initialData.edges);

export const useAppStore = create<AppState & {
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setFilters: (filters: Partial<FilterCriteria>) => void;
  resetFilters: () => void;
  updateEdgeRisk: (edgeId: string, newRisk: RiskLevel, reason: string) => void;
  updateNodeRisk: (nodeId: string, newRisk: RiskLevel, reason: string) => void;
  undoCorrection: (correctionId: string) => void;
  takeSnapshot: () => void;
  enterCompareMode: () => void;
  exitCompareMode: () => void;
  setShowLabels: (show: boolean) => void;
  setAutoRotate: (rotate: boolean) => void;
  setTimelinePosition: (position: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  highlightItems: (nodeIds: string[], edgeIds: string[]) => void;
  clearHighlights: () => void;
  focusOnPendingItem: (pendingId: string) => void;
  applyFilterToTimeline: () => void;
  initializeData: (nodeCount?: number, edgeCount?: number) => void;
}>((set, get) => ({
  nodes: initialData.nodes,
  edges: initialData.edges,
  filteredNodes: initialFiltered.filteredNodes,
  filteredEdges: initialFiltered.filteredEdges,
  selectedNodeId: null,
  selectedEdgeId: null,
  filters: DEFAULT_FILTERS,
  corrections: [],
  originalDataSnapshot: null,
  isCompareMode: false,
  pendingItems: initialPending,
  showLabels: true,
  autoRotate: false,
  timelinePosition: 1,
  isPlaying: false,
  highlightedNodeIds: [],
  highlightedEdgeIds: [],

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  setFilters: (newFilters) => set(produce((state: AppState) => {
    state.filters = { ...state.filters, ...newFilters };
    const filtered = filterData(state.nodes, state.edges, state.filters);
    state.filteredNodes = filtered.filteredNodes;
    state.filteredEdges = filtered.filteredEdges;
  })),

  resetFilters: () => set(produce((state: AppState) => {
    state.filters = DEFAULT_FILTERS;
    const filtered = filterData(state.nodes, state.edges, DEFAULT_FILTERS);
    state.filteredNodes = filtered.filteredNodes;
    state.filteredEdges = filtered.filteredEdges;
  })),

  updateEdgeRisk: (edgeId, newRisk, reason) => set(produce((state: AppState) => {
    const edge = state.edges.find(e => e.id === edgeId);
    if (!edge) return;

    const oldRisk = edge.riskLevel;
    edge.riskLevel = newRisk;
    edge.isModified = true;
    edge.originalRiskLevel = edge.originalRiskLevel || oldRisk;
    edge.notes = reason;

    const correction: Correction = {
      id: `corr_${Date.now()}`,
      targetType: 'edge',
      targetId: edgeId,
      field: 'riskLevel',
      oldValue: oldRisk,
      newValue: newRisk,
      reason,
      timestamp: Math.floor(Date.now() / 1000),
      analyst: '当前分析师',
    };
    state.corrections.unshift(correction);

    const filtered = filterData(state.nodes, state.edges, state.filters);
    state.filteredNodes = filtered.filteredNodes;
    state.filteredEdges = filtered.filteredEdges;
    state.pendingItems = detectPendingItems(state.nodes, state.edges);
  })),

  updateNodeRisk: (nodeId, newRisk, reason) => set(produce((state: AppState) => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const oldRisk = node.riskLevel;
    node.riskLevel = newRisk;

    const correction: Correction = {
      id: `corr_${Date.now()}`,
      targetType: 'node',
      targetId: nodeId,
      field: 'riskLevel',
      oldValue: oldRisk,
      newValue: newRisk,
      reason,
      timestamp: Math.floor(Date.now() / 1000),
      analyst: '当前分析师',
    };
    state.corrections.unshift(correction);

    const filtered = filterData(state.nodes, state.edges, state.filters);
    state.filteredNodes = filtered.filteredNodes;
    state.filteredEdges = filtered.filteredEdges;
    state.pendingItems = detectPendingItems(state.nodes, state.edges);
  })),

  undoCorrection: (correctionId) => set(produce((state: AppState) => {
    const correction = state.corrections.find(c => c.id === correctionId);
    if (!correction) return;

    if (correction.targetType === 'edge') {
      const edge = state.edges.find(e => e.id === correction.targetId);
      if (edge) {
        edge.riskLevel = correction.oldValue as RiskLevel;
        edge.isModified = false;
      }
    } else {
      const node = state.nodes.find(n => n.id === correction.targetId);
      if (node) {
        node.riskLevel = correction.oldValue as RiskLevel;
      }
    }

    state.corrections = state.corrections.filter(c => c.id !== correctionId);

    const filtered = filterData(state.nodes, state.edges, state.filters);
    state.filteredNodes = filtered.filteredNodes;
    state.filteredEdges = filtered.filteredEdges;
    state.pendingItems = detectPendingItems(state.nodes, state.edges);
  })),

  takeSnapshot: () => set(produce((state: AppState) => {
    state.originalDataSnapshot = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    };
  })),

  enterCompareMode: () => set(produce((state: AppState) => {
    if (!state.originalDataSnapshot) {
      state.originalDataSnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    }
    state.isCompareMode = true;
  })),

  exitCompareMode: () => set({ isCompareMode: false }),

  setShowLabels: (show) => set({ showLabels: show }),
  setAutoRotate: (rotate) => set({ autoRotate: rotate }),
  setTimelinePosition: (position) => set(state => ({ 
    timelinePosition: typeof position === 'function' ? position(state.timelinePosition) : position 
  })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  highlightItems: (nodeIds, edgeIds) => set({
    highlightedNodeIds: nodeIds,
    highlightedEdgeIds: edgeIds,
  }),

  clearHighlights: () => set({
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
  }),

  focusOnPendingItem: (pendingId) => {
    const state = get();
    const pendingItem = state.pendingItems.find(p => p.id === pendingId);
    if (pendingItem) {
      set({
        highlightedNodeIds: pendingItem.relatedNodeIds,
        highlightedEdgeIds: pendingItem.relatedEdgeIds,
        selectedNodeId: pendingItem.relatedNodeIds[0] || null,
      });
    }
  },

  applyFilterToTimeline: () => {
    const state = get();
    const { timeRange } = state.filters;
    const startTime = timeRange[0];
    const endTime = timeRange[1];
    const currentTime = startTime + (endTime - startTime) * state.timelinePosition;

    const timelineEdges = state.edges.filter(e => e.timestamp <= currentTime);
    const relatedNodeIds = new Set<string>();
    timelineEdges.forEach(e => {
      relatedNodeIds.add(e.source);
      relatedNodeIds.add(e.target);
    });

    set(produce((s: AppState) => {
      s.filteredNodes = s.nodes.filter(n => relatedNodeIds.has(n.id));
      s.filteredEdges = timelineEdges;
    }));
  },

  initializeData: (nodeCount = 80, edgeCount = 200) => {
    const data = generateMockData(nodeCount, edgeCount);
    const filtered = filterData(data.nodes, data.edges, DEFAULT_FILTERS);
    const pending = detectPendingItems(data.nodes, data.edges);
    
    set(produce((s: AppState) => {
      s.nodes = data.nodes;
      s.edges = data.edges;
      s.filteredNodes = filtered.filteredNodes;
      s.filteredEdges = filtered.filteredEdges;
      s.pendingItems = pending;
      s.selectedNodeId = null;
      s.selectedEdgeId = null;
      s.corrections = [];
      s.originalDataSnapshot = null;
      s.isCompareMode = false;
      s.timelinePosition = 1;
      s.isPlaying = false;
      s.highlightedNodeIds = [];
      s.highlightedEdgeIds = [];
    }));
  },
}));

export const useSelectedNode = () => {
  const { selectedNodeId, nodes } = useAppStore();
  return nodes.find(n => n.id === selectedNodeId) || null;
};

export const useSelectedEdge = () => {
  const { selectedEdgeId, edges } = useAppStore();
  return edges.find(e => e.id === selectedEdgeId) || null;
};

export const useNodeEdges = (nodeId: string | null) => {
  const edges = useAppStore(state => state.edges);
  if (!nodeId) return [];
  return edges.filter(e => e.source === nodeId || e.target === nodeId);
};

export const useStatistics = () => {
  const { filteredNodes, filteredEdges } = useAppStore();
  const riskCounts = filteredNodes.reduce((acc, n) => {
    acc[n.riskLevel] = (acc[n.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalAmount = filteredEdges.reduce((sum, e) => sum + e.amount, 0);
  const crossChainCount = filteredEdges.filter(e => e.isCrossChain).length;

  return {
    nodeCount: filteredNodes.length,
    edgeCount: filteredEdges.length,
    totalAmount,
    crossChainCount,
    riskCounts,
  };
};
