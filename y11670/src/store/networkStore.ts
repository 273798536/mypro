import { create } from 'zustand';
import type {
  WalletNode,
  TransactionEdge,
  Anomaly,
  AuditTrail,
  FilterState,
  Stats,
  NetworkData,
  PathResult,
} from '../types';
import { generateMockNetwork } from '../utils/mockData';

interface NetworkStore {
  nodes: WalletNode[];
  edges: TransactionEdge[];
  anomalies: Anomaly[];
  auditTrails: AuditTrail[];
  filters: FilterState;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
  pathResult: PathResult | null;
  isLoading: boolean;
  showReport: boolean;

  loadMockData: () => void;
  importData: (data: NetworkData) => void;
  exportJSON: () => string;
  
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  
  highlightNodes: (nodeIds: string[]) => void;
  highlightEdges: (edgeIds: string[]) => void;
  clearHighlights: () => void;
  
  findPath: (fromId: string, toId: string) => void;
  clearPath: () => void;
  
  updateNodeStatus: (nodeId: string, status: 'untreated' | 'corrected' | 'pending') => void;
  addNote: (nodeId: string, content: string, author: string) => void;
  resolveAnomaly: (anomalyId: string) => void;
  
  setShowReport: (show: boolean) => void;
  
  getFilteredNodes: () => WalletNode[];
  getFilteredEdges: () => TransactionEdge[];
  getStats: () => Stats;
  getNodeById: (id: string) => WalletNode | undefined;
  getEdgeById: (id: string) => TransactionEdge | undefined;
  getNodeEdges: (nodeId: string) => TransactionEdge[];
  getRelatedAnomalies: (nodeId: string) => Anomaly[];
}

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  nodes: [],
  edges: [],
  anomalies: [],
  auditTrails: [],
  filters: {
    timeRange: [thirtyDaysAgo, now],
    amountRange: [0, 100000],
    selectedTags: [],
    showExchanges: true,
    showSuspicious: true,
    minTxCount: 0,
  },
  selectedNodeId: null,
  selectedEdgeId: null,
  highlightedNodeIds: [],
  highlightedEdgeIds: [],
  pathResult: null,
  isLoading: false,
  showReport: false,

  loadMockData: () => {
    set({ isLoading: true });
    const mockData = generateMockNetwork(50, 180);
    set({
      nodes: mockData.nodes,
      edges: mockData.edges,
      anomalies: mockData.anomalies,
      auditTrails: mockData.auditTrails,
      isLoading: false,
    });
  },

  importData: (data: NetworkData) => {
    set({
      nodes: data.nodes,
      edges: data.edges,
      anomalies: data.anomalies,
      auditTrails: data.auditTrails,
    });
  },

  exportJSON: () => {
    const { nodes, edges, anomalies, auditTrails } = get();
    return JSON.stringify({ nodes, edges, anomalies, auditTrails }, null, 2);
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        timeRange: [thirtyDaysAgo, now],
        amountRange: [0, 100000],
        selectedTags: [],
        showExchanges: true,
        showSuspicious: true,
        minTxCount: 0,
      },
    });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  highlightNodes: (nodeIds) => {
    set({ highlightedNodeIds: nodeIds });
  },

  highlightEdges: (edgeIds) => {
    set({ highlightedEdgeIds: edgeIds });
  },

  clearHighlights: () => {
    set({ highlightedNodeIds: [], highlightedEdgeIds: [] });
  },

  findPath: (fromId, toId) => {
    const { edges } = get();
    const adjacencyList = new Map<string, Array<{ to: string; edgeId: string; amount: number }>>();
    
    edges.forEach(e => {
      if (!adjacencyList.has(e.source)) {
        adjacencyList.set(e.source, []);
      }
      adjacencyList.get(e.source)?.push({ to: e.target, edgeId: e.id, amount: e.amount });
    });

    const queue: Array<{ node: string; path: string[]; edgePath: string[]; totalAmount: number }> = [
      { node: fromId, path: [fromId], edgePath: [], totalAmount: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.node === toId) {
        set({
          pathResult: {
            nodes: current.path,
            edges: current.edgePath,
            totalAmount: current.totalAmount,
          },
          highlightedNodeIds: current.path,
          highlightedEdgeIds: current.edgePath,
        });
        return;
      }
      if (visited.has(current.node)) continue;
      visited.add(current.node);

      const neighbors = adjacencyList.get(current.node) || [];
      neighbors.forEach(n => {
        if (!visited.has(n.to)) {
          queue.push({
            node: n.to,
            path: [...current.path, n.to],
            edgePath: [...current.edgePath, n.edgeId],
            totalAmount: current.totalAmount + n.amount,
          });
        }
      });
    }

    set({ pathResult: null });
  },

  clearPath: () => {
    set({ pathResult: null, highlightedNodeIds: [], highlightedEdgeIds: [] });
  },

  updateNodeStatus: (nodeId, status) => {
    set((state) => {
      const node = state.nodes.find(n => n.id === nodeId);
      const newTrail: AuditTrail = {
        id: Math.random().toString(36).substring(2, 15),
        entityId: nodeId,
        action: 'update',
        field: 'status',
        oldValue: node?.status,
        newValue: status,
        source: '人工审核',
        timestamp: new Date(),
      };
      return {
        nodes: state.nodes.map(n =>
          n.id === nodeId ? { ...n, status } : n
        ),
        auditTrails: [newTrail, ...state.auditTrails],
      };
    });
  },

  addNote: (nodeId, content, author) => {
    set((state) => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId
          ? {
              ...n,
              notes: [
                ...n.notes,
                {
                  id: Math.random().toString(36).substring(2, 15),
                  content,
                  author,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            }
          : n
      ),
    }));
  },

  resolveAnomaly: (anomalyId) => {
    set((state) => ({
      anomalies: state.anomalies.map(a =>
        a.id === anomalyId ? { ...a, resolved: true } : a
      ),
    }));
  },

  setShowReport: (show) => {
    set({ showReport: show });
  },

  getFilteredNodes: () => {
    const { nodes, filters } = get();
    return nodes.filter(node => {
      if (node.txCount < filters.minTxCount) return false;
      if (!filters.showExchanges && node.isExchange) return false;
      if (!filters.showSuspicious && node.isSuspicious) return false;
      if (filters.selectedTags.length > 0) {
        const hasTag = node.tags.some(t => filters.selectedTags.includes(t.name));
        if (!hasTag) return false;
      }
      return true;
    });
  },

  getFilteredEdges: () => {
    const { edges, filters, getFilteredNodes } = get();
    const filteredNodeIds = new Set(getFilteredNodes().map(n => n.id));
    return edges.filter(edge => {
      if (edge.amount < filters.amountRange[0] || edge.amount > filters.amountRange[1]) return false;
      if (edge.timestamp < filters.timeRange[0] || edge.timestamp > filters.timeRange[1]) return false;
      if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return false;
      return true;
    });
  },

  getStats: () => {
    const { nodes, edges, anomalies, getFilteredNodes, getFilteredEdges } = get();
    const filteredNodes = getFilteredNodes();
    const filteredEdges = getFilteredEdges();
    return {
      totalNodes: filteredNodes.length,
      totalEdges: filteredEdges.length,
      untreated: filteredNodes.filter(n => n.status === 'untreated').length,
      corrected: filteredNodes.filter(n => n.status === 'corrected').length,
      pending: filteredNodes.filter(n => n.status === 'pending').length,
      anomalies: anomalies.filter(a => !a.resolved).length,
      exchanges: filteredNodes.filter(n => n.isExchange).length,
      suspicious: filteredNodes.filter(n => n.isSuspicious).length,
    };
  },

  getNodeById: (id) => {
    return get().nodes.find(n => n.id === id);
  },

  getEdgeById: (id) => {
    return get().edges.find(e => e.id === id);
  },

  getNodeEdges: (nodeId) => {
    return get().edges.filter(e => e.source === nodeId || e.target === nodeId);
  },

  getRelatedAnomalies: (nodeId) => {
    return get().anomalies.filter(a => a.relatedEntities.includes(nodeId));
  },
}));
